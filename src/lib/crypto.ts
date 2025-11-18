// Simple AES-GCM encryption utilities using a per-session ephemeral key.
// This secures uploaded JSON content locally (at rest in memory or temporary downloads).
// NOTE: Backend decryption is out of scope; this is purely client-side protection.

function getOrCreateSessionKeyBytes(): Uint8Array {
  const keyName = 'vt_ephemeral_key_v1';
  try {
    const existing = sessionStorage.getItem(keyName);
    if (existing) {
      return Uint8Array.from(atob(existing), c => c.charCodeAt(0));
    }
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    sessionStorage.setItem(keyName, btoa(String.fromCharCode(...bytes)));
    return bytes;
  } catch {
    // Fallback: random per runtime only
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return bytes;
  }
}

async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  // Pass ArrayBuffer to avoid TS BufferSource incompatibilities
  const buf = raw.buffer.slice(0); // clone view
  return await crypto.subtle.importKey(
    'raw',
    buf as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptString(plainText: string): Promise<string> {
  const keyBytes = getOrCreateSessionKeyBytes();
  const key = await importAesKey(keyBytes);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const enc = new TextEncoder().encode(plainText);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc));
  const payload = {
    v: 1,
    alg: 'AES-GCM',
    iv: btoa(String.fromCharCode(...iv)),
    ct: btoa(String.fromCharCode(...ct)),
  };
  return JSON.stringify(payload);
}

export async function decryptString(payloadText: string): Promise<string> {
  const keyBytes = getOrCreateSessionKeyBytes();
  const key = await importAesKey(keyBytes);
  const payload = JSON.parse(payloadText) as { iv: string; ct: string };
  const iv = Uint8Array.from(atob(payload.iv), c => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(payload.ct), c => c.charCodeAt(0));
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct));
  return new TextDecoder().decode(pt);
}
