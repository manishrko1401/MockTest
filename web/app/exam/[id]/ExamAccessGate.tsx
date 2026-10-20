"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, LogIn, FileQuestion, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { SiteHeader, SectionCard, btnPrimary, btnSecondary, pageBg, container } from '../../components/SiteUI';

// Checked before an exam starts (online): a PRO test the student hasn't unlocked, a test that
// needs login, or a CBAT test with no uploaded questions now shows a clear message. Before, the
// exam screens quietly fell back to built-in sample questions in these cases.

type Access = { exists: boolean; locked: string | null; hasQuestions: boolean; loggedIn: boolean; title?: string };

/** The sample CBAT battery is only meant for the exam's own demo link. */
const CBAT_DEMO_ID = 'rrb_ntpc_cbat__psycho_test__iayf';

export default function ExamAccessGate({ testId, isCbat, children }: { testId: string; isCbat: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const { language, currentUser } = useAuth();
  const hi = language === 'hi';
  const L = (en: string, h: string) => (hi ? h : en);
  const [access, setAccess] = useState<Access | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/db', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test-access', data: { testId } }),
    })
      .then(r => r.json())
      .then(j => { if (!cancelled) setAccess(j?.success ? j : { exists: false, locked: null, hasQuestions: true, loggedIn: true }); })
      // Can't check (network): let the exam screen handle it as before
      .catch(() => { if (!cancelled) setAccess({ exists: false, locked: null, hasQuestions: true, loggedIn: true }); });
    return () => { cancelled = true; };
    // Re-check after logging in / unlocking a pass
  }, [testId, currentUser?.id, currentUser?.subscriptionTier]);

  if (!access) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${pageBg}`}>
        <div className="h-8 w-8 border-2 border-[#1e4e79] border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading" />
      </div>
    );
  }

  const noQuestions = access.exists && !access.hasQuestions && isCbat && testId !== CBAT_DEMO_ID;
  if (!access.locked && !noQuestions) return <>{children}</>;

  const back = () => (window.history.length > 1 ? router.back() : router.push('/mock-tests'));
  const tierName = (access.locked || '').replace('Testbook', 'Mock Test');
  const view = access.locked && !access.loggedIn
    ? {
        icon: <LogIn className="h-5 w-5 text-[#1e4e79] dark:text-blue-400" />,
        title: L('Log in to start this test', 'यह टेस्ट शुरू करने के लिए लॉग इन करें'),
        text: L(`"${access.title}" is part of ${tierName}. Log in with your account to continue.`, `"${access.title}" ${tierName} का हिस्सा है। जारी रखने के लिए अपने खाते से लॉग इन करें।`),
        action: <Link href="/auth" className={btnPrimary}><LogIn className="h-4 w-4" />{L('Log in', 'लॉग इन करें')}</Link>,
      }
    : access.locked
      ? {
          icon: <Lock className="h-5 w-5 text-amber-600" />,
          title: L('This is a PRO test', 'यह एक PRO टेस्ट है'),
          text: L(`"${access.title}" needs ${tierName}. Unlock the pass from the test series page to start it.`, `"${access.title}" के लिए ${tierName} आवश्यक है। शुरू करने के लिए टेस्ट सीरीज़ पेज से पास अनलॉक करें।`),
          action: <Link href="/mock-tests" className={btnPrimary}><Lock className="h-4 w-4" />{L('Unlock with Pass', 'पास के साथ अनलॉक करें')}</Link>,
        }
      : {
          icon: <FileQuestion className="h-5 w-5 text-slate-500" />,
          title: L('Questions coming soon', 'प्रश्न जल्द आएंगे'),
          text: L(`Questions for "${access.title}" haven't been added yet. Please try another test in this series.`, `"${access.title}" के प्रश्न अभी जोड़े नहीं गए हैं। कृपया इस सीरीज़ का कोई दूसरा टेस्ट दें।`),
          action: null,
        };

  return (
    <div className={`min-h-screen flex flex-col ${pageBg}`}>
      <SiteHeader />
      <main className={`${container} w-full py-10 flex-1`}>
        <SectionCard title={<span className="inline-flex items-center gap-2">{view.icon}{view.title}</span>}>
          <p className="text-sm text-slate-600 dark:text-slate-300">{view.text}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {view.action}
            <button type="button" onClick={back} className={`${btnSecondary} cursor-pointer`}><ArrowLeft className="h-4 w-4" />{L('Go back', 'वापस जाएं')}</button>
          </div>
        </SectionCard>
      </main>
    </div>
  );
}
