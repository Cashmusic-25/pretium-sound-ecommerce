// Supabase 클라이언트를 동적으로 생성하는 방식
let supabaseClient = null

export const getSupabase = async () => {
  // 이미 생성된 클라이언트가 있다면 재사용
  if (supabaseClient) {
    return supabaseClient
  }

  // 브라우저 환경에서만 실행
  if (typeof window === 'undefined') {
    return null
  }

  try {
    // 동적 import 사용
    const { createClient } = await import('@supabase/supabase-js')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
      return null
    }

    console.log('🔧 Supabase 클라이언트 생성 중...')

    // 클라이언트 생성
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: window.localStorage
      }
    })

    console.log('✅ Supabase 클라이언트 생성 완료')
    return supabaseClient

  } catch (error) {
    console.error('❌ Supabase 클라이언트 생성 실패:', error)
    return null
  }
}

// 레거시 지원을 위한 export (사용하지 말 것)
export const supabase = null