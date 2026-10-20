import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Offline Tests',
  robots: { index: false },
};

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
