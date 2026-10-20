"use client";

import React, { useMemo } from 'react';
import TypingTerminalPage from '../../typing-test/[testId]/page';
import { OfflineExamProvider, OfflineExamValue } from '../../lib/offlineExam';
import { offlineAddAttempt } from '../../lib/desktopApp';
import { useOfflinePackage, OfflineMessage, OfflineLoading, SuspenseWrap } from '../useOfflinePackage';

// A downloaded typing test, run on the normal typing screen without internet.
export default function OfflineTypingPage() {
  const { state } = useOfflinePackage('typing');

  const value = useMemo<OfflineExamValue | null>(() => {
    if (state.status !== 'ready') return null;
    return {
      kind: 'typing', testId: state.id, title: state.payload.title, typingTest: state.payload.data.test,
      onTypingSubmitted: (attempt) => offlineAddAttempt('typing', state.id, attempt),
    };
  }, [state]);

  if (state.status === 'loading') return <OfflineLoading />;
  if (state.status === 'error') return <OfflineMessage message={state.message} expired={state.expired} />;
  return <OfflineExamProvider value={value!}><SuspenseWrap><TypingTerminalPage /></SuspenseWrap></OfflineExamProvider>;
}
