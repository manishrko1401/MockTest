"use client";

import React, { useEffect, useState } from 'react';
import { UserPlus, MessageCircle, Users, Headphones } from 'lucide-react';
import { SectionCard } from './SiteUI';

// My Account → Preferences: which notifications the student gets (Android app push and
// Windows app). Switched-off kinds still appear in the bell.

const KINDS = [
  { key: 'requests', icon: UserPlus, en: ['Friend requests', 'New requests and accepted requests'], hi: ['मित्र अनुरोध', 'नए अनुरोध और स्वीकार किए गए अनुरोध'] },
  { key: 'messages', icon: MessageCircle, en: ['Messages from friends', 'One notification per chat'], hi: ['दोस्तों के संदेश', 'हर चैट की एक सूचना'] },
  { key: 'rooms', icon: Users, en: ['Test rooms', 'Added to a room, someone joined, the test started'], hi: ['टेस्ट रूम', 'रूम में जोड़ा गया, कोई जुड़ा, टेस्ट शुरू हुआ'] },
  { key: 'support', icon: Headphones, en: ['Support replies', 'When our team answers you'], hi: ['सहायता के जवाब', 'जब हमारी टीम जवाब दे'] },
] as const;

const api = async (data: Record<string, unknown> = {}) => {
  const res = await fetch('/api/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'notif-prefs', data }) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.error || 'Request failed');
  return json as { muted: string[] };
};

export function NotificationSettings({ hi }: { hi: boolean }) {
  const [muted, setMuted] = useState<string[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { api().then(r => setMuted(r.muted), () => setMuted([])); }, []);

  const toggle = (key: string) => {
    if (!muted) return;
    const next = muted.includes(key) ? muted.filter(k => k !== key) : [...muted, key];
    const before = muted;
    setMuted(next);
    setError('');
    api({ muted: next }).catch(() => { setMuted(before); setError(hi ? 'सेव नहीं हुआ। फिर कोशिश करें।' : 'Could not save. Please try again.'); });
  };

  return (
    <SectionCard
      title={hi ? 'सूचनाएं' : 'Notifications'}
      description={hi ? 'एंड्रॉइड ऐप और विंडोज़ ऐप में कौन-सी सूचनाएं मिलें। बंद की गई सूचनाएं भी घंटी (🔔) में दिखती रहेंगी।' : 'What the Android app and the Windows app notify you about. Switched-off kinds still show in the bell.'}
    >
      <div className="max-w-2xl divide-y divide-slate-200 dark:divide-slate-800">
        {KINDS.map(k => {
          const on = muted ? !muted.includes(k.key) : true;
          const [title, sub] = hi ? k.hi : k.en;
          return (
            <div key={k.key} className="flex items-center gap-3 py-3">
              <k.icon className="h-5 w-5 text-[#1e4e79] dark:text-blue-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>
              </div>
              <button type="button" role="switch" aria-checked={on} aria-label={title} disabled={muted === null} onClick={() => toggle(k.key)}
                className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer disabled:opacity-50 ${on ? 'bg-[#1e4e79] dark:bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </SectionCard>
  );
}
