"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Users } from 'lucide-react';
import { btnPrimary, btnSecondary } from '../components/SiteUI';
import { MyRoom, roomApi, roomUrl } from './shared';

/**
 * On the result analysis page: "Compare with friends" for rooms of this test you're in, and
 * "Challenge friends" to open a new room (your attempt there counts as yours).
 */
export default function FriendsRoomsForTest({ testId, hi }: { testId: string; hi: boolean }) {
  const [rooms, setRooms] = useState<MyRoom[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    roomApi<{ rooms: MyRoom[] }>('room-mine', { testId })
      .then(r => { if (!cancelled) setRooms(r.rooms); })
      .catch(() => { if (!cancelled) setRooms([]); });
    return () => { cancelled = true; };
  }, [testId]);

  if (rooms === null) return null;
  const room = rooms.find(r => r.finished) || rooms[0];

  return (
    <div className="rounded-lg border border-[#1e4e79]/20 bg-[#eef3f8] dark:bg-slate-900 dark:border-slate-800 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <span className="h-9 w-9 rounded-full bg-white dark:bg-slate-800 text-[#1e4e79] dark:text-blue-300 flex items-center justify-center shrink-0"><Users className="h-4.5 w-4.5" /></span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {room
              ? (hi ? `आप रूम ${room.code} में इस टेस्ट को दोस्तों के साथ दे रहे हैं` : `You're taking this test with friends in room ${room.code}`)
              : (hi ? 'दोस्तों से मुकाबला करें' : 'Challenge your friends')}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {room
              ? (hi ? `${room.members} दोस्त · अंक, हर प्रश्न का समय मिलाएं और चर्चा करें` : `${room.members} ${room.members === 1 ? 'member' : 'members'} · compare marks and time on every question, and discuss`)
              : (hi ? 'वही टेस्ट दोस्तों को दें और हर प्रश्न पर अपने अंक और समय मिलाएं।' : 'Send this test to friends and compare marks and time on every question.')}
          </div>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        {room && <Link href={roomUrl(room.code)} className={btnPrimary}>{hi ? 'तुलना देखें' : 'Compare with friends'}<ArrowRight className="h-4 w-4" /></Link>}
        <Link href={`/friends?test=${encodeURIComponent(testId)}`} className={room ? btnSecondary : btnPrimary}>{hi ? 'नया रूम' : room ? 'New room' : 'Challenge friends'}</Link>
      </div>
    </div>
  );
}
