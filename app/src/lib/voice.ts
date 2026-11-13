/** Voice notes are short so one fits in a single encrypted record (the server accepts up to ~1 MB per record). */
export const MAX_VOICE_MS = 120_000;

export const voiceSupported = () =>
  typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

/** The best compact audio format this browser can record. Safari records MP4/AAC; others Opus. */
export function pickMime(isSupported: (t: string) => boolean = (t) => MediaRecorder.isTypeSupported(t)): string {
  for (const t of ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm']) if (isSupported(t)) return t;
  return '';
}

export async function blobToBase64(b: Blob): Promise<string> {
  const bytes = new Uint8Array(await b.arrayBuffer());
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function base64ToBlob(b64: string, type: string): Blob {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return new Blob([bytes], { type });
}
