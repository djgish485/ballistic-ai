/** @type {import('next').NextConfig} */

const nextConfig = {
  serverRuntimeConfig: {
    PROJECT_ROOT: process.cwd()
  },
  experimental: {
    serverComponentsExternalPackages: ['fs', 'path']
  }
};

export default nextConfig;
