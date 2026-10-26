// What the student is doing right now, for the admin panel's "Live now" (sent with the ping in
// session.tsx). The shell sets it from the screen on top; changing it sends a ping soon after.

let activity = '';
const listeners = new Set<() => void>();

export function setAppActivity(text: string) {
  if (text === activity) return;
  activity = text;
  listeners.forEach(fn => fn());
}
export const getAppActivity = () => activity;
export function onAppActivity(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
