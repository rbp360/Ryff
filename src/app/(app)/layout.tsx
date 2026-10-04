import { AppNav } from './AppNav';
import { CommandSheet } from '@/components/CommandSheet';
import { getSession, DEV_ADMIN_USER } from '@/lib/session';
import { getUserPreferences } from '@/lib/personalization';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const userId = session?.userId || DEV_ADMIN_USER.userId;
  const preferences = await getUserPreferences(userId);

  return (
    <div id="stage">
      <div id="app">
        <main>{children}</main>
        <CommandSheet initialCommandMode={preferences.commandInputMode} />
        <AppNav />
      </div>
    </div>
  );
}
