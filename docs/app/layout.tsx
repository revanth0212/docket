import { RootProvider } from 'fumadocs-ui/provider';
import 'fumadocs-ui/style.css';
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: {
    template: '%s | Docket Docs',
    default: 'Docket — Open-Source Second Brain Core'
  },
  description: 'Ingest anything. Embed everything. Query your knowledge — with memory that thinks.'
};

export default function Layout({ children }) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
