// src/lib/supabase.js - 프로덕션 안전한 버전

import { createClient } from '@supabase/supabase-js'

let supabaseInstance = null

const createSupabaseClient = () => {
  try {
    // 환경 변수 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log('🔧 Supabase 환경변수 체크:', {
      url: supabaseUrl ? '설정됨' : '없음',
      key: supabaseKey ? '설정됨' : '없음',
      env: process.env.NODE_ENV
    })

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
      console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl)
      console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '[설정됨]' : '[없음]')
      return null
    }

    console.log('🔧 Supabase 클라이언트 생성 중...')

    const client = createClient(supabaseUrl, supabaseKey, {
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

    console.log('✅ Supabase 클라이언트 생성 완료')
    return client

  } catch (error) {
    console.error('💥 Supabase 클라이언트 생성 실패:', error)
    return null
  }
}

export const getSupabase = () => {
  // 서버 사이드에서는 null 반환
  if (typeof window === 'undefined') {
    console.log('🚫 서버 사이드에서 Supabase 요청됨')
    return null
  }

  // 이미 인스턴스가 있으면 반환
  if (supabaseInstance) {
    return supabaseInstance
  }

  // 새로운 인스턴스 생성
  supabaseInstance = createSupabaseClient()
  return supabaseInstance
}

// 레거시 호환성을 위한 export
export const supabase = typeof window !== 'undefined' ? getSupabase() : null

// 클라이언트 초기화 상태 확인
export const isSupabaseReady = () => {
  return supabaseInstance !== null
}

// 클라이언트 재설정 (에러 복구용)
export const resetSupabaseClient = () => {
  console.log('🔄 Supabase 클라이언트 재설정')
  supabaseInstance = null
}