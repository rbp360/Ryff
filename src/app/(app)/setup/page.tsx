import { getSession, DEV_ADMIN_USER } from '@/lib/session';
import { getUserPreferences } from '@/lib/personalization';
import { SetupClient } from './SetupClient';

export const revalidate = 0; // Dynamic server component

export default async function SetupPage() {
  const session = await getSession();
  const userId = session?.userId || DEV_ADMIN_USER.userId;
  const userEmail = session?.email || DEV_ADMIN_USER.email;

  const preferences = await getUserPreferences(userId);

  return (
    <SetupClient
      initialEmail={userEmail}
      initialPreferences={preferences}
    />
  );
}
