// src/contexts/AuthContext.js - 위시리스트 기능 추가 버전
'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getSupabase } from '../../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [supabase, setSupabase] = useState(null)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [supabaseReady, setSupabaseReady] = useState(false)
  const [wishlist, setWishlist] = useState([]) // 위시리스트 상태 추가

  // 위시리스트 로컬 스토리지 키 생성
  const getWishlistKey = (userId) => `wishlist_${userId}`

  // 위시리스트 로드
  const loadWishlist = useCallback((userId) => {
    if (!userId) return []
    
    try {
      const savedWishlist = localStorage.getItem(getWishlistKey(userId))
      return savedWishlist ? JSON.parse(savedWishlist) : []
    } catch (error) {
      console.warn('위시리스트 로드 실패:', error)
      return []
    }
  }, [])

  // 위시리스트 저장
  const saveWishlist = useCallback((userId, wishlistData) => {
    if (!userId) return
    
    try {
      localStorage.setItem(getWishlistKey(userId), JSON.stringify(wishlistData))
    } catch (error) {
      console.warn('위시리스트 저장 실패:', error)
    }
  }, [])

  // 위시리스트 토글 함수
  const toggleWishlist = useCallback((productId) => {
    if (!user) {
      throw new Error('로그인이 필요합니다.')
    }

    setWishlist(prevWishlist => {
      const productIdStr = String(productId)
      const isInWishlist = prevWishlist.includes(productIdStr)
      
      let newWishlist
      if (isInWishlist) {
        // 위시리스트에서 제거
        newWishlist = prevWishlist.filter(id => id !== productIdStr)
        // console.debug('위시리스트에서 제거:', productId)
      } else {
        // 위시리스트에 추가
        newWishlist = [...prevWishlist, productIdStr]
        // console.debug('위시리스트에 추가:', productId)
      }
      
      // 로컬 스토리지에 저장
      saveWishlist(user.id, newWishlist)
      
      return newWishlist
    })
    
    // 토글 후 상태 반환 (UI에서 즉시 사용할 수 있도록)
    return !wishlist.includes(String(productId))
  }, [user, saveWishlist, wishlist])

  // 위시리스트에 있는지 확인
  const isInWishlist = useCallback((productId) => {
    return wishlist.includes(String(productId))
  }, [wishlist])

  // 위시리스트 전체 가져오기
  const getWishlist = useCallback(() => {
    return wishlist
  }, [wishlist])

  // 위시리스트 전체 삭제
  const clearWishlist = useCallback(() => {
    if (!user) return
    
    setWishlist([])
    saveWishlist(user.id, [])
    // console.debug('위시리스트 전체 삭제')
  }, [user, saveWishlist])

// 인증된 API 요청을 위한 헬퍼 함수 (수정된 버전)
const makeAuthenticatedRequest = async (url, options = {}) => {
  try {
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    if (!supabase) {
      throw new Error('Supabase 클라이언트가 준비되지 않았습니다.');
    }

    // 현재 세션 가져오기
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('세션 가져오기 오류:', sessionError);
      throw new Error('세션을 가져올 수 없습니다.');
    }

    if (!session?.access_token) {
      throw new Error('유효한 세션이 없습니다.');
    }

    // console.debug('인증된 요청:', url)

    // 헤더 설정
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers
    };

    // fetch 요청
    const response = await fetch(url, {
      ...options,
      headers
    });

    // console.debug('응답 상태:', response.status, response.statusText);

    return response;

  } catch (error) {
    console.error('❌ makeAuthenticatedRequest 오류:', error);
    throw error;
  }
};

  // 사용자의 구매 여부 확인 (RLS 기반)
  const hasPurchasedProduct = async (productId) => {
    if (!user || !supabase) return false

    try {
      // console.debug('구매 여부 확인:', user.id, productId)

      // RLS가 적용된 상태로 주문 조회 (사용자는 자신의 주문만 조회 가능)
      const { data, error } = await supabase
        .from('orders')
        .select('items')
        .eq('status', 'delivered') // 배송완료된 주문만

      if (error) {
        console.error('구매 여부 확인 실패:', error)
        return false
      }

      // 주문 아이템들 중에 해당 상품이 있는지 확인
      const hasPurchased = data.some(order => 
        order.items?.some(item => item.id === productId || item.id === parseInt(productId))
      )

      // console.debug('구매 여부 결과:', hasPurchased)
      return hasPurchased

    } catch (error) {
      console.error('구매 여부 확인 중 오류:', error)
      return false
    }
  }

  // 사용자의 리뷰 작성 여부 확인 (RLS 기반)
  const hasReviewedProduct = async (productId) => {
    if (!user || !supabase) return false

    try {
      // RLS가 적용된 상태로 리뷰 조회 (사용자는 자신의 리뷰만 조회 가능)
      const { data, error } = await supabase
        .from('reviews')
        .select('id')
        .eq('product_id', productId)

      if (error) {
        console.error('리뷰 확인 실패:', error)
        return false
      }

      return data.length > 0

    } catch (error) {
      console.error('리뷰 확인 중 오류:', error)
      return false
    }
  }

  // 리뷰 추가 (RLS 기반)
  const addReview = async (reviewData) => {
    if (!user || !supabase) {
      throw new Error('로그인이 필요합니다.')
    }

    try {
      // console.debug('리뷰 저장 시작')

      // RLS가 적용된 상태로 리뷰 저장 (사용자는 자신의 리뷰만 생성 가능)
      const supabaseReviewData = {
        product_id: reviewData.product_id,
        rating: reviewData.rating,
        title: reviewData.title || '',
        content: reviewData.content,
        photos: reviewData.photos || [],
        verified: true
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert([supabaseReviewData])
        .select()
        .single()

      if (error) {
        console.error('리뷰 저장 실패:', error)
        throw error
      }

      // console.debug('리뷰 저장 성공')
      return data

    } catch (error) {
      console.error('리뷰 추가 실패:', error)
      throw error
    }
  }

  // 리뷰 수정 (RLS 기반)
  const updateReview = async (reviewId, reviewData) => {
    if (!user || !supabase) {
      throw new Error('로그인이 필요합니다.')
    }

    try {
      // RLS가 적용된 상태로 리뷰 수정 (사용자는 자신의 리뷰만 수정 가능)
      const { data, error } = await supabase
        .from('reviews')
        .update({
          rating: reviewData.rating,
          title: reviewData.title || '',
          content: reviewData.content,
          photos: reviewData.photos || [],
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)
        .select()
        .single()

      if (error) {
        console.error('리뷰 수정 실패:', error)
        throw error
      }

      // console.debug('리뷰 수정 성공')
      return data

    } catch (error) {
      console.error('리뷰 수정 실패:', error)
      throw error
    }
  }

  // 리뷰 삭제 (RLS 기반)
  const deleteReview = async (reviewId) => {
    if (!user || !supabase) {
      throw new Error('로그인이 필요합니다.')
    }

    try {
      // RLS가 적용된 상태로 리뷰 삭제 (사용자는 자신의 리뷰만 삭제 가능)
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)

      if (error) {
        console.error('리뷰 삭제 실패:', error)
        throw error
      }

      // console.debug('리뷰 삭제 성공')
      return true

    } catch (error) {
      console.error('리뷰 삭제 실패:', error)
      throw error
    }
  }

  const initializeAuth = useCallback(async () => {
    if (typeof window === 'undefined') {
      setLoading(false)
      return
    }

    try {
      // console.debug('Auth 초기화 시작... (시도:', retryCount + 1, ')')
      setError(null)
      
      const client = await getSupabase()
      if (!client) {
        throw new Error('Supabase 클라이언트를 생성할 수 없습니다. 환경 변수를 확인해주세요.')
      }

      setSupabase(client)
      setSupabaseReady(true)

      // OAuth 코드가 포함되어 있으면 세션 교환 시도 (보강 처리)
      try {
        const currentUrl = new URL(window.location.href)
        const code = currentUrl.searchParams.get('code')
        if (code) {
          const { error: exchangeError } = await client.auth.exchangeCodeForSession(code)
          if (!exchangeError) {
            const next = currentUrl.searchParams.get('next') || '/'
            if (next.startsWith('/')) {
              window.history.replaceState({}, '', next)
            } else {
              window.history.replaceState({}, '', '/')
            }
          }
        }
      } catch (e) {
        // 무시: 코드가 없거나 교환 실패 시에는 기본 흐름으로 진행
      }

      // 현재 세션 확인
      const { data: { session }, error: sessionError } = await client.auth.getSession()
      
      if (sessionError) {
        // console.warn('세션 가져오기 경고:', sessionError)
      } 
      
      if (session?.user) {
        // console.debug('기존 세션 복원:', session.user.email)
        setUser(session.user)
        // 위시리스트 로드
        const userWishlist = loadWishlist(session.user.id)
        setWishlist(userWishlist)
      } else {
        // console.debug('기존 세션 없음')
      }

      // 인증 상태 변화 감지
      const { data: { subscription } } = client.auth.onAuthStateChange(
        (event, session) => {
          // console.debug('인증 상태 변화:', event, session?.user?.email)
          setUser(session?.user || null)
          
          if (session?.user) {
            // 로그인 시 위시리스트 로드
            const userWishlist = loadWishlist(session.user.id)
            setWishlist(userWishlist)
          } else {
            // 로그아웃 시 위시리스트 초기화
            setWishlist([])
          }
          
          setLoading(false)
        }
      )

      setLoading(false)
      setRetryCount(0)

      return () => {
        subscription?.unsubscribe()
      }

    } catch (error) {
      console.error('Auth 초기화 실패:', error)
      setError(error.message)
      setLoading(false)
      setSupabaseReady(false)

      if (retryCount < 2) {
        // console.debug('5초 후 재시도...')
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
        }, 5000)
      } else {
        console.error('최대 재시도 횟수 초과')
      }
    }
  }, [retryCount, loadWishlist])

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
      // console.debug('로그인 시도')
  
      if (!email || !password) {
        throw new Error('이메일과 비밀번호를 입력해주세요.')
      }
  
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      })
  
      if (error) {
        console.error('🚨 로그인 에러:', error)
        
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
  
      // console.debug('로그인 성공')
      // 위시리스트는 onAuthStateChange에서 자동으로 로드됨
      return { user: data.user, error: null }
  
    } catch (error) {
      console.error('로그인 실패:', error)
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
      // console.debug('회원가입 시도')
  
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
  
      // console.debug('회원가입 성공')
      return { user: data.user, error: null }
  
    } catch (error) {
      console.error('회원가입 실패:', error)
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const loginWithGoogle = async () => {
    if (!supabase) {
      throw new Error('인증 시스템이 아직 준비되지 않았습니다.')
    }

    try {
      setLoading(true)
      setError(null)
      // console.debug('구글 로그인 시도')

      const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      const redirectTo = origin

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })

      if (error) {
        console.error('🚨 구글 로그인 에러:', error)
        throw new Error(error.message || '구글 로그인에 실패했습니다.')
      }

      // OAuth는 보통 리다이렉트되므로 여기서 추가 처리 없이 반환
      return data
    } catch (error) {
      console.error('구글 로그인 실패:', error)
      setError(error.message)
      throw error
    } finally {
      // 리다이렉트가 발생하면 이 finally는 실행되지 않을 수 있음
      setLoading(false)
    }
  }
  
  const loginWithKakao = async () => {
    if (!supabase) {
      throw new Error('인증 시스템이 아직 준비되지 않았습니다.')
    }

    try {
      setLoading(true)
      setError(null)

      const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      const redirectTo = origin

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo,
          // OIDC 세션 생성을 위해 openid 포함, 이메일 검수 전이므로 email은 제외
          queryParams: {
            scope: 'openid account_email profile_nickname profile_image'
          }
        }
      })

      if (error) {
        console.error('🚨 카카오 로그인 에러:', error)
        throw new Error(error.message || '카카오 로그인에 실패했습니다.')
      }

      return data
    } catch (error) {
      console.error('카카오 로그인 실패:', error)
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
      // console.debug('로그아웃 시도')
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('로그아웃 에러:', error)
        throw error
      }
      
      // console.debug('로그아웃 성공')
      setUser(null)
      setWishlist([]) // 위시리스트 초기화
    } catch (error) {
      console.error('로그아웃 실패:', error)
      setUser(null) // 강제 로그아웃
      setWishlist([]) // 위시리스트 초기화
      throw error
    }
  }

  // 보안이 강화된 주문 추가 함수
  const addOrder = async (orderData) => {
    // console.debug('addOrder 호출')
    
    if (!supabase || !user) {
      console.error('❌ supabase 또는 user 없음')
      throw new Error('로그인이 필요합니다.')
    }

    try {
      // console.debug('주문 저장 시작')

      // 인증된 API 요청을 통해 주문 생성
      const response = await makeAuthenticatedRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          orderId: orderData.id || `PS${Date.now()}`,
          userId: user.id,
          items: orderData.items,
          totalAmount: orderData.totalAmount,
          status: orderData.status || 'pending',
          shippingAddress: {
            name: orderData.shipping.name,
            phone: orderData.shipping.phone,
            email: orderData.shipping.email,
            address: orderData.shipping.address,
            detailAddress: orderData.shipping.detailAddress,
            zipCode: orderData.shipping.zipCode,
            memo: orderData.shipping.memo
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '주문 생성 실패');
      }

      // console.debug('주문 저장 성공')
      return result.order;

    } catch (error) {
      console.error('주문 추가 실패 상세:', error)
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
  const ADMIN_EMAILS = new Set(['admin@pretiumsound.com', 'jasonincompany@gmail.com'])
  const isAdmin = (user && ADMIN_EMAILS.has(user.email)) || user?.user_metadata?.role === 'admin'

  // 관리자용 함수들 (기존 localStorage 기반 유지)
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
    loginWithGoogle,
    loginWithKakao,
    retry,
    isAuthenticated: !!user,
    isAdmin,
    supabaseReady,
    makeAuthenticatedRequest,
    getAllUsers,
    getAllOrders,
    getAllReviews,
    updateOrderStatus,
    adminDeleteReview,
    addOrder,
    hasPurchasedProduct,
    hasReviewedProduct,
    addReview,
    updateReview,
    deleteReview,
    // 위시리스트 관련 함수들 추가
    wishlist,
    toggleWishlist,
    isInWishlist,
    getWishlist,
    clearWishlist
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