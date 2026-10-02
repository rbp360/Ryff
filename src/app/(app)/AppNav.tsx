'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', icon: '◐', label: 'Home' },
  { href: '/digest', icon: '☰', label: 'Digest' },
  { href: '/backstage', icon: '♫', label: 'Backstage' },
  { href: '/trader', icon: '◎', label: 'Trader' },
  { href: '/rig', icon: '◈', label: 'Rig room' },
];

export function AppNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <nav>
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? 'on' : ''}
            aria-label={item.label}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
