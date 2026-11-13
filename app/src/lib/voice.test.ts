import { describe, expect, it } from 'vitest';
import { base64ToBlob, blobToBase64, MAX_VOICE_MS, pickMime } from './voice';

describe('voice notes', () => {
  it('round-trips audio bytes through base64', async () => {
    const bytes = new Uint8Array(70_000).map((_, i) => (i * 31) % 256);
    const b64 = await blobToBase64(new Blob([bytes], { type: 'audio/webm' }));
    const back = new Uint8Array(await base64ToBlob(b64, 'audio/webm').arrayBuffer());
    expect(back).toEqual(bytes);
  });

  it('prefers Opus, falls back to MP4 on Safari', () => {
    expect(pickMime((t) => t.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus');
    expect(pickMime((t) => t === 'audio/mp4')).toBe('audio/mp4');
    expect(pickMime(() => false)).toBe('');
  });

  it('keeps a full-length note well inside one encrypted record', () => {
    // 24 kbit/s for 2 minutes, base64 inside JSON, then encrypted and base64 again.
    const raw = (24000 / 8) * (MAX_VOICE_MS / 1000);
    expect(raw * (4 / 3) * (4 / 3) * 1.05).toBeLessThan(1_000_000);
  });
});
