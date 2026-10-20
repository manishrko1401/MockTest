"use client";

import React, { createContext, useContext } from 'react';
import type { TypingTest } from './typingTypes';
import type { TestCategory } from '../AuthContext';

// -----------------------------------------------------------------------------
// When a test runs from the Windows app's offline store (/offline/*), the normal exam,
// CBAT, analysis and typing screens read this instead of calling the server: the test
// comes from the downloaded package and results go to the app's outbox.
// Outside /offline/* there is no provider and those screens work exactly as before.
// -----------------------------------------------------------------------------

export type OfflineMockAttempt = {
  localId: string; testId: string; title: string; score: number; maxScore: number; accuracy: number;
  durationSeconds: number; violations: number; responses: Record<string, { selectedOptionIndex: number | null; elapsedSeconds: number }>;
  completedAt: string; lang1?: string; lang2?: string;
};

export type OfflineExamValue =
  | {
      kind: 'mock';
      testId: string;
      title: string;
      customQs: any;          // same shape as get-custom-questions (with answers)
      catalog: TestCategory[]; // the test's place in the catalog
      isCbat: boolean;
      attempts: any[];        // finished attempts (offline + downloaded online ones), newest first
      onMockSubmitted: (attempt: OfflineMockAttempt) => Promise<void>;
      analysisHref: string;
      examHref: string;
    }
  | {
      kind: 'typing';
      testId: string;
      title: string;
      typingTest: TypingTest;
      onTypingSubmitted: (attempt: Record<string, unknown>) => Promise<void>;
    };

const OfflineExamContext = createContext<OfflineExamValue | null>(null);

export function OfflineExamProvider({ value, children }: { value: OfflineExamValue; children: React.ReactNode }) {
  return <OfflineExamContext.Provider value={value}>{children}</OfflineExamContext.Provider>;
}

export const useOfflineExam = () => useContext(OfflineExamContext);
export const useOfflineMock = () => {
  const v = useContext(OfflineExamContext);
  return v && v.kind === 'mock' ? v : null;
};
export const useOfflineTyping = () => {
  const v = useContext(OfflineExamContext);
  return v && v.kind === 'typing' ? v : null;
};

export const newLocalId = () => `off_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
