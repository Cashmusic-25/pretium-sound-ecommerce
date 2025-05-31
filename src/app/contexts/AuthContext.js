'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getSupabase } from '../../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [supabase, setSupabase] = useState(null)
  const [initialized, setInitialized] = useState(false)

  // Supabase 초기화
  const initializeSupabase = useCallback(async () => {
    if (initialized || typeof window === 'undefined') {
      return
    }

    try {
      console.log('🚀 Supabase 초기화 시작...')
      
      const client = await getSupabase()
      if (!client) {
        console.error('❌ Supabase 클라이언트를 생성할 수 없습니다.')
        setLoading(false)
        return
      }

      setSupabase(client)
      setInitialized(true)

      // 현재 세션 확인
      const { data: { session }, error } = await client.auth.getSession()
      
      if (error) {
        console.error('세션 가져오기 오류:', error)
      } else if (session?.user) {
        console.log('✅ 기존 세션 복원:', session.user.email)
        setUser(session.user)
      } else {
        console.log('❌ 기존 세션 없음')
      }

      // 인증 상태 변화 감지
      const { data: { subscription } } = client.auth.onAuthStateChange(
        (event, session) => {
          console.log('🔄 인증 상태 변화:', event, session?.user?.email)
          setUser(session?.user || null)
          setLoading(false)
        }
      )

      setLoading(false)

      // 클린업 함수 반환
      return () => {
        subscription.unsubscribe()
      }

    } catch (error) {
      console.error('💥 Supabase 초기화 실패:', error)
      setLoading(false)
    }
  }, [initialized])

  useEffect(() => {
    let cleanup = null

    // hydration 완료 후 초기화
    const timer = setTimeout(async () => {
      cleanup = await initializeSupabase()
    }, 0)

    return () => {
      clearTimeout(timer)
      if (cleanup && typeof cleanup === 'function') {
        cleanup()
      }
    }
  }, [initializeSupabase])

  const signIn = async (email, password) => {
    if (!supabase) {
      throw new Error('Supabase가 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.')
    }

    try {
      setLoading(true)
      console.log('🔐 로그인 시도:', email)
  
      if (!email || !password) {
        throw new Error('이메일과 비밀번호를 입력해주세요.')
      }
  
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      })
  
      if (error) {
        console.error('🚨 로그인 에러:', error)
        throw error
      }
  
      if (!data?.user) {
        throw new Error('사용자 데이터가 없습니다.')
      }
  
      console.log('✅ 로그인 성공:', data.user.email)
      return { user: data.user, error: null }
  
    } catch (error) {
      console.error('💥 로그인 실패:', error)
      return { user: null, error }
    } finally {
      setLoading(false)
    }
  }
  
  const signUp = async (userData) => {
    if (!supabase) {
      throw new Error('Supabase가 아직 초기화되지 않았습니다.')
    }

    try {
      setLoading(true)
      console.log('📝 회원가입 시도:', userData.email)
  
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name
          }
        }
      })
  
      if (error) {
        console.error('🚨 회원가입 에러:', error)
        throw error
      }
  
      console.log('✅ 회원가입 성공:', data.user?.email)
      return { user: data.user, error: null }
  
    } catch (error) {
      console.error('💥 회원가입 실패:', error)
      return { user: null, error }
    } finally {
      setLoading(false)
    }
  }
  
  const signOut = async () => {
    if (!supabase) {
      throw new Error('Supabase가 아직 초기화되지 않았습니다.')
    }

    try {
      console.log('🚪 로그아웃 시도')
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('로그아웃 에러:', error)
        throw error
      }
      
      console.log('✅ 로그아웃 성공')
      setUser(null)
    } catch (error) {
      console.error('💥 로그아웃 실패:', error)
      setUser(null)
      throw error
    }
  }

  // 관리자 권한 확인
  const isAdmin = user?.email === 'admin@pretiumsound.com' || user?.user_metadata?.role === 'admin'

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
    isAdmin,
    supabaseReady: !!supabase,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}