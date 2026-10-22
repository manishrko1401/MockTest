import { revalidateTag } from 'next/cache';

// -----------------------------------------------------------------------------
// The exam catalog and the notices list are kept in Next's data cache, which every server
// instance shares (on Vercel). Before, each instance rebuilt them from the database every
// few minutes — about 0.5 MB read from Supabase per rebuild, the largest share of egress.
// Anything that changes tests or notices calls invalidateShared() so the next visitor
// gets fresh data; otherwise the copies refresh on their own every few hours.
// -----------------------------------------------------------------------------

export const CATALOG_TAG = 'exam-catalog';
export const NOTICES_TAG = 'bootstrap-notices';

/** How long a shared copy is used before it is rebuilt (seconds). */
export const CATALOG_REVALIDATE_S = 6 * 3600;
export const NOTICES_REVALIDATE_S = 2 * 3600;

export function invalidateShared(...tags: string[]) {
  for (const tag of tags) {
    try {
      revalidateTag(tag, { expire: 0 });
    } catch (err) {
      // outside a request (scripts) there is no cache to clear
      console.warn(`invalidateShared(${tag}) skipped:`, (err as Error)?.message);
    }
  }
}
