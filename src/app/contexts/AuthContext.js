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
  const [supabaseReady, setSupabaseReady] = useState(false)

  const initializeAuth = useCallback(async () => {
    // 서버 사이드에서는 실행하지 않음
    if (typeof window === 'undefined') {
      setLoading(false)
      return
    }

    try {
      console.log('🚀 Auth 초기화 시작... (시도:', retryCount + 1, ')')
      setError(null)
      
      const client = getSupabase()
      if (!client) {
        throw new Error('Supabase 클라이언트를 생성할 수 없습니다. 환경 변수를 확인해주세요.')
      }

      setSupabase(client)
      setSupabaseReady(true)

      // 현재 세션 확인
      const { data: { session }, error: sessionError } = await client.auth.getSession()
      
      if (sessionError) {
        console.warn('세션 가져오기 경고:', sessionError)
        // 세션 에러가 있어도 계속 진행
      } 
      
      if (session?.user) {
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
      setSupabaseReady(false)

      // 3번까지 재시도
      if (retryCount < 2) {
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

  const login = async (email, password) => {
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
        
        // 더 친화적인 에러 메시지
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('이메일 인증이 필요합니다.')
        } else if (error.message.includes('Too many requests')) {
          throw new Error('너무 많은 로그인 시도입니다. 잠시 후 다시 시도해주세요.')
        } else {
          throw new Error(error.message || '로그인에 실패했습니다.')
        }
      }
  
      if (!data?.user) {
        throw new Error('사용자 데이터가 없습니다.')
      }
  
      console.log('✅ 로그인 성공:', data.user.email)
      return { user: data.user, error: null }
  
    } catch (error) {
      console.error('💥 로그인 실패:', error)
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }
  
  const signup = async (userData) => {
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
        
        // 더 친화적인 에러 메시지
        if (error.message.includes('User already registered')) {
          throw new Error('이미 등록된 이메일입니다.')
        } else if (error.message.includes('Password should be at least')) {
          throw new Error('비밀번호는 최소 6자 이상이어야 합니다.')
        } else if (error.message.includes('Invalid email')) {
          throw new Error('올바른 이메일 주소를 입력해주세요.')
        } else {
          throw new Error(error.message || '회원가입에 실패했습니다.')
        }
      }
  
      console.log('✅ 회원가입 성공:', data.user?.email)
      return { user: data.user, error: null }
  
    } catch (error) {
      console.error('💥 회원가입 실패:', error)
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }
  
  const logout = async () => {
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

  // 더미 함수들 (LocalStorage 기반)
  const getAllUsers = () => {
    try {
      return JSON.parse(localStorage.getItem('allUsers') || '[]')
    } catch {
      return []
    }
  }

  const getAllOrders = () => {
    try {
      return JSON.parse(localStorage.getItem('allOrders') || '[]')
    } catch {
      return []
    }
  }

  const getAllReviews = () => {
    try {
      return JSON.parse(localStorage.getItem('reviews') || '[]')
    } catch {
      return []
    }
  }

  const updateOrderStatus = (orderId, status) => {
    try {
      const orders = getAllOrders()
      const updatedOrders = orders.map(order => 
        order.id === orderId ? { ...order, status } : order
      )
      localStorage.setItem('allOrders', JSON.stringify(updatedOrders))
      return true
    } catch {
      return false
    }
  }

  const adminDeleteReview = (reviewId) => {
    try {
      const reviews = getAllReviews()
      const updatedReviews = reviews.filter(review => review.id !== reviewId)
      localStorage.setItem('reviews', JSON.stringify(updatedReviews))
      return true
    } catch {
      return false
    }
  }

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    retry,
    isAuthenticated: !!user,
    isAdmin,
    supabaseReady,
    getAllUsers,
    getAllOrders,
    getAllReviews,
    updateOrderStatus,
    adminDeleteReview,
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