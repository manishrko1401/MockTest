import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Test with Friends',
  description: 'Take a mock test with your friends, compare marks and time on every question, and discuss each question together.',
  robots: { index: false }, // personal rooms
};

export default function FriendsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
