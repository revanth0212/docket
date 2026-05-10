import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';

export default function Layout({ children }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: 'Cortex Docs'
      }}
    >
      {children}
    </DocsLayout>
  );
}
