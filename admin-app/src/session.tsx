import React, { createContext, useContext } from 'react';
import { StaffUser } from './api';

export type Can = {
  support: boolean; reports: boolean; inquiries: boolean; suggestions: boolean; feedback: boolean;
  users: boolean; editUsers: boolean; content: boolean; notices: boolean;
};

export type Session = {
  user: StaffUser;
  can: Can;
  pushConfigured: boolean;
  signOut: () => void;
};

const SessionContext = createContext<Session | null>(null);
export const SessionProvider = SessionContext.Provider;

export function useSession() {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession outside SessionProvider');
  return s;
}

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin', SUPPORT_TEAM: 'Support team', TEST_CREATOR: 'Test creator', NOTICES_MANAGER: 'Notices manager', STUDENT: 'Student',
};
