// The Windows app installers on this website. public/downloads/latest.json is written by
// desktop/scripts/publish-installers.mjs ("npm run publish:web"), so every deploy offers the
// newest version; nothing here needs editing for a new release.
import latest from '../../public/downloads/latest.json';

export type WindowsArch = 'x64' | 'arm64';

export const WINDOWS_APP = latest as {
  version: string;
  releasedAt: string;
  files: Record<WindowsArch, { file: string; size: number }>;
};

/** Always the newest installer (the link can be shared; it never goes out of date). */
export const windowsDownloadUrl = (arch: WindowsArch) => `/api/download/windows?arch=${arch}`;

export const installerSizeMb = (arch: WindowsArch) => (WINDOWS_APP.files[arch].size / 1048576).toFixed(1);
