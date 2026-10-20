"use client";

import React, { useMemo } from 'react';
import ExamSolutionAnalysisPage from '../../exam/[id]/analysis/page';
import { OfflineExamProvider, OfflineExamValue } from '../../lib/offlineExam';
import { useOfflinePackage, toRecord, OfflineMessage, OfflineLoading, SuspenseWrap, OfflineGuard } from '../useOfflinePackage';

// Full analysis of a downloaded test's attempts (finished offline, or online before downloading).
export default function OfflineAnalysisPage() {
  const { state, addMockAttempt } = useOfflinePackage('mock');

  const value = useMemo<OfflineExamValue | null>(() => {
    if (state.status !== 'ready') return null;
    const d = state.payload.data;
    return {
      kind: 'mock', testId: state.id, title: state.payload.title, customQs: d.customQs, catalog: d.catalog, isCbat: !!d.isCbat,
      attempts: [...state.localAttempts.map(toRecord), ...(d.pastAttempts || [])],
      onMockSubmitted: addMockAttempt,
      analysisHref: `/offline/analysis?id=${encodeURIComponent(state.id)}`,
      examHref: `/offline/exam?id=${encodeURIComponent(state.id)}`,
    };
  }, [state, addMockAttempt]);

  if (state.status === 'loading') return <OfflineLoading />;
  if (state.status === 'error') return <OfflineMessage message={state.message} expired={state.expired} />;
  return <OfflineExamProvider value={value!}><OfflineGuard><SuspenseWrap><ExamSolutionAnalysisPage /></SuspenseWrap></OfflineGuard></OfflineExamProvider>;
}
