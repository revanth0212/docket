import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/app/layout.config';

export default function Layout({ children }) {
  return (
    <DocsLayout
      {...baseOptions}
      tree={source.pageTree}
      nav={{
        ...baseOptions.nav,
        title: 'Docket Docs'
      }}
      sidebar={{
        defaultOpenLevel: 1
      }}
      tabs={[
        {
          title: 'Users',
          description: 'Run and configure Docket',
          url: '/docs/users'
        },
        {
          title: 'Developers',
          description: 'Extend Docket with adapters',
          url: '/docs/developers'
        },
        {
          title: 'Providers',
          description: 'Deploy on any platform',
          url: '/docs/providers'
        }
      ]}
    >
      {children}
    </DocsLayout>
  );
}
