package expo.modules.scrolodyupdater

import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.Uri
import android.provider.Settings
import androidx.core.content.FileProvider
import androidx.core.content.pm.PackageInfoCompat
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

class UpdateFileProvider : FileProvider()

class ApkUpdaterModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext)
  private val cache get() = File(context.cacheDir, "scrolody-updates")
  private val connectivity get() = context.getSystemService(ConnectivityManager::class.java)
  private val installed: PackageInfo get() = context.packageManager.getPackageInfo(context.packageName, 0)

  override fun definition() = ModuleDefinition {
    Name("ScrolodyApkUpdater")
    Events("onDownloadProgress")

    Function("getInstalledBuild") {
      val info = installed
      mapOf(
        "applicationId" to context.packageName,
        "versionCode" to PackageInfoCompat.getLongVersionCode(info),
        "versionName" to info.versionName
      )
    }

    Function("isOnWifi") { wifiNetwork() != null }

    Function("hasDownload") { versionCode: Int, sha256: String ->
      apkFile(versionCode, sha256).isFile
    }

    AsyncFunction("download") Coroutine { url: String, versionCode: Int, sha256: String, size: Int, wifiOnly: Boolean ->
      withContext(Dispatchers.IO) {
        check(versionCode > PackageInfoCompat.getLongVersionCode(installed)) { "The update is not newer than this build." }
        val network = if (wifiOnly) wifiNetwork() ?: error("Connect to Wi-Fi to download automatically.") else null
        downloadApk(URL(url), apkFile(versionCode, sha256), sha256, size, network)
      }
    }

    AsyncFunction("install") Coroutine { versionCode: Int, sha256: String ->
      val file = apkFile(versionCode, sha256)
      withContext(Dispatchers.IO) {
        check(file.isFile) { "Download the update again before installing." }
        if (file.inputStream().buffered().use { input ->
            val digest = MessageDigest.getInstance("SHA-256")
            val buffer = ByteArray(64 * 1024)
            while (true) {
              val count = input.read(buffer)
              if (count == -1) break
              digest.update(buffer, 0, count)
            }
            digest.digest().toHex() != sha256
          }) {
          file.delete()
          error("The downloaded APK did not pass verification. Download it again.")
        }
        val apk = context.packageManager.getPackageArchiveInfo(file.absolutePath, 0)
        check(apk != null && apk.packageName == context.packageName &&
          PackageInfoCompat.getLongVersionCode(apk) == versionCode.toLong() &&
          versionCode > PackageInfoCompat.getLongVersionCode(installed)
        ) { "The APK does not match this app and release." }
      }
      withContext(Dispatchers.Main) {
        val activity = requireNotNull(appContext.currentActivity) { "Open Scrolody before installing." }
        if (!context.packageManager.canRequestPackageInstalls()) {
          activity.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}")))
          "permission"
        } else {
          val uri = FileProvider.getUriForFile(context, "${context.packageName}.scrolodyupdates", file)
          activity.startActivity(Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          })
          "installer"
        }
      }
    }
  }

  private fun wifiNetwork(): Network? {
    val manager = connectivity ?: return null
    val network = manager.activeNetwork ?: return null
    return network.takeIf {
      manager.getNetworkCapabilities(it)?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
    }
  }

  private fun apkFile(versionCode: Int, sha256: String): File {
    require(versionCode > 0 && sha256.matches(Regex("[0-9a-f]{64}")))
    return File(cache, "scrolody-$versionCode-$sha256.apk")
  }

  private fun downloadApk(url: URL, destination: File, sha256: String, size: Int, network: Network?) {
    require(size in 1..536_870_912)
    if (destination.isFile) return
    check(cache.isDirectory || cache.mkdirs()) { "Update storage could not be opened." }
    val temporary = File.createTempFile("scrolody-", ".part", cache)
    try {
      val connection = openDownload(url, network)
      try {
        val digest = MessageDigest.getInstance("SHA-256")
        var written = 0L
        var reported = -1
        connection.inputStream.use { input ->
          temporary.outputStream().buffered().use { output ->
            val buffer = ByteArray(64 * 1024)
            while (true) {
              val count = input.read(buffer)
              if (count == -1) break
              written += count
              check(written <= size) { "The APK exceeds the published download size." }
              output.write(buffer, 0, count)
              digest.update(buffer, 0, count)
              val progress = (100 * written / size).toInt()
              if (progress != reported) {
                sendEvent("onDownloadProgress", mapOf("percent" to progress))
                reported = progress
              }
            }
          }
        }
        check(written == size.toLong() && digest.digest().toHex() == sha256) {
          "The downloaded APK did not match the published checksum."
        }
        check(temporary.renameTo(destination)) { "The verified APK could not be saved." }
        cache.listFiles()?.filter { it != destination && it.name.endsWith(".apk") }?.forEach { it.delete() }
      } finally {
        connection.disconnect()
      }
    } finally {
      temporary.delete()
    }
  }

  private fun openDownload(initial: URL, network: Network?): HttpURLConnection {
    var url = initial
    repeat(5) {
      check(url.protocol == "https" && url.host in githubHosts) { "Unexpected APK download host." }
      val connection = (network?.openConnection(url) ?: url.openConnection()) as HttpURLConnection
      connection.instanceFollowRedirects = false
      connection.connectTimeout = 15_000
      connection.readTimeout = 30_000
      connection.setRequestProperty("Accept-Encoding", "identity")
      try {
        val status = connection.responseCode
        if (status == 200) return connection
        check(status in listOf(301, 302, 303, 307, 308)) { "The APK download failed (HTTP $status)." }
        url = URL(url, requireNotNull(connection.getHeaderField("Location")))
      } catch (error: Exception) {
        connection.disconnect()
        throw error
      }
      connection.disconnect()
    }
    error("Too many APK download redirects.")
  }

  private fun ByteArray.toHex() = joinToString("") { "%02x".format(it.toInt() and 0xff) }

  private companion object {
    val githubHosts = setOf("github.com", "release-assets.githubusercontent.com", "objects.githubusercontent.com")
  }
}
