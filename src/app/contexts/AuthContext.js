'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const AuthContext = createContext()

// Supabase를 동적으로 import
const initSupabase = async () => {
  if (typeof window !== 'undefined') {
    const { supabase } = await import('../../lib/supabase')
    return supabase
  }
  return null
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [supabaseClient, setSupabaseClient] = useState(null)

  useEffect(() => {
    const setupAuth = async () => {
      try {
        const supabase = await initSupabase()
        if (!supabase) return
        
        setSupabaseClient(supabase)

        // 현재 세션 확인
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('세션 가져오기 오류:', error)
        } else if (session?.user) {
          console.log('✅ 기존 세션 복원:', session.user.email)
          setUser(session.user)
        } else {
          console.log('❌ 기존 세션 없음')
        }

        // 인증 상태 변화 감지
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('🔄 인증 상태 변화:', event, session?.user?.email)
            
            if (session?.user) {
              setUser(session.user)
            } else {
              setUser(null)
            }
            setLoading(false)
          }
        )

        setLoading(false)
        return () => subscription.unsubscribe()
      } catch (error) {
        console.error('Auth 설정 오류:', error)
        setLoading(false)
      }
    }

    setupAuth()
  }, [])

  const signIn = async (email, password) => {
    if (!supabaseClient) {
      throw new Error('Supabase client not initialized')
    }

    try {
      setLoading(true)
      console.log('🔐 실제 Supabase 로그인 시도:', email)
  
      if (!email || !password) {
        throw new Error('이메일과 비밀번호를 입력해주세요.')
      }
  
      const response = await supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password: password
      })
  
      console.log('📥 Supabase 응답:', response)
  
      const { data, error } = response
  
      if (error) {
        console.error('🚨 Supabase 에러:', error)
        throw error
      }
  
      if (!data?.user) {
        throw new Error('사용자 데이터가 없습니다.')
      }
  
      console.log('✅ 로그인 성공:', data.user.email)
      setUser(data.user)
      return { user: data.user, error: null }
  
    } catch (error) {
      console.error('💥 로그인 실패:', error)
      return { user: null, error }
    } finally {
      setLoading(false)
    }
  }
  
  const signUp = async (userData) => {
    if (!supabaseClient) {
      throw new Error('Supabase client not initialized')
    }

    try {
      setLoading(true)
      console.log('📝 실제 Supabase 회원가입 시도:', userData.email)
  
      const response = await supabaseClient.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name
          }
        }
      })
  
      const { data, error } = response
  
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
    if (!supabaseClient) {
      throw new Error('Supabase client not initialized')
    }

    try {
      console.log('🚪 실제 Supabase 로그아웃')
      
      const { error } = await supabaseClient.auth.signOut()
      
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
    // 다른 함수들도 여기에 추가
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