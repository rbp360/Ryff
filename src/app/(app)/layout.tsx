import { AppNav } from './AppNav';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div id="stage">
      <div id="app">
        <main>{children}</main>
        <AppNav />
      </div>
    </div>
  );
}
