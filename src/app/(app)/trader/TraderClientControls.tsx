'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function TraderScanButton() {
  const [scanning, setScanning] = useState(false);
  const router = useRouter();

  async function handleScan() {
    setScanning(true);
    try {
      const res = await fetch('/api/trader/sync', { method: 'POST' });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setScanning(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleScan}
      disabled={scanning}
      style={{
        background: 'transparent',
        border: '1px solid var(--ln)',
        borderRadius: '8px',
        color: 'var(--ac2)',
        fontSize: '11px',
        fontWeight: 700,
        padding: '5px 10px',
        cursor: scanning ? 'wait' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      {scanning ? 'Scanning Reverb...' : '↻ Scan Reverb Now'}
    </button>
  );
}
