'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getSupabase, resetSupabaseClient } from '../../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [supabase, setSupabase] = useState(null)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  const initializeAuth = useCallback(async () => {
    // 서버 사이드에서는 실행하지 않음
    if (typeof window === 'undefined') {
      setLoading(false)
      return
    }

    try {
      console.log('🚀 Auth 초기화 시작... (시도:', retryCount + 1, ')')
      setError(null)
      
      const client = await getSupabase()
      if (!client) {
        throw new Error('Supabase 클라이언트를 생성할 수 없습니다.')
      }

      setSupabase(client)

      // 현재 세션 확인
      const { data: { session }, error: sessionError } = await client.auth.getSession()
      
      if (sessionError) {
        console.warn('세션 가져오기 경고:', sessionError)
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
      setRetryCount(0) // 성공 시 재시도 카운트 리셋

      return () => {
        subscription?.unsubscribe()
      }

    } catch (error) {
      console.error('💥 Auth 초기화 실패:', error)
      setError(error.message)
      setLoading(false)

      // 3번까지 재시도
      if (retryCount < 3) {
        console.log('🔄 5초 후 재시도...')
        setTimeout(() => {
          resetSupabaseClient() // 클라이언트 리셋
          setRetryCount(prev => prev + 1)
        }, 5000)
      } else {
        console.error('❌ 최대 재시도 횟수 초과')
      }
    }
  }, [retryCount])

  useEffect(() => {
    let cleanup = null

    const timer = setTimeout(async () => {
      cleanup = await initializeAuth()
    }, 100)

    return () => {
      clearTimeout(timer)
      if (cleanup && typeof cleanup === 'function') {
        cleanup()
      }
    }
  }, [initializeAuth])

  const signIn = async (email, password) => {
    if (!supabase) {
      throw new Error('인증 시스템이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.')
    }

    try {
      setLoading(true)
      setError(null)
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
      setError(error.message)
      return { user: null, error }
    } finally {
      setLoading(false)
    }
  }
  
  const signUp = async (userData) => {
    if (!supabase) {
      throw new Error('인증 시스템이 아직 준비되지 않았습니다.')
    }

    try {
      setLoading(true)
      setError(null)
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
      setError(error.message)
      return { user: null, error }
    } finally {
      setLoading(false)
    }
  }
  
  const signOut = async () => {
    if (!supabase) {
      throw new Error('인증 시스템이 준비되지 않았습니다.')
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
      setUser(null) // 강제 로그아웃
      throw error
    }
  }

  // 수동 재시도 함수
  const retry = useCallback(() => {
    setRetryCount(0)
    setError(null)
    initializeAuth()
  }, [initializeAuth])

  // 관리자 권한 확인
  const isAdmin = user?.email === 'admin@pretiumsound.com' || user?.user_metadata?.role === 'admin'

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    retry,
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