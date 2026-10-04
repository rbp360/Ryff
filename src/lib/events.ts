import { db } from './db';

export type EventName =
  | 'signup'
  | 'rig_saved'
  | 'chat_sent'
  | 'episode_viewed'
  | 'deal_clicked'
  | 'survey_answered'
  | 'presale_clicked'
  | 'import_confirmed'
  | 'import_undone';

export async function logEvent(name: EventName, props: Record<string, unknown> = {}, userId?: string | null): Promise<void> {
  try {
    const cleanUserId = userId && userId !== '00000000-0000-0000-0000-000000000001' ? userId : null;
    await db`
      insert into events (user_id, name, props)
      values (${cleanUserId}, ${name}, ${JSON.stringify(props)})
    `;
  } catch (err) {
    console.warn(`[Events] Failed to log event "${name}":`, err);
  }
}
