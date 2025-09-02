// src/lib/supabase.js - 수정된 버전

import { createClient } from '@supabase/supabase-js'

// 환경 변수 확인
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '설정됨' : '없음')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '설정됨' : '없음')
}

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: typeof window !== 'undefined',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'pretium-sound-auth'
  },
  global: {
    headers: {
      'X-Client-Info': 'pretium-sound-nextjs'
    }
  },
  db: {
    schema: 'public'
  }
})

// 레거시 호환성을 위한 getSupabase 함수
export const getSupabase = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase 환경 변수가 설정되지 않았습니다')
    return null
  }
  return supabase
}

// 클라이언트 초기화 상태 확인
export const isSupabaseReady = () => {
  return supabaseUrl && supabaseKey
}

// console.debug('Supabase 클라이언트 초기화:', isSupabaseReady() ? '성공' : '실패')