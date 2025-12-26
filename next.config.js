/** @type {import('next').NextConfig} */
const nextConfig = {
  // 로컬/CI에서 상위 디렉토리의 다른 lockfile 때문에 루트 추론이 틀어지는 경고를 방지
  // (Next 16 build 출력의 "multiple lockfiles" 경고 대응)
  outputFileTracingRoot: __dirname,

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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'diwqgwwppplvzqkqsrie.supabase.co',
      },
    ],
  }
}

module.exports = nextConfig