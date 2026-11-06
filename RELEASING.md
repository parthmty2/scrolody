# Releasing Scrolody for Android

GitHub Actions builds a signed APK and publishes it on every push to the default branch. The first run starts once the workflow is pushed and the signing secrets are in place.

## One-time setup

1. Create a GitHub repository with `scrolody` as its root. A public source repository is the simplest setup. The workflow uses that repository’s Releases page by default and puts its address into the APK. For private source, follow the separate release repository steps below.
2. Set up your Android signing key. If you already shared an APK, reuse its keystore, alias, and passwords. Keep the APK’s original Android package ID in `app.json` and set `expo.android.versionCode` to its highest distributed build number if that build is newer than the GitHub release history. For an APK previously signed by Expo, download its original keystore using [Expo’s credentials guide](https://docs.expo.dev/app-signing/app-credentials/).

   If this is your first signed APK, install a [JDK](https://adoptium.net/installation) for `keytool`, then run this in a fresh PowerShell window. Keep a backup of the file and passwords. Use the same keystore for future updates.

   ```powershell
   cd 'D:\AI Learn\Mobile App\scrolody'
   keytool -genkeypair -v -storetype JKS -keystore scrolody-release.jks -alias scrolody -keyalg RSA -keysize 2048 -validity 10000
   ```

3. In your source repository, open **Settings → Secrets and variables → Actions → Secrets**. Add these four repository secrets.

   | Secret | Value |
   | --- | --- |
   | `ANDROID_KEYSTORE_BASE64` | Copy the keystore with the PowerShell command below, then paste into this secret. |
   | `ANDROID_KEYSTORE_PASSWORD` | Password for the keystore file. |
   | `ANDROID_KEY_ALIAS` | `scrolody` if you used the command above, or your existing key’s alias. |
   | `ANDROID_KEY_PASSWORD` | Password for that key. Use the keystore password if you accepted the same password for both. |

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path '.\scrolody-release.jks').Path)) | Set-Clipboard
   ```

   For an existing keystore, use its file path. The clipboard value contains the private key. Paste it only into the GitHub secret and clear the clipboard afterward with `Set-Clipboard -Value ' '`. Keep keystores and credentials out of Git.

4. Commit and push the Scrolody project to the repository’s default branch. For a fresh local project and empty GitHub repository, run these from the Scrolody directory and replace `OWNER/REPO` with the source repository’s name.

   ```powershell
   git init -b main
   git add .
   git commit -m "Set up Scrolody APK releases"
   git remote add origin https://github.com/OWNER/REPO.git
   git push -u origin main
   ```

   Watch **Actions → Publish Scrolody APK**. When it finishes, download `scrolody.apk` from **Releases** and install it on your phone. [GitHub Actions secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets) · [Android signing and updates](https://developer.android.com/google/play/app-updates)

## How releases work

Each push to the default branch queues a release. A push containing several commits builds the newest commit in that push. GitHub runs Expo Prebuild to generate the Android project, uses Gradle to compile it, and signs the APK with your keystore. The workflow bumps the patch version and increments the Android build number using the previous release. It verifies the signing certificate, then publishes `scrolody.apk` and `update.json` together. For a minor or major bump, you can also run the workflow manually on the default branch and choose the bump.

Standard GitHub-hosted runners are free for public repositories. Workflows in private repositories use that account’s included compute and applicable billing. [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

## Keep the source private

Create a separate public GitHub repository for APKs and give it an initial commit so it has a default branch. Set `expo.extra.apkReleaseRepository` in `app.json` to that public repository’s `OWNER/REPO`. Add `RELEASES_TOKEN` as an Actions secret in the private source repository. Use a fine-grained GitHub token scoped to the public repository with **Contents** set to **Read and write**. Use the same public repository address for future releases so installed copies keep finding updates.

## Test the in-app update

Install the first release APK, then push another commit to the default branch. Once its release finishes, open the installed copy and go to **Settings → App updates → Check now**. Tap **Download & install**. If Android asks to allow installs from Scrolody, enable it, return, and tap **Install**. Reopen Scrolody after confirming in Android’s installer and verify the new build number and your saved reading progress.
