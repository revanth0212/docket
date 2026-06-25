import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: 'Docket',
    transparentMode: 'top'
  },
  links: [
    {
      text: 'Docs',
      url: '/docs',
      active: 'nested-url'
    },
    {
      text: 'GitHub',
      url: 'https://github.com/revanth0212/docket'
    }
  ],
  githubUrl: 'https://github.com/revanth0212/docket'
};
