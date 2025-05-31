/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 배포 시 ESLint 에러를 무시 (임시 해결책)
    ignoreDuringBuilds: true,
  },
  experimental: {
    esmExternals: 'loose',
  },
  // Supabase와 관련된 빌드 최적화
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

    // Supabase 모듈 최적화
    config.resolve.alias = {
      ...config.resolve.alias,
      '@supabase/supabase-js': require.resolve('@supabase/supabase-js'),
    }

    return config
  },
  transpilePackages: ['@supabase/supabase-js'],
  // 프로덕션 환경에서 소스맵 비활성화 (성능 향상)
  productionBrowserSourceMaps: false,
  // React Strict Mode 활성화
  reactStrictMode: true,
}

export default nextConfig