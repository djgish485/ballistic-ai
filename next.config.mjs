/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (!dev) {
      // Disable HMR in production
      config.optimization.runtimeChunk = false;
      config.optimization.splitChunks = {
        cacheGroups: {
          default: false,
        },
      };
    }
    return config;
  },
  // Add this eslint configuration to ignore linting errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;