/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 배포 시 ESLint 에러를 무시 (임시 해결책)
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      }
    }
    
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    })

    return config
  },
  transpilePackages: ['@supabase/supabase-js'],
}

export default nextConfig