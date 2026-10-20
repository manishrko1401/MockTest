import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Study Planner',
  description: 'Plan daily study tasks, set daily mock test and typing test targets, and count down to your exams.',
  robots: { index: false }, // personal page
};

export default function PlannerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
