// Platform names shared by the server and the admin page (no server code here).

export type PlatformKey = 'web_desktop' | 'web_mobile' | 'windows' | 'android';
export const PLATFORM_KEYS: PlatformKey[] = ['web_desktop', 'web_mobile', 'windows', 'android'];

/** users.lastPlatform holds these keys; before them it held 'web' / 'mobile_web' / 'app'. */
export function normalizePlatform(v: string | null | undefined): PlatformKey {
  if (v === 'app' || v === 'android') return 'android';
  if (v === 'windows') return 'windows';
  if (v === 'mobile_web' || v === 'web_mobile') return 'web_mobile';
  return 'web_desktop';
}

export const PLATFORM_LABEL: Record<PlatformKey, string> = {
  web_desktop: 'Website (computer)',
  web_mobile: 'Website (phone)',
  windows: 'Windows app',
  android: 'Android app',
};

export const platformLabel = (v: string | null | undefined) => PLATFORM_LABEL[normalizePlatform(v)];
