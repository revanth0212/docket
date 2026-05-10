import { createMDX } from 'fumadocs-core/mdx-config';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  output: 'export',
  distDir: 'dist'
};

export default withMDX(config);
