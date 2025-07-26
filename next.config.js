/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['i.ytimg.com', 'yt3.ggpht.com'],
  },
  env: {
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
    SILICONFLOW_API_KEY: process.env.SILICONFLOW_API_KEY,
  },
}

module.exports = nextConfig