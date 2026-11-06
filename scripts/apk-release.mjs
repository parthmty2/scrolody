import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, readFileSync, statSync, writeFileSync } from 'node:fs';

const [command, ...args] = process.argv.slice(2);
const app = JSON.parse(readFileSync('app.json', 'utf8'));

function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (!match) throw new Error(`Invalid release version: ${value}`);
  return match.slice(1).map(Number);
}

function compareVersions(a, b) {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

function validBuildNumber(value) {
  return Number.isInteger(value) && value >= 1 && value <= 2_100_000_000;
}

if (command === 'prepare') {
  const [increment, tagsFile, output, repository] = args;
  const position = ['major', 'minor', 'patch'].indexOf(increment);
  if (position === -1) throw new Error('Choose major, minor, or patch.');
  const tags = readFileSync(tagsFile, 'utf8').split(/\r?\n/)
    .filter((tag) => /^v\d+\.\d+\.\d+$/.test(tag))
    .sort((a, b) => compareVersions(parseVersion(b.slice(1)), parseVersion(a.slice(1))));
  const latest = tags[0];
  const current = parseVersion(app.expo.version);
  const published = latest ? parseVersion(latest.slice(1)) : current;
  const next = compareVersions(current, published) > 0 ? current : published;
  next[position] += 1;
  next.fill(0, position + 1);
  app.expo.version = next.join('.');
  app.expo.extra ??= {};
  app.expo.extra.apkReleaseRepository = repository;
  writeFileSync('app.json', JSON.stringify(app, null, 2) + '\n');
  writeFileSync(output, `VERSION=${app.expo.version}\nTAG=v${app.expo.version}\nPRIOR_TAG=${latest ?? ''}\n`, { flag: 'a' });
} else if (command === 'build-number') {
  const [priorManifest] = args;
  const baseline = app.expo.android.versionCode ?? 0;
  if (baseline !== 0 && !validBuildNumber(baseline)) throw new Error('Invalid Android build number in app.json.');
  const prior = priorManifest ? JSON.parse(readFileSync(priorManifest, 'utf8')) : null;
  if (priorManifest && (prior?.applicationId !== app.expo.android.package || !validBuildNumber(prior.versionCode))) {
    throw new Error('The previous release has an invalid application ID or build number.');
  }
  const next = Math.max(baseline, prior?.versionCode ?? 0) + 1;
  if (!validBuildNumber(next)) throw new Error('The next Android build number exceeds the supported range.');
  app.expo.android.versionCode = next;
  writeFileSync('app.json', JSON.stringify(app, null, 2) + '\n');
} else if (command === 'manifest') {
  const [apk, aapt, output, signingCertificateSha256, priorManifest] = args;
  if (!/^[a-f0-9]{64}$/.test(signingCertificateSha256)) throw new Error('Could not read the APK signing certificate.');
  const badging = execFileSync(aapt, ['dump', 'badging', apk], { encoding: 'utf8' });
  const match = /^package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/m.exec(badging);
  if (!match) throw new Error('Could not read the signed APK version.');
  const [, applicationId, code, version] = match;
  const versionCode = Number(code);
  if (applicationId !== app.expo.android.package || version !== app.expo.version ||
    !validBuildNumber(versionCode) || versionCode !== app.expo.android.versionCode) {
    throw new Error('The signed APK does not match app.json.');
  }
  if (priorManifest) {
    const prior = JSON.parse(readFileSync(priorManifest, 'utf8'));
    if (prior.applicationId !== applicationId || !validBuildNumber(prior.versionCode) || versionCode <= prior.versionCode) {
      throw new Error('The APK must keep the same application ID and increase versionCode.');
    }
    if (prior.signingCertificateSha256 && prior.signingCertificateSha256 !== signingCertificateSha256) {
      throw new Error('The APK must use the same signing key as the previous release.');
    }
  }
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(apk)) digest.update(chunk);
  const size = statSync(apk).size;
  if (size < 1 || size > 536_870_912) throw new Error('The APK exceeds the updater’s supported size.');
  writeFileSync(output, JSON.stringify({ applicationId, version, versionCode, size, sha256: digest.digest('hex'), signingCertificateSha256 }, null, 2) + '\n');
} else {
  throw new Error('Expected prepare, build-number, or manifest.');
}
