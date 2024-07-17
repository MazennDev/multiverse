/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
      domains: ['lh3.googleusercontent.com', 'cdn.discordapp.com'],
  },
  async redirects() {
      return [
        {
          source: '/post',
          destination: '/',
          permanent: true,
        },
      ]
    },
  }
  
  module.exports = nextConfig
  