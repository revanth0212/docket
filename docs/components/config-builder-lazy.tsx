'use client';

import dynamic from 'next/dynamic';

const ConfigBuilder = dynamic(() => import('./config-builder'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '2rem', textAlign: 'center', border: '1px solid var(--fd-border)', borderRadius: '0.75rem' }}>
      Loading Config Builder…
    </div>
  )
});

export default function ConfigBuilderLazy() {
  return <ConfigBuilder />;
}
