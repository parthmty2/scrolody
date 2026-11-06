export type ApkRelease = {
  version: string;
  versionCode: number;
  sha256: string;
  size: number;
  downloadUrl: string;
  notes: string;
};

type GitHubAsset = { name: string; browser_download_url: string; size: number; digest?: string };

function assetUrl(repository: string, tag: string, asset: GitHubAsset) {
  const url = new URL(asset.browser_download_url);
  const prefix = `/${repository}/`;
  if (url.origin !== 'https://github.com' || url.username || url.password || url.search || url.hash ||
    url.pathname.slice(0, prefix.length).toLowerCase() !== prefix.toLowerCase() ||
    url.pathname.slice(prefix.length) !== `releases/download/${tag}/${asset.name}`) {
    throw new Error('The release has an unexpected download URL.');
  }
  return url.href;
}

export function parseApkRelease(
  metadata: unknown, apk: GitHubAsset, applicationId: string, tag: string, downloadUrl: string, notes: unknown,
): ApkRelease {
  const record = metadata as Record<string, unknown> | null;
  if (!record || record.applicationId !== applicationId || record.version !== tag.slice(1) ||
    typeof record.versionCode !== 'number' || !Number.isInteger(record.versionCode) ||
    record.versionCode < 1 || record.versionCode > 2_100_000_000 ||
    typeof record.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(record.sha256) ||
    !Number.isInteger(apk.size) || apk.size < 1 || apk.size > 536_870_912 ||
    record.size !== apk.size || (apk.digest && apk.digest !== `sha256:${record.sha256}`)) {
    throw new Error('The release metadata does not match the Scrolody APK.');
  }
  return {
    version: tag.slice(1), versionCode: record.versionCode, sha256: record.sha256, size: apk.size,
    downloadUrl, notes: typeof notes === 'string' ? notes.trim().slice(0, 1800) : '',
  };
}

export async function fetchApkRelease(repository: string, applicationId: string, signal: AbortSignal) {
  const response = await fetch(`https://api.github.com/repos/${repository}/releases/latest`, {
    signal, headers: { Accept: 'application/vnd.github+json' },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub could not check for updates (HTTP ${response.status}).`);

  const release = await response.json() as { tag_name: string; assets: GitHubAsset[]; body?: string };
  const tag = release.tag_name;
  if (typeof tag !== 'string' || !/^v\d+\.\d+\.\d+$/.test(tag) || !Array.isArray(release.assets)) {
    throw new Error('GitHub returned an invalid release.');
  }
  const apk = release.assets.find((asset) => asset.name === 'scrolody.apk');
  const manifest = release.assets.find((asset) => asset.name === 'update.json');
  if (!apk || !manifest) throw new Error('The latest release is missing its APK or update metadata.');
  const downloadUrl = assetUrl(repository, tag, apk);
  const metadata = await fetch(assetUrl(repository, tag, manifest), { signal });
  if (!metadata.ok) throw new Error('The update metadata could not be downloaded.');
  return parseApkRelease(await metadata.json(), apk, applicationId, tag, downloadUrl, release.body);
}
