import { db } from '@/lib/db';
import { getSession, DEV_ADMIN_USER } from '@/lib/session';
import { RigRoomClient, RigItemData, RigLogData } from './RigRoomClient';

export const revalidate = 0; // Dynamic server component

export default async function RigPage() {
  const session = await getSession();
  const userId = session?.userId || DEV_ADMIN_USER.userId;

  const [itemsResult, logsResult] = await Promise.all([
    db<RigItemData[]>`
      SELECT id, raw_text, brand, model, category, kind, budget_gbp, current_strings, last_restrung_at
      FROM rig_items
      WHERE user_id = ${userId}
      ORDER BY kind ASC, created_at ASC
    `.catch(() => []),
    db<RigLogData[]>`
      SELECT l.id, l.rig_item_id, l.event_type, l.title, l.description, l.event_date,
             coalesce(r.model, r.raw_text) as item_name
      FROM rig_item_logs l
      JOIN rig_items r ON r.id = l.rig_item_id
      WHERE l.user_id = ${userId}
      ORDER BY l.event_date DESC, l.created_at DESC
    `.catch(() => []),
  ]);

  return <RigRoomClient initialItems={itemsResult} initialLogs={logsResult} />;
}
