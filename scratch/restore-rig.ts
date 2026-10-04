import { db } from '../src/lib/db';
import { fetchReverbStockImage } from '../src/lib/gear-images';

async function restoreRig() {
  const userId = '00000000-0000-0000-0000-000000000001';

  console.log('--- Ensuring Dev User Exists ---');
  await db`
    insert into users (id, email, consented_at, is_adult, uk_resident, cohort, command_input_mode, personality)
    values (${userId}, 'admin@ryff.local', now(), true, true, 'cadre', 'text_and_voice', 'hank')
    on conflict (id) do update set
      email = 'admin@ryff.local',
      command_input_mode = 'text_and_voice',
      personality = 'hank'
  `;

  console.log('--- Checking & Populating Rig Items ---');
  // Clear any partial state for dev user
  await db`delete from rig_item_logs where user_id = ${userId}`;
  await db`delete from assistant_actions where user_id = ${userId}`;
  await db`delete from rig_items where user_id = ${userId}`;

  // 1. PRS Custom 24
  console.log('Fetching image for PRS Custom 24...');
  const prsImg = await fetchReverbStockImage('PRS', 'Custom 24', 'guitar');
  const [prs] = await db`
    insert into rig_items (
      user_id, raw_text, brand, model, category, kind,
      image_url, current_strings, string_gauge, string_manufacturer,
      last_restrung_at, restring_interval_days, restring_interval_basis,
      pickup_bridge, pickups_summary, modifications_summary,
      specs, created_at, updated_at
    ) values (
      ${userId}, 'PRS Custom 24', 'PRS', 'Custom 24', 'guitar', 'own',
      ${prsImg.imageUrl}, 'Elixir Optiweb 10-46', '10-46', 'Elixir',
      now() - interval '18 days', 60, 'learned',
      'Lavarack Custom ~9k',
      'Lavarack Custom ~9k Bridge, Vintage Bass Neck (Original HFS in case)',
      'Bridge pickup upgraded to Lavarack custom wound to 9k DCR. Original HFS pickup retained in case.',
      ${JSON.stringify({ pickup_bridge: 'Lavarack Custom ~9k' })},
      now() - interval '60 days', now()
    ) returning id
  `;

  // 2. Charvel CX692
  console.log('Adding Charvel CX692...');
  const charvelImg = 'https://rvb-img.reverb.com/i/s--uC2mGiz3--/quality=medium-low,height=800,width=800,fit=contain/7f441f91-70d7-427e-8cd2-fcec3a027354.jpg';
  const [charvel] = await db`
    insert into rig_items (
      user_id, raw_text, brand, model, category, kind,
      image_url, current_strings, string_gauge, string_manufacturer,
      last_restrung_at, restring_interval_days, restring_interval_basis,
      created_at, updated_at
    ) values (
      ${userId}, 'Charvel CX692', 'Charvel', 'CX692', 'guitar', 'own',
      ${charvelImg}, 'Ernie Ball Regular Slinky 10-46', '10-46', 'Ernie Ball',
      now() - interval '25 days', 60, 'default',
      now() - interval '50 days', now()
    ) returning id
  `;

  // 3. Boss Katana 50w
  console.log('Fetching image for Boss Katana 50w...');
  const katanaImg = await fetchReverbStockImage('Boss', 'Katana 50', 'amp');
  const [katana] = await db`
    insert into rig_items (
      user_id, raw_text, brand, model, category, kind,
      image_url, created_at, updated_at
    ) values (
      ${userId}, 'Boss Katana 50w', 'Boss', 'Katana 50w', 'amp', 'own',
      ${katanaImg.imageUrl}, now() - interval '90 days', now()
    ) returning id
  `;

  // 4. Ibanez Tubescreamer
  console.log('Fetching image for Ibanez Tubescreamer...');
  const tsImg = await fetchReverbStockImage('Ibanez', 'TS9 Tube Screamer', 'pedal');
  const [ts] = await db`
    insert into rig_items (
      user_id, raw_text, brand, model, category, kind,
      image_url, created_at, updated_at
    ) values (
      ${userId}, 'Ibanez Tubescreamer', 'Ibanez', 'Tubescreamer', 'pedal', 'own',
      ${tsImg.imageUrl}, now() - interval '120 days', now()
    ) returning id
  `;

  // 5. Marshall DSL50
  console.log('Fetching image for Marshall DSL50...');
  const dslImg = await fetchReverbStockImage('Marshall', 'DSL50', 'amp');
  const [dsl] = await db`
    insert into rig_items (
      user_id, raw_text, brand, model, category, kind,
      image_url, valves_summary, last_valves_changed_at,
      created_at, updated_at
    ) values (
      ${userId}, 'Marshall DSL50', 'Marshall', 'DSL50', 'amp', 'own',
      ${dslImg.imageUrl}, 'Retubed power section with JJ EL34s', now() - interval '140 days',
      now() - interval '180 days', now()
    ) returning id
  `;

  // 6. Wants: Charvel 750XL
  console.log('Fetching image for Want: Charvel 750XL...');
  const c750Img = await fetchReverbStockImage('Charvel', '750XL', 'guitar');
  await db`
    insert into rig_items (
      user_id, raw_text, brand, model, category, kind,
      budget_gbp, want_key, image_url, created_at, updated_at
    ) values (
      ${userId}, 'Charvel 750XL', 'Charvel', '750XL', 'guitar', 'want',
      600, 'charvel 750xl', ${c750Img.imageUrl},
      now() - interval '30 days', now()
    )
  `;

  // 7. Wants: Soldano SLO-30
  console.log('Fetching image for Want: Soldano SLO-30...');
  const soldanoImg = await fetchReverbStockImage('Soldano', 'SLO-30', 'amp');
  await db`
    insert into rig_items (
      user_id, raw_text, brand, model, category, kind,
      budget_gbp, want_key, image_url, created_at, updated_at
    ) values (
      ${userId}, 'Soldano SLO-30', 'Soldano', 'SLO-30', 'amp', 'want',
      2000, 'soldano slo 30', ${soldanoImg.imageUrl},
      now() - interval '20 days', now()
    )
  `;

  // 8. Add Maintenance Logs
  console.log('Adding Maintenance Logs...');
  await db`
    insert into rig_item_logs (
      rig_item_id, user_id, event_type, event_date, title, description, source, created_at
    ) values
      (${prs.id}, ${userId}, 'strings', now() - interval '18 days', 'Log: String Change on PRS Custom 24', 'Restrung with Elixir Optiweb 10-46', 'live', now() - interval '18 days'),
      (${prs.id}, ${userId}, 'setup', now() - interval '75 days', 'Log: Setup & Truss Rod Adjustment', 'Truss rod tweak and intonation dialed in', 'live', now() - interval '75 days'),
      (${prs.id}, ${userId}, 'strings', now() - interval '75 days', 'Log: String Change on PRS Custom 24', 'Restrung with Elixir Optiweb 10-46', 'live', now() - interval '75 days'),
      (${prs.id}, ${userId}, 'electronics', now() - interval '120 days', 'Log: Bridge Pickup Upgrade', 'Installed Lavarack Custom ~9k in bridge. Stored original HFS in case.', 'live', now() - interval '120 days'),
      (${charvel.id}, ${userId}, 'strings', now() - interval '25 days', 'Log: String Change on Charvel CX692', 'Restrung with Ernie Ball Regular Slinky 10-46', 'live', now() - interval '25 days'),
      (${dsl.id}, ${userId}, 'repair', now() - interval '140 days', 'Log: Valve Replacement', 'Retubed power section with matched JJ EL34 pair. Biased to 38mA.', 'live', now() - interval '140 days')
  `;

  console.log('--- Rig Restored Successfully! ---');
  const allGear = await db`select id, brand, model, kind, category from rig_items where user_id = ${userId}`;
  console.log('Restored Gear count:', allGear.length);
  console.log(allGear);

  process.exit(0);
}

restoreRig().catch(err => {
  console.error('Failed to restore rig:', err);
  process.exit(1);
});
