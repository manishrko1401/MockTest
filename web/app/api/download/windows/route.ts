import { NextResponse } from 'next/server';
import { WINDOWS_APP, WindowsArch } from '../../../lib/windowsApp';

// Sends the newest Windows installer for the requested processor type (x64 by default).
// Never cached, so a new release is served as soon as the website is deployed.
export function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get('arch');
  const arch: WindowsArch = requested === 'arm64' ? 'arm64' : 'x64';
  const res = NextResponse.redirect(new URL(`/downloads/${WINDOWS_APP.files[arch].file}`, request.url), 302);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
