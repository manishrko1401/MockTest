import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE, STAFF_ROLES, getWebSessionUser } from '../lib/serverAuth';

// The admin panel is checked on the server before any of it is sent: only a logged-in
// staff account gets the page. (Every admin action is checked again by the API.)
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const user = await getWebSessionUser(token).catch(() => null);
  if (!user || !(STAFF_ROLES as readonly string[]).includes(user.role)) {
    redirect('/auth?redirect=/admin');
  }
  return <>{children}</>;
}
