import { createClient } from '@supabase/supabase-js'

// 환경 변수 로드
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 클라이언트 사이드에서만 로그 출력
if (typeof window !== 'undefined') {
  console.log('🔧 Supabase 초기화 시작...')
  console.log('URL 존재:', !!supabaseUrl)
  console.log('Key 존재:', !!supabaseKey)
}

if (!supabaseUrl || !supabaseKey) {
  if (typeof window !== 'undefined') {
    console.error('❌ Supabase 환경 변수가 없습니다!')
    console.log('URL:', supabaseUrl)
    console.log('Key:', supabaseKey ? `${supabaseKey.slice(0, 20)}...` : 'undefined')
  }
  throw new Error('Missing Supabase environment variables')
}

// Supabase 클라이언트 생성 함수
export const createSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    },
    global: {
      headers: {
        'X-Client-Info': 'nextjs'
      }
    }
  })
}

// 기본 클라이언트 (브라우저에서만)
let supabase = null

if (typeof window !== 'undefined') {
  supabase = createSupabaseClient()
  
  // 클라이언트 검증
  console.log('✅ Supabase 클라이언트 생성 완료')
  console.log('Auth 객체:', !!supabase.auth)
  console.log('signInWithPassword:', typeof supabase.auth?.signInWithPassword)
  
  // 메서드 존재 확인
  if (!supabase.auth || typeof supabase.auth.signInWithPassword !== 'function') {
    console.error('❌ Supabase auth 메서드를 사용할 수 없습니다!')
    throw new Error('Supabase auth methods not available')
  }
}

export { supabase }