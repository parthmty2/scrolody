package expo.modules.scrolodyaudio

import android.media.MediaMetadataRetriever
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AudioMetadataModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ScrolodyAudioMetadata")

    AsyncFunction("trackNumber") { uri: String ->
      val context = requireNotNull(appContext.reactContext)
      val retriever = MediaMetadataRetriever()
      try {
        retriever.setDataSource(context, Uri.parse(uri))
        val track = retriever.number(MediaMetadataRetriever.METADATA_KEY_CD_TRACK_NUMBER)
        val disc = retriever.number(MediaMetadataRetriever.METADATA_KEY_DISC_NUMBER) ?: 1
        track?.let { mapOf("disc" to disc, "track" to it) }
      } finally {
        retriever.release()
      }
    }
  }

  private fun MediaMetadataRetriever.number(key: Int): Int? =
    extractMetadata(key)?.substringBefore('/')?.trim()?.toIntOrNull()?.takeIf { it > 0 }
}
