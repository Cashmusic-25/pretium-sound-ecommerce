'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'  // 2개

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 현재 세션 확인 (새로고침 시 세션 복원)
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('세션 가져오기 오류:', error)
        } else if (session?.user) {
          console.log('✅ 기존 세션 복원:', session.user.email)
          setUser(session.user)
        } else {
          console.log('❌ 기존 세션 없음')
        }
      } catch (error) {
        console.error('세션 확인 오류:', error)
      } finally {
        setLoading(false)
      }
    }

    getSession()

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

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    try {
      setLoading(true)
      console.log('🔐 로그인 시도:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('로그인 오류:', error)
        throw error
      }

      console.log('✅ 로그인 성공:', data.user.email)
      return { user: data.user, error: null }
    } catch (error) {
      console.error('인증 에러:', error)
      return { user: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (userData) => {
    try {
      setLoading(true)
      console.log('📝 회원가입 시도:', userData)
      
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
          }
        }
      })

      if (error) {
        console.error('회원가입 오류:', error)
        throw error
      }

      console.log('✅ 회원가입 성공:', data.user?.email)
      return { user: data.user, error: null }
    } catch (error) {
      console.error('인증 에러:', error)
      return { user: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      console.log('🚪 로그아웃 시도')
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('로그아웃 오류:', error)
        throw error
      }
      
      console.log('✅ 로그아웃 성공')
      setUser(null)
    } catch (error) {
      console.error('로그아웃 에러:', error)
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