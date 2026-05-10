import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX({
  configPath: './source.config.ts'
});

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Only static export during production builds.
  // Dev mode disables this to avoid catch-all route issues in Next.js 15.
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  distDir: 'dist',
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  }
};

export default withMDX(config);
