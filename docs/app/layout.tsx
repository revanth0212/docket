import { RootProvider } from 'fumadocs-ui/provider';
import 'fumadocs-ui/style.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: {
    template: '%s | Cortex Docs',
    default: 'Cortex — Open-Source Second Brain Core'
  },
  description: 'Ingest anything. Embed everything. Query your knowledge — with memory that thinks.'
};

export default function Layout({ children }) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
