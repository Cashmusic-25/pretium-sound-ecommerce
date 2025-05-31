'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { createSupabaseClient } from '../../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [supabase, setSupabase] = useState(null)

  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') {
      setLoading(false)
      return
    }

    let mounted = true
    let authSubscription = null

    const initializeAuth = async () => {
      try {
        console.log('🔄 Auth 초기화 시작...')
        
        // Supabase 클라이언트 생성
        const client = createSupabaseClient()
        
        if (!mounted) return
        setSupabase(client)

        // 현재 세션 확인 (새로고침 시 세션 복원)
        const { data: { session }, error } = await client.auth.getSession()
        
        if (!mounted) return

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
          async (event, session) => {
            if (!mounted) return
            
            console.log('🔄 인증 상태 변화:', event, session?.user?.email)
            
            if (session?.user) {
              setUser(session.user)
            } else {
              setUser(null)
            }
            setLoading(false)
          }
        )

        authSubscription = subscription
        if (mounted) {
          setLoading(false)
        }

      } catch (error) {
        console.error('Auth 초기화 오류:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // 초기화 지연 실행 (hydration 완료 후)
    const timer = setTimeout(initializeAuth, 100)

    return () => {
      mounted = false
      clearTimeout(timer)
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
    }
  }, [])

  const signIn = async (email, password) => {
    if (!supabase) {
      throw new Error('Supabase client not ready')
    }

    try {
      setLoading(true)
      console.log('🔐 실제 Supabase 로그인 시도:', email)
  
      // 입력값 검증
      if (!email || !password) {
        throw new Error('이메일과 비밀번호를 입력해주세요.')
      }
  
      console.log('📡 Supabase 호출 준비...')
      
      // 실제 Supabase 호출
      const response = await supabase.auth.signInWithPassword({
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
    if (!supabase) {
      throw new Error('Supabase client not ready')
    }

    try {
      setLoading(true)
      console.log('📝 실제 Supabase 회원가입 시도:', userData.email)
  
      const response = await supabase.auth.signUp({
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
    if (!supabase) {
      throw new Error('Supabase client not ready')
    }

    try {
      console.log('🚪 실제 Supabase 로그아웃')
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('로그아웃 에러:', error)
        throw error
      }
      
      console.log('✅ 로그아웃 성공')
      setUser(null)
    } catch (error) {
      console.error('💥 로그아웃 실패:', error)
      setUser(null) // 강제로 로그아웃
      throw error
    }
  }

  // 관리자 권한 확인
  const isAdmin = user?.email === 'admin@pretiumsound.com' || user?.user_metadata?.role === 'admin'

  // 위시리스트 관련 함수들 (기존 코드 유지)
  const toggleWishlist = async (productId) => {
    // 기존 코드...
  }

  const hasPurchasedProduct = (productId) => {
    // 기존 코드...
    return false // 임시
  }

  const hasReviewedProduct = (productId) => {
    // 기존 코드...
    return false // 임시
  }

  const addReview = async (reviewData) => {
    // 기존 코드...
  }

  const updateReview = async (reviewId, reviewData) => {
    // 기존 코드...
  }

  const deleteReview = async (reviewId) => {
    // 기존 코드...
  }

  const toggleReviewHelpful = async (reviewId) => {
    // 기존 코드...
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
    isAdmin,
    toggleWishlist,
    hasPurchasedProduct,
    hasReviewedProduct,
    addReview,
    updateReview,
    deleteReview,
    toggleReviewHelpful,
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