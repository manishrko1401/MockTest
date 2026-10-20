import { x25519 } from '@noble/curves/ed25519';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';
import { gcm } from '@noble/ciphers/aes';

// Opens a download encrypted for this phone (same scheme as the server's encryptForDevice and
// the Windows app): ephemeral X25519 + HKDF-SHA256 (info "mth-offline-v1") + AES-256-GCM.

const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += b64chars[(n >> 18) & 63] + b64chars[(n >> 12) & 63] + (i + 1 < bytes.length ? b64chars[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? b64chars[n & 63] : '=');
  }
  return out;
}

export function fromBase64(s: string): Uint8Array {
  const clean = s.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n = (b64chars.indexOf(clean[i]) << 18) | (b64chars.indexOf(clean[i + 1]) << 12) | ((b64chars.indexOf(clean[i + 2]) & 63) << 6) | (b64chars.indexOf(clean[i + 3]) & 63);
    out[o++] = (n >> 16) & 255;
    if (clean[i + 2] !== undefined) out[o++] = (n >> 8) & 255;
    if (clean[i + 3] !== undefined) out[o++] = n & 255;
  }
  return out.slice(0, o);
}

export const publicKeyOf = (privateKey: Uint8Array) => x25519.getPublicKey(privateKey);

export type Envelope = { v: number; epk: string; salt: string; nonce: string; ct: string };

export function openEnvelope(envelope: Envelope, privateKey: Uint8Array): any {
  const shared = x25519.getSharedSecret(privateKey, fromBase64(envelope.epk));
  const key = hkdf(sha256, shared, fromBase64(envelope.salt), new TextEncoder().encode('mth-offline-v1'), 32);
  const plain = gcm(key, fromBase64(envelope.nonce)).decrypt(fromBase64(envelope.ct));
  return JSON.parse(new TextDecoder().decode(plain));
}
