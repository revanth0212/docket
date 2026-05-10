import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX({
  configPath: './source.config.ts'
});

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  output: 'export',
  distDir: 'dist',
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  }
};

export default withMDX(config);
