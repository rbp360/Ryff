import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { POST } from '../src/app/api/command/route';
import { NextRequest } from 'next/server';
import { getUserPreferences, updateUserPreferences } from '../src/lib/personalization';
import * as transcribeModule from '../src/lib/command/transcribe';
import { db } from '../src/lib/db';

vi.mock('../src/lib/session', () => ({
  getSession: vi.fn(async () => ({
    userId: '00000000-0000-0000-0000-000000000001',
    email: 'tester@ryff.local',
    cohort: 'cadre',
    isAdult: true,
  })),
}));

describe('Step 1: Global Command Input & Endpoint', { timeout: 20000 }, () => {
  const testUserId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    try {
      await db`
        insert into users (id, email, is_adult, consented_at, cohort, command_input_mode)
        values (${testUserId}, 'tester@ryff.local', true, now(), 'cadre', 'text_and_voice')
        on conflict (id) do update set command_input_mode = 'text_and_voice'
      `;
    } catch (err) {
      console.warn('[CommandInputTest] Warning during beforeAll user setup:', err);
    }
  });

  afterAll(async () => {
    try {
      await db`delete from users where id = ${testUserId}`;
    } catch {
      // Ignore if disconnected
    }
  });

  it('saves and retrieves commandInputMode in preferences', async () => {
    // 1. Update preference to text_only
    const updated = await updateUserPreferences(testUserId, {
      commandInputMode: 'text_only',
    });
    expect(updated.commandInputMode).toBe('text_only');

    // 2. Retrieve preference
    const retrieved = await getUserPreferences(testUserId);
    expect(retrieved.commandInputMode).toBe('text_only');

    // 3. Reset back to text_and_voice
    await updateUserPreferences(testUserId, {
      commandInputMode: 'text_and_voice',
    });
    const finalPref = await getUserPreferences(testUserId);
    expect(finalPref.commandInputMode).toBe('text_and_voice');
  });

  it('receives text command and returns echo response with context', async () => {
    const req = new NextRequest('http://localhost:3000/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Put Elixir 9-42s on the PRS CE24 yesterday',
        context: {
          screen: '/rig/1',
          gearId: '1',
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(['received', 'proposed']).toContain(data.status);
    expect(data.text).toBe('Put Elixir 9-42s on the PRS CE24 yesterday');
    expect(data.context?.screen).toBe('/rig/1');
    expect(data.context?.gearId).toBe('1');
  });

  it('transcribes audioBase64 input and returns transcribed text', async () => {
    // Mock transcribeAudio to return verified transcription
    const spy = vi.spyOn(transcribeModule, 'transcribeAudio').mockResolvedValueOnce({
      text: 'Put Elixir 9-42s on the PRS CE24 yesterday',
    });

    const fakeAudioBase64 = Buffer.from('TEST_AUDIO_BYTES').toString('base64');

    const req = new NextRequest('http://localhost:3000/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64: fakeAudioBase64,
        audioMimeType: 'audio/webm',
        context: {
          screen: '/rig',
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.status).toBe('transcribed');
    expect(data.text).toBe('Put Elixir 9-42s on the PRS CE24 yesterday');

    spy.mockRestore();
  });

  it('rejects oversized text inputs (>1000 chars)', async () => {
    const longText = 'a'.repeat(1050);

    const req = new NextRequest('http://localhost:3000/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: longText,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain('1000');
  });

  it('rejects empty payloads with neither text nor audio', async () => {
    const req = new NextRequest('http://localhost:3000/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Either text or audioBase64');
  });
});
