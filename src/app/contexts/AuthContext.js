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


      // 사용자의 구매 여부 확인 (Supabase 기반)
  const hasPurchasedProduct = async (productId) => {
    if (!user) return false

    try {
      const supabaseClient = await getSupabase()
      if (!supabaseClient) {
        console.warn('Supabase 연결 실패, localStorage 사용')
        // 백업: localStorage에서 확인
        const orders = JSON.parse(localStorage.getItem('allOrders') || '[]')
        return orders.some(order => 
          order.userId === user.id && 
          order.items?.some(item => item.id === productId) &&
          order.status === 'delivered' // 배송완료된 주문만
        )
      }

      console.log('🔍 구매 여부 확인:', user.id, productId)

      // Supabase에서 배송완료된 주문 중에 해당 상품이 있는지 확인
      const { data, error } = await supabaseClient
        .from('orders')
        .select('items')
        .eq('user_id', user.id)
        .eq('status', 'delivered') // 배송완료된 주문만

      if (error) {
        console.error('구매 여부 확인 실패:', error)
        return false
      }

      // 주문 아이템들 중에 해당 상품이 있는지 확인
      const hasPurchased = data.some(order => 
        order.items?.some(item => item.id === productId || item.id === parseInt(productId))
      )

      console.log('✅ 구매 여부 결과:', hasPurchased)
      return hasPurchased

    } catch (error) {
      console.error('구매 여부 확인 중 오류:', error)
      return false
    }
  }

  // 사용자의 리뷰 작성 여부 확인 (Supabase 기반)
  const hasReviewedProduct = async (productId) => {
    if (!user) return false

    try {
      const supabaseClient = await getSupabase()
      if (!supabaseClient) {
        // 백업: localStorage에서 확인
        const reviews = JSON.parse(localStorage.getItem('reviews') || '[]')
        return reviews.some(review => 
          review.userId === user.id && 
          review.productId === productId
        )
      }

      const { data, error } = await supabaseClient
        .from('reviews')
        .select('id')
        .eq('user_id', user.id)
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


  // AuthProvider 컴포넌트 내부에 추가할 리뷰 관련 함수들

// addReview 함수를 이것으로 교체
const addReview = async (reviewData) => {
  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  try {
    const supabaseClient = await getSupabase()
    
    if (!supabaseClient) {
      // 백업: localStorage에 저장
      const reviews = JSON.parse(localStorage.getItem('reviews') || '[]')
      const newReview = {
        ...reviewData,
        id: Date.now(),
        user_id: user.id,
        created_at: new Date().toISOString()
      }
      reviews.push(newReview)
      localStorage.setItem('reviews', JSON.stringify(reviews))
      return newReview
    }

    console.log('💬 리뷰 저장 시작:', reviewData)

    // Supabase에 리뷰 저장 (photos 포함)
    const supabaseReviewData = {
      user_id: user.id,
      product_id: reviewData.product_id,
      rating: reviewData.rating,
      title: reviewData.title || '',
      content: reviewData.content,
      photos: reviewData.photos || [],  // 사진 데이터 추가
      verified: true
    }

    const { data, error } = await supabaseClient
      .from('reviews')
      .insert([supabaseReviewData])
      .select()
      .single()

    if (error) {
      console.error('리뷰 저장 실패:', error)
      throw error
    }

    console.log('✅ 리뷰 저장 성공 (사진 포함):', data)

    // 백업용으로 localStorage에도 저장
    try {
      const reviews = JSON.parse(localStorage.getItem('reviews') || '[]')
      reviews.push({
        ...reviewData,
        id: data.id,
        supabaseId: data.id
      })
      localStorage.setItem('reviews', JSON.stringify(reviews))
    } catch (storageError) {
      console.warn('localStorage 저장 실패:', storageError)
    }

    return data

  } catch (error) {
    console.error('리뷰 추가 실패:', error)
    throw error
  }
}

// updateReview 함수에서 photos 업데이트 추가
const updateReview = async (reviewId, reviewData) => {
  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  try {
    const supabaseClient = await getSupabase()
    
    if (!supabaseClient) {
      // localStorage 백업 로직...
      return reviewData
    }

    const { data, error } = await supabaseClient
      .from('reviews')
      .update({
        rating: reviewData.rating,
        title: reviewData.title || '',
        content: reviewData.content,
        photos: reviewData.photos || [],  // 사진 업데이트 추가
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('리뷰 수정 실패:', error)
      throw error
    }

    console.log('✅ 리뷰 수정 성공 (사진 포함):', data)
    return data

  } catch (error) {
    console.error('리뷰 수정 실패:', error)
    throw error
  }
}

// 리뷰 삭제 함수
const deleteReview = async (reviewId) => {
  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  try {
    const supabaseClient = await getSupabase()
    
    if (!supabaseClient) {
      // 백업: localStorage에서 삭제
      const reviews = JSON.parse(localStorage.getItem('reviews') || '[]')
      const filteredReviews = reviews.filter(review => review.id !== reviewId)
      localStorage.setItem('reviews', JSON.stringify(filteredReviews))
      return true
    }

    const { error } = await supabaseClient
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', user.id) // 본인 리뷰만 삭제 가능

    if (error) {
      console.error('리뷰 삭제 실패:', error)
      throw error
    }

    console.log('✅ 리뷰 삭제 성공')
    return true

  } catch (error) {
    console.error('리뷰 삭제 실패:', error)
    throw error
  }
}

// 리뷰 도움됨 토글 함수
const toggleReviewHelpful = async (reviewId) => {
  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  try {
    // 임시로 localStorage 사용 (나중에 Supabase 연동 가능)
    const reviews = JSON.parse(localStorage.getItem('reviews') || '[]')
    const updatedReviews = reviews.map(review => {
      if (review.id === reviewId) {
        const helpfulUsers = review.helpfulUsers || []
        const isHelpful = helpfulUsers.includes(user.id)
        
        return {
          ...review,
          helpfulUsers: isHelpful 
            ? helpfulUsers.filter(id => id !== user.id)
            : [...helpfulUsers, user.id],
          helpful_count: isHelpful 
            ? (review.helpful_count || 0) - 1
            : (review.helpful_count || 0) + 1
        }
      }
      return review
    })
    
    localStorage.setItem('reviews', JSON.stringify(updatedReviews))
    return true

  } catch (error) {
    console.error('리뷰 도움됨 토글 실패:', error)
    throw error
  }
}


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
      //    resetSupabaseClient() // 클라이언트 리셋
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
  const addOrder = async (orderData) => {
    console.log('🔧 addOrder 호출됨!')
    
    const supabaseClient = await getSupabase()
    console.log('🔧 supabaseClient 상태:', !!supabaseClient)
    console.log('🔧 user 상태:', !!user, user?.id)
    
    if (!supabaseClient || !user) {
      console.error('❌ supabase 또는 user 없음')
      throw new Error('로그인이 필요합니다.')
    }

    try {
      console.log('💾 주문 저장 시작:', orderData)

      const supabaseOrderData = {
        user_id: user.id,
        items: orderData.items,
        total_amount: orderData.totalAmount,
        status: orderData.status || 'pending',
        shipping_address: {
          name: orderData.shipping.name,
          phone: orderData.shipping.phone,
          email: orderData.shipping.email,
          address: orderData.shipping.address,
          detailAddress: orderData.shipping.detailAddress,
          zipCode: orderData.shipping.zipCode,
          memo: orderData.shipping.memo
        }
      }

      console.log('📦 Supabase 저장 데이터:', supabaseOrderData)
      console.log('📤 Supabase insert 호출 직전')
      
      const { data, error } = await supabaseClient
        .from('orders')
        .insert([supabaseOrderData])
        .select()
        .single()
      
      console.log('📥 Supabase 응답 - data:', data)
      console.log('📥 Supabase 응답 - error:', error)

      if (error) {
        console.error('🚨 주문 저장 실패:', error)
        throw error
      }

      console.log('✅ 주문 저장 성공:', data)

      try {
        const existingOrders = JSON.parse(localStorage.getItem('allOrders') || '[]')
        const updatedOrders = [...existingOrders, { ...orderData, supabaseId: data.id }]
        localStorage.setItem('allOrders', JSON.stringify(updatedOrders))
      } catch (storageError) {
        console.warn('localStorage 저장 실패:', storageError)
      }

      return data
    } catch (error) {
      console.error('💥 주문 추가 실패 상세:', error, error.message, error.code)
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
    addOrder,  // 이 줄 추가
    hasPurchasedProduct,    // 이 줄 추가
    hasReviewedProduct,     // 이 줄 추가
    addReview,           // 추가
    updateReview,        // 추가
    deleteReview,        // 추가
    toggleReviewHelpful, // 추가
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



// getAllOrders 함수도 Supabase 기반으로 수정
const getAllOrders = async () => {
  if (!supabase) {
    // Supabase가 없으면 localStorage 사용
    try {
      return JSON.parse(localStorage.getItem('allOrders') || '[]')
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('주문 조회 실패:', error)
      // 실패 시 localStorage 사용
      return JSON.parse(localStorage.getItem('allOrders') || '[]')
    }

    return data || []
  } catch (error) {
    console.error('주문 조회 중 오류:', error)
    return []
  }
}