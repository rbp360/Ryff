import { db } from '../src/lib/db';

async function main() {
  const userId = '00000000-0000-0000-0000-000000000001';

  console.log('--- Restoring User Data for Admin User ---');

  // 1. Update PRS Custom 24 specs & pickups
  await db`
    update rig_items
    set 
      pickup_bridge = 'Lavarack Custom ~9k',
      pickups_summary = 'Lavarack Custom ~9k Bridge, Vintage Bass Neck (Original HFS in case)',
      modifications_summary = 'Bridge pickup upgraded to Lavarack custom wound to 9k DCR. Original HFS pickup retained in case.',
      specs = jsonb_set(
        coalesce(specs, '{}'::jsonb),
        '{pickup_bridge}',
        '"Lavarack Custom ~9k"'
      ),
      updated_at = now()
    where user_id = ${userId} and (brand ilike '%PRS%' or model ilike '%Custom 24%')
  `;

  // 2. Insert Charvel CX692 if missing
  const [existingCharvelCX] = await db`
    select id from rig_items where user_id = ${userId} and model ilike '%CX692%'
  `;

  if (!existingCharvelCX) {
    console.log('Adding Charvel CX692 to user rig...');
    await db`
      insert into rig_items (
        user_id, raw_text, brand, model, category, kind, image_url, created_at, updated_at
      ) values (
        ${userId}, 'Charvel CX692', 'Charvel', 'CX692', 'guitar', 'own',
        'https://rvb-img.reverb.com/i/s--uC2mGiz3--/quality=medium-low,height=800,width=800,fit=contain/7f441f91-70d7-427e-8cd2-fcec3a027354.jpg',
        now(), now()
      )
    `;
  }

  // 3. Remove dummy/test string change logs for PRS if unwanted by user
  await db`
    delete from rig_item_logs
    where user_id = ${userId} and source = 'live' and description like '%D''Addario EXL110%'
  `;

  // Reset last_restrung_at and string_gauge if needed
  await db`
    update rig_items
    set 
      current_strings = null,
      string_gauge = null,
      string_manufacturer = null,
      restring_interval_days = null,
      restring_interval_basis = null,
      last_restrung_at = null
    where user_id = ${userId} and (brand ilike '%PRS%' or model ilike '%Custom 24%')
  `;

  console.log('--- DB Restored Successfully ---');

  // Dump current rig_items for verification
  const items = await db`select id, brand, model, kind, category, pickup_bridge, pickups_summary, modifications_summary from rig_items where user_id = ${userId}`;
  console.log('FINAL USER RIG ITEMS:', JSON.stringify(items, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error('Failed to fix user data:', err);
  process.exit(1);
});
