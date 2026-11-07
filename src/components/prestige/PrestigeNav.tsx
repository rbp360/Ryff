'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function PrestigeNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/prestige', label: 'Garage', icon: '✦', exact: true },
    { href: '/prestige/reminders', label: 'Service & Care', icon: '⏱' },
    { href: '/prestige/track', label: 'Circuit Setups', icon: '🏁' },
    { href: '/prestige/market', label: 'Valuation', icon: '📈' },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '68px',
        borderTop: '1px solid rgba(212, 175, 55, 0.2)',
        background:
          'linear-gradient(180deg, rgba(7, 8, 11, 0.94) 0%, rgba(3, 4, 5, 0.98) 100%)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        display: 'flex',
        justifyContent: 'center',
        zIndex: 100,
        boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.7)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '960px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '0 16px',
        }}
      >
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href ||
              (pathname.startsWith('/prestige/car-') && item.href === '/prestige')
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                fontWeight: active ? '800' : '600',
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: active ? '#D4AF37' : '#8A92A0',
                padding: '6px 14px',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                borderBottom: active
                  ? '2px solid #D4AF37'
                  : '2px solid transparent',
              }}
            >
              <span
                style={{
                  fontSize: '16px',
                  lineHeight: 1,
                  filter: active
                    ? 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.55))'
                    : 'none',
                }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
