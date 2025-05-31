import { createClient } from '@supabase/supabase-js'

// 환경 변수가 없을 때 기본값 사용
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// 환경 변수가 제대로 설정되지 않았을 때 경고
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase environment variables not set. Using fallback mode.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // 세션 유지 활성화
    autoRefreshToken: true,      // 토큰 자동 갱신
    detectSessionInUrl: true,    // URL에서 세션 감지
    flowType: 'pkce'            // 보안 강화
  }
})