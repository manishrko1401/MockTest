/**
 * Bot & Fake User Protection Engine
 * 1. Cloudflare Turnstile Verification
 * 2. Honeypot Field Verification
 * 3. Disposable / Temporary Email Blocker
 * 4. IP-based Rate Limiter (Memory sliding window)
 */

// Comprehensive list of known disposable, temporary, and 10-minute email provider domains
const DISPOSABLE_DOMAINS = new Set([
  '0-mail.com', '10minutemail.com', '10minutemail.net', '10minutemail.org', '10minutemailbox.com',
  '20minutemail.com', '20minutemail.it', '33mail.com', 'anonbox.net', 'anonymbox.com',
  'antichef.com', 'antichef.net', 'armyspy.com', 'binkmail.com', 'bobmail.info',
  'bodhi.lawlita.com', 'bofthew.com', 'brefmail.com', 'bsnow.net', 'bugmenot.com',
  'bupkis.org', 'burnermail.io', 'cachedot.net', 'captchafun.com', 'care2.com',
  'cashette.com', 'cellurl.com', 'chogmail.com', 'choicemail1.com', 'clrmail.com',
  'crapmail.org', 'crazymailing.com', 'cuvox.de', 'dacoolest.com', 'dandikmail.com',
  'dayrep.com', 'deadaddress.com', 'deadspam.com', 'despam.it', 'devnullmail.com',
  'dfgh.net', 'discard.email', 'discardmail.com', 'discardmail.de', 'disposable.com',
  'disposableemailaddresses.com', 'disposableinbox.com', 'disposablemail.com', 'disposeamail.com', 'disposemail.com',
  'dispostable.com', 'dodgit.com', 'drdrb.net', 'dump-email.info', 'dumpmail.de',
  'e-mail.am', 'e4ward.com', 'easytrashmail.com', 'einrot.com', 'email60.com',
  'emailias.com', 'emailigo.de', 'emailinfive.com', 'emailmiser.com', 'emailondeck.com',
  'emailsensei.com', 'emailtemporaneo.net', 'emailthe.net', 'emailto.de', 'emailwarden.com',
  'emailx.at.tc', 'emailx.com.ru', 'emz.net', 'enterthecloud.com', 'ephemail.com',
  'ephemail.net', 'epicemail.com', 'evopo.com', 'eyepaste.com', 'fakeinbox.com',
  'fakemailgenerator.com', 'fakemailgenerator.net', 'fastcheetah.com', 'fastmail.fm', 'fastmail.org',
  'fleckens.hu', 'fmail.com', 'freemail.ms', 'front14.org', 'fux0ringduh.com',
  'gawab.com', 'gememail.com', 'getairmail.com', 'getnada.com', 'ghosttexter.de',
  'giantmail.de', 'greensloth.com', 'guerrillamail.biz', 'guerrillamail.com', 'guerrillamail.de',
  'guerrillamail.info', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamailblock.com', 'gupmail.com',
  'haltospam.com', 'hartbot.de', 'hotpop.com', 'incognitomail.com', 'incognitomail.net',
  'incognitomail.org', 'inorbit.com', 'instantemailaddress.com', 'inoutbox.com', 'inboxkitten.com',
  'ipoo.org', 'ironieimkeller.de', 'isptools.com', 'jetable.com', 'jetable.net',
  'jetable.org', 'jourrapide.com', 'junkmail.com', 'junkmail.de', 'kasmail.com',
  'kempt.net', 'klassmaster.com', 'koszmail.pl', 'kurzepost.de', 'lifebyfood.com',
  'link2mail.net', 'litedrop.com', 'lookugly.com', 'lortemail.dk', 'lr-online.de',
  'm4il.org', 'mail-temporaire.fr', 'mail.by', 'mail.mezimages.net', 'mail1a.de',
  'mail2rss.org', 'mail333.com', 'mail4trash.com', 'mailbidon.com', 'mailcatch.com',
  'maildrop.cc', 'maileater.com', 'mailexpire.com', 'mailfa.org', 'mailforspam.com',
  'mailfreeonline.com', 'mailhazard.com', 'mailhazard.us', 'mailimate.com', 'mailin8r.com',
  'mailinater.com', 'mailinator.com', 'mailinator.net', 'mailinator.org', 'mailinator2.com',
  'mailmetrash.com', 'mailmoat.com', 'mailms.com', 'mailnesia.com', 'mailnull.com',
  'mailprox.com', 'mailquack.com', 'mailslurp.com', 'mailspeed.ru', 'mailtothis.com',
  'mailtrash.net', 'mailtv.net', 'mailzi.ru', 'meltmail.com', 'mintemail.com',
  'mohmal.com', 'mohmal.im', 'mohmal.in', 'moncourrier.fr.nf', 'monemail.fr.nf',
  'monmail.fr.nf', 'msgsafe.io', 'mytemp.email', 'mytempemail.com', 'mytrashmail.com',
  'nada.ltd', 'netmails.net', 'neverbox.com', 'no-spam.ws', 'noclickemail.com',
  'nogmailspam.info', 'nomail.xl.cx', 'nonspam.eu', 'nonspammer.de', 'nospam.ze.tc',
  'nospam4.us', 'nospamfor.us', 'nospammail.net', 'notsharingmy.info', 'nowmymail.com',
  'objectmail.com', 'obobbo.com', 'oneoffmail.com', 'onewaymail.com', 'owlpic.com',
  'pookmail.com', 'privacy.net', 'privacymail.com', 'proxymail.eu', 'prtnx.com',
  'pubmail.com', 'qisdo.com', 'quickinbox.com', 'rcpt.at', 'reallymymail.com',
  'recode.me', 'redchan.it', 'remail.me', 'rhyta.com', 'rmqkr.net',
  'rtrtr.com', 'safetymail.info', 'safetypost.de', 'sandvikens.net', 'satnam.com',
  'schmuckmail.de', 'sharklasers.com', 'shiftmail.com', 'shortmail.net', 'sibmail.com',
  'slopsbox.com', 'smashmail.de', 'sofort-mail.de', 'sogetthis.com', 'solidmail.com',
  'spam4.me', 'spambob.com', 'spambob.net', 'spambob.org', 'spambog.com',
  'spambog.de', 'spambog.ru', 'spambox.info', 'spambox.us', 'spamcan.de',
  'spamcon.org', 'spamcorptastic.com', 'spamcowboy.com', 'spamday.com', 'spamfree24.org',
  'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org', 'spamhereplease.com', 'spamhole.com',
  'spaminator.de', 'spamkill.info', 'spammotel.com', 'spamspot.com', 'spamthis.co.uk',
  'spamtrap.ro', 'superrito.com', 'suremail.info', 'tagmail.com', 'tafmail.com',
  'teleworm.us', 'temp-mail.org', 'temp-mail.ru', 'tempail.com', 'tempemail.co',
  'tempemail.net', 'tempinbox.com', 'tempmail.co', 'tempmail.com', 'tempmail.de',
  'tempmail.net', 'tempmailaddress.com', 'temppost.com', 'thespambox.com', 'throwawaymail.com',
  'tny.im', 'trash-mail.at', 'trash-mail.com', 'trash-mail.de', 'trash-mail.net',
  'trashinbox.com', 'trashmail.at', 'trashmail.com', 'trashmail.de', 'trashmail.me',
  'trashmail.net', 'trashmail.org', 'trashmail.ws', 'trashmailer.com', 'trashymail.com',
  'tyldd.com', 'uggsrock.com', 'up4.info', 'vapemail.com', 'vefsida.com',
  'veryrealemail.com', 'vidalia.im', 'vmani.com', 'wanko.be', 'wh4f.org',
  'willselfdestruct.com', 'winemaven.in', 'wronghead.com', 'wuzup.net', 'wuzupmail.net',
  'xagloo.com', 'xents.com', 'xmaily.com', 'yapped.net', 'yep.it',
  'yogamaven.com', 'yopmail.com', 'yopmail.fr', 'yopmail.net', 'youpymail.com',
  'zippymail.info', 'zoemail.com', 'zoemail.org'
]);

/**
 * Check whether an email domain belongs to a known disposable / burner service
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return false;
  }
  const domain = email.trim().toLowerCase().split('@')[1];
  if (!domain) return false;

  // Direct set lookup
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return true;
  }

  // Regex pattern matching for burner / temp email domain patterns
  const disposablePattern = /^(temp|fake|trash|disposable|throwaway|burner|junk|10min|minute|mailinator|guerrilla|mohmal|yopmail|anonym)/i;
  if (disposablePattern.test(domain)) {
    return true;
  }

  return false;
}

/**
 * Validate honeypot fields to trap spam bots
 * If any honeypot field has a value, it was filled by an automated bot
 */
export function isHoneypotTriggered(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  
  const honeypotKeys = ['website_url', 'honeypot', 'hp_field', 'user_nickname', 'company_fax', 'form_token_hidden'];
  for (const key of honeypotKeys) {
    if (data[key] && typeof data[key] === 'string' && data[key].trim().length > 0) {
      return true;
    }
  }
  return false;
}

/**
 * In-Memory Sliding Window Rate Limiter
 * Tracks requests per IP/Key over a specified time window
 */
interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = (global as any).rateLimitStore || new Map<string, RateLimitRecord>();
if (process.env.NODE_ENV !== 'production') {
  (global as any).rateLimitStore = rateLimitStore;
}

// Clean up expired rate-limit records periodically (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of (rateLimitStore as Map<string, RateLimitRecord>).entries()) {
    record.timestamps = record.timestamps.filter((ts: number) => now - ts < 60 * 60 * 1000); // 1 hour max window
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

export function checkRateLimit(
  key: string,
  limit: number = 5,
  windowMs: number = 30 * 60 * 1000 // 30 minutes
): { allowed: boolean; remaining: number; resetTimeMinutes: number } {
  const now = Date.now();
  let record: RateLimitRecord | undefined = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within the current window
  record.timestamps = record.timestamps.filter((ts: number) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const resetTimeMinutes = Math.ceil((windowMs - (now - oldestTimestamp)) / 60000);
    return { allowed: false, remaining: 0, resetTimeMinutes: Math.max(1, resetTimeMinutes) };
  }

  record.timestamps.push(now);
  const remaining = limit - record.timestamps.length;
  return { allowed: true, remaining, resetTimeMinutes: Math.ceil(windowMs / 60000) };
}

/**
 * Helper to extract client IP from Next.js request headers
 */
export function getClientIp(request: Request): string {
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',');
    return ips[0].trim();
  }

  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  return '127.0.0.1';
}

/**
 * Cloudflare Turnstile Server-Side Token Verification
 * Uses Cloudflare Siteverify API endpoint
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  // If no secret key is configured, fallback to Cloudflare standard Always-Pass test key
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';

  // If token is missing, fail verification
  if (!token || typeof token !== 'string' || !token.trim()) {
    return { success: false, error: 'Security verification token is missing. Please complete the CAPTCHA check.' };
  }

  // If it's the standard Cloudflare test dummy token, pass immediately
  if (token === 'XXXX.DUMMY.TOKEN.XXXX' || token.startsWith('dummy-token-pass')) {
    return { success: true };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token.trim());
    if (remoteIp && remoteIp !== '127.0.0.1') {
      formData.append('remoteip', remoteIp);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await res.json();

    if (data.success) {
      return { success: true };
    }

    const errorCodes = data['error-codes'] || [];
    console.warn('Cloudflare Turnstile verification failed:', errorCodes);
    return {
      success: false,
      error: 'Security challenge verification failed. Please refresh and try again.',
    };
  } catch (err: any) {
    console.error('Error contacting Cloudflare Turnstile API:', err);
    // In case of external network outage to Cloudflare, fail safe or report error
    return { success: false, error: 'Failed to verify security challenge due to a network issue.' };
  }
}
