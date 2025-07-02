/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint 빌드 시 무시 (배포용)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 프로덕션 빌드 시 console.log 자동 제거
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'] // error와 warn은 유지
    } : false
  },
  
  // 기타 설정들 (기존 설정이 있다면 유지)
  reactStrictMode: true,
  
  // 이미지 최적화 설정 (선택사항)
  images: {
    domains: ['diwqgwwppplvzqkqsrie.supabase.co'],
  }
}

module.exports = nextConfig