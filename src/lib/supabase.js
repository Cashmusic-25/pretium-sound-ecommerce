// 프로덕션 환경에서 안전한 Supabase 클라이언트

let supabaseInstance = null
let initializationPromise = null

const createSupabaseClient = async () => {
  try {
    // 환경 변수 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
      throw new Error('Missing Supabase environment variables')
    }

    // 동적 import 사용 (프로덕션에서 안전)
    const { createClient } = await import('@supabase/supabase-js')
    
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
    throw error
  }
}

export const getSupabase = async () => {
  // 서버 사이드에서는 null 반환
  if (typeof window === 'undefined') {
    return null
  }

  // 이미 인스턴스가 있으면 반환
  if (supabaseInstance) {
    return supabaseInstance
  }

  // 초기화가 진행 중이면 기다림
  if (initializationPromise) {
    return await initializationPromise
  }

  // 새로운 초기화 시작
  initializationPromise = createSupabaseClient()
  
  try {
    supabaseInstance = await initializationPromise
    return supabaseInstance
  } catch (error) {
    initializationPromise = null
    throw error
  } finally {
    initializationPromise = null
  }
}

// 레거시 호환성을 위한 export
export const supabase = null

// 클라이언트 초기화 상태 확인
export const isSupabaseReady = () => {
  return supabaseInstance !== null
}

// 클라이언트 재설정 (에러 복구용)
export const resetSupabaseClient = () => {
  supabaseInstance = null
  initializationPromise = null
}