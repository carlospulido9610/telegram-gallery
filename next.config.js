/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'axcvelgusqdbuootymfv.supabase.co',
      },
    ],
  },
};

module.exports = nextConfig;
