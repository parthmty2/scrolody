import Constants from 'expo-constants';
import { type NativeModule, requireOptionalNativeModule } from 'expo';
import Storage from 'expo-sqlite/kv-store';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import { fetchApkRelease, type ApkRelease } from './apk-release';

type InstalledBuild = { applicationId: string; versionCode: number; versionName: string };
type Updater = InstanceType<NativeModule<{ onDownloadProgress: (event: { percent: number }) => void }>> & {
  getInstalledBuild(): InstalledBuild;
  isOnWifi(): boolean;
  hasDownload(versionCode: number, sha256: string): boolean;
  download(url: string, versionCode: number, sha256: string, size: number, wifiOnly: boolean): Promise<void>;
  install(versionCode: number, sha256: string): Promise<'permission' | 'installer'>;
};

const updater = Platform.OS === 'android' ? requireOptionalNativeModule<Updater>('ScrolodyApkUpdater') : null;
const configuredRepo = Constants.expoConfig?.extra?.apkReleaseRepository;
const repository = typeof configuredRepo === 'string' && /^[\w-]+\/[\w.-]+$/.test(configuredRepo) ? configuredRepo : null;
const installed = updater?.getInstalledBuild();
const autoKey = 'apk-auto-download-wifi';
const checkInterval = 30 * 60 * 1000;

function readAutoDownload() {
  try {
    return Storage.getItemSync(autoKey) === 'true';
  } catch {
    return false;
  }
}

function useApkUpdateState() {
  const [autoDownload, setAutoDownload] = useState(readAutoDownload);
  const [release, setRelease] = useState<ApkRelease | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<'idle' | 'checking' | 'downloading' | 'installing'>('idle');
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const lastCheck = useRef(0);

  useEffect(() => {
    const subscription = updater?.addListener('onDownloadProgress', ({ percent }) => setPercent(percent));
    return () => subscription?.remove();
  }, []);

  const downloadRelease = useCallback(async (next: ApkRelease, wifiOnly: boolean) => {
    if (!updater) return;
    setStatus('downloading');
    setPercent(0);
    await updater.download(next.downloadUrl, next.versionCode, next.sha256, next.size, wifiOnly);
    setReady(true);
  }, []);

  const check = useCallback(async (manual = true, retryPendingDownload = false) => {
    if (!updater || !repository || !installed || busy.current) return;
    if (!manual && !retryPendingDownload && Date.now() - lastCheck.current < checkInterval) return;
    busy.current = true;
    lastCheck.current = Date.now();
    setStatus('checking');
    setError(false);
    setMessage('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const next = await fetchApkRelease(repository, installed.applicationId, controller.signal);
      clearTimeout(timeout);
      if (!next || next.versionCode <= installed.versionCode) {
        setRelease(null);
        setReady(false);
        if (manual) setMessage('You’re on the latest published build.');
        return;
      }
      const downloaded = updater.hasDownload(next.versionCode, next.sha256);
      setRelease(next);
      setReady(downloaded);
      if (!downloaded && readAutoDownload() && (AppState.currentState ?? 'active') === 'active' && updater.isOnWifi()) {
        await downloadRelease(next, true);
      }
    } catch (cause) {
      setError(true);
      setMessage(controller.signal.aborted ? 'The update check timed out. Try again.' : errorMessage(cause));
    } finally {
      clearTimeout(timeout);
      busy.current = false;
      setStatus('idle');
    }
  }, [downloadRelease]);

  useEffect(() => {
    void check(false);
  }, [check]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const retryDownload = !!release && !ready && autoDownload && !!updater?.isOnWifi();
        void check(false, retryDownload);
      }
    });
    return () => subscription.remove();
  }, [autoDownload, check, ready, release]);

  function changeAutoDownload(enabled: boolean) {
    try {
      Storage.setItemSync(autoKey, String(enabled));
      setAutoDownload(enabled);
      if (enabled) {
        lastCheck.current = 0;
        void check(false);
      }
    } catch {
      setError(true);
      setMessage('The update preference could not be saved.');
    }
  }

  async function downloadAndInstall() {
    if (!updater || !release || busy.current) return;
    busy.current = true;
    setError(false);
    setMessage('');
    try {
      if (!updater.hasDownload(release.versionCode, release.sha256)) await downloadRelease(release, false);
      setStatus('installing');
      const result = await updater.install(release.versionCode, release.sha256);
      if (result === 'permission') setMessage('Allow Scrolody to install updates in Android settings, then return and tap Install.');
    } catch (cause) {
      setReady(updater.hasDownload(release.versionCode, release.sha256));
      setError(true);
      setMessage(errorMessage(cause));
    } finally {
      busy.current = false;
      setStatus('idle');
    }
  }

  return { installed, configured: !!repository, autoDownload, changeAutoDownload, release, ready, status, percent, message, error, check, downloadAndInstall };
}

function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : 'The update could not be completed. Try again.';
}

const Context = createContext<ReturnType<typeof useApkUpdateState> | null>(null);

export function ApkUpdatesProvider({ children }: PropsWithChildren) {
  const value = useApkUpdateState();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useApkUpdates() {
  const value = useContext(Context);
  if (!value) throw new Error('ApkUpdatesProvider is missing');
  return value;
}
