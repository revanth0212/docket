import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layout';

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
