import { db } from '../src/lib/db';

async function main() {
  console.log('--- USERS ---');
  const users = await db`select id, email from users`;
  console.log(users);

  console.log('--- RIG ITEMS ---');
  const items = await db`select * from rig_items`;
  console.log(JSON.stringify(items, null, 2));

  console.log('--- RIG LOGS ---');
  const logs = await db`select * from rig_item_logs`;
  console.log(JSON.stringify(logs, null, 2));

  console.log('--- ASSISTANT ACTIONS ---');
  const actions = await db`select * from assistant_actions`;
  console.log(JSON.stringify(actions, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
