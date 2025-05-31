import { createClient } from '@supabase/supabase-js'

// 환경 변수 확인
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔧 Environment check:')
console.log('- Supabase URL:', supabaseUrl ? 'Set' : 'Missing')
console.log('- Supabase Key:', supabaseAnonKey ? 'Set' : 'Missing')

// 환경 변수가 없으면 에러 던지기
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  throw new Error('Missing Supabase environment variables')
}

// 잘못된 placeholder 값 체크
if (supabaseUrl.includes('placeholder') || supabaseAnonKey === 'placeholder-key') {
  console.error('❌ Using placeholder Supabase values')
  throw new Error('Using placeholder Supabase values - check environment variables')
}

let supabase = null

try {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  })
  
  console.log('✅ Supabase client created successfully')
  
  // 클라이언트 테스트
  if (!supabase.auth || typeof supabase.auth.signInWithPassword !== 'function') {
    throw new Error('Supabase auth methods not available')
  }
  
} catch (error) {
  console.error('❌ Failed to create Supabase client:', error)
  throw error
}

export { supabase }