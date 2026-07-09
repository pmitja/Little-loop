import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@littleloop/shared', '@littleloop/db'],
};

export default nextConfig;
