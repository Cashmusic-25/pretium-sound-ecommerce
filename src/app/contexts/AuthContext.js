'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 초기 세션 확인
    getInitialSession()

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        if (session?.user) {
          // 데이터베이스 연결 시도, 실패해도 기본 사용자 정보 설정
          setUser({
            ...session.user,
            name: session.user.user_metadata?.name || session.user.email.split('@')[0],
            role: session.user.email === 'admin@pretiumsound.com' ? 'admin' : 'user',
            orders: [],
            reviews: [],
            wishlist: []
          })
          
          // 백그라운드에서 데이터베이스 연결 시도
          loadUserProfileSafely(session.user)
        } else {
          setUser(null)
        }
        setIsLoading(false)
      }
    )

    return () => subscription?.unsubscribe()
  }, [])

  const getInitialSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // 기본 사용자 정보 먼저 설정
        setUser({
          ...session.user,
          name: session.user.user_metadata?.name || session.user.email.split('@')[0],
          role: session.user.email === 'admin@pretiumsound.com' ? 'admin' : 'user',
          orders: [],
          reviews: [],
          wishlist: []
        })
        
        // 백그라운드에서 데이터베이스 연결 시도
        loadUserProfileSafely(session.user)
      }
    } catch (error) {
      console.error('Error getting session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadUserProfileSafely = async (authUser) => {
    try {
      console.log('Attempting to load user profile for:', authUser.id)
      
      // users 테이블에서 추가 정보 조회 시도
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error) {
        console.log('User profile not found, error:', error.code, error.message)
        
        // 사용자가 users 테이블에 없으면 생성 시도
        if (error.code === 'PGRST116') {
          console.log('Creating new user profile...')
          
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([
              {
                id: authUser.id,
                email: authUser.email,
                name: authUser.user_metadata?.name || authUser.email.split('@')[0],
                role: authUser.email === 'admin@pretiumsound.com' ? 'admin' : 'user'
              }
            ])
            .select()
            .single()

          if (insertError) {
            console.warn('Could not create user profile:', insertError.message)
            return // 실패해도 기본 정보는 이미 설정됨
          }
          
          console.log('User profile created successfully')
          // 사용자 정보 업데이트
          setUser(prevUser => ({
            ...prevUser,
            ...newUser,
            wishlist: newUser.wishlist || []
          }))
          return
        }

        console.warn('Database connection issue, using auth data only')
        return // 기본 정보로 계속 진행
      }

      console.log('User profile loaded successfully')
      
      // 주문과 리뷰 정보도 로드 시도 (선택적)
      try {
        const [ordersData, reviewsData] = await Promise.all([
          supabase.from('orders').select('*').eq('user_id', authUser.id),
          supabase.from('reviews').select('*').eq('user_id', authUser.id)
        ])

        setUser(prevUser => ({
          ...prevUser,
          ...data,
          orders: ordersData.data || [],
          reviews: reviewsData.data || [],
          wishlist: data.wishlist || []
        }))
      } catch (relatedError) {
        console.warn('Could not load orders/reviews:', relatedError.message)
        // 기본 사용자 정보는 이미 설정되어 있으므로 계속 진행
        setUser(prevUser => ({
          ...prevUser,
          ...data,
          wishlist: data.wishlist || []
        }))
      }
      
    } catch (error) {
      console.warn('Profile loading failed, using basic auth data:', error.message)
      // 에러가 발생해도 기본 사용자 정보는 이미 설정되어 있음
    }
  }

  // 회원가입
  const signup = async (userData) => {
    setIsLoading(true)
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name
          },
          // 이메일 인증 건너뛰기 설정
          emailRedirectTo: undefined
        }
      })

      if (authError) {
        // 특정 에러 메시지들을 한국어로 변환
        const errorMessages = {
          'User already registered': '이미 가입된 이메일입니다. 로그인을 시도해보세요.',
          'Invalid email': '올바른 이메일 형식을 입력해주세요.',
          'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.'
        }
        
        const errorMessage = errorMessages[authError.message] || authError.message
        throw new Error(errorMessage)
      }

      // 이메일 확인이 필요한 경우 (이메일 인증이 활성화된 경우)
      if (!authData.session && authData.user && !authData.user.email_confirmed_at) {
        // 개발 환경에서는 경고만 표시하고 성공으로 처리
        console.warn('이메일 인증이 필요하지만 개발 환경에서는 건너뜁니다.')
        return { 
          success: true, 
          user: authData.user,
          message: '회원가입이 완료되었습니다. 이메일 인증이 필요할 수 있습니다.'
        }
      }

      return { success: true, user: authData.user }
    } catch (error) {
      throw new Error(error.message || '회원가입에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 로그인
  const login = async (email, password) => {
    setIsLoading(true)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        const errorMessages = {
          'Invalid login credentials': '이메일 또는 비밀번호가 잘못되었습니다.',
          'Email not confirmed': '이메일 인증이 필요합니다. 메일함을 확인해주세요.',
          'Too many requests': '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.'
        }
        
        const errorMessage = errorMessages[error.message] || error.message
        throw new Error(errorMessage)
      }

      return { success: true, user: data.user }
    } catch (error) {
      throw new Error(error.message || '로그인에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 로그아웃
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // 사용자 정보 업데이트
  const updateUser = async (updatedData) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('users')
        .update(updatedData)
        .eq('id', user.id)

      if (error) throw error

      setUser({ ...user, ...updatedData })
    } catch (error) {
      console.warn('Could not update user in database:', error.message)
      // 데이터베이스 업데이트 실패해도 로컬 상태는 업데이트
      setUser({ ...user, ...updatedData })
    }
  }

  // 위시리스트 토글
  const toggleWishlist = async (productId) => {
    if (!user) return false
    
    const currentWishlist = user.wishlist || []
    const isInWishlist = currentWishlist.includes(productId)
    
    let newWishlist
    if (isInWishlist) {
      newWishlist = currentWishlist.filter(id => id !== productId)
    } else {
      newWishlist = [...currentWishlist, productId]
    }

    // 로컬 상태 먼저 업데이트
    setUser({ ...user, wishlist: newWishlist })

    // 데이터베이스 업데이트 시도 (실패해도 로컬 상태는 유지)
    try {
      const { error } = await supabase
        .from('users')
        .update({ wishlist: newWishlist })
        .eq('id', user.id)

      if (error) {
        console.warn('Could not update wishlist in database:', error.message)
      }
    } catch (error) {
      console.warn('Wishlist update failed:', error.message)
    }

    return !isInWishlist
  }

  // ==================== 관리자 전용 기능들 ====================

  // 관리자 권한 확인
  const isAdmin = () => {
    return user?.role === 'admin' || user?.email === 'admin@pretiumsound.com'
  }

  // 모든 사용자 조회 (관리자 전용)
  const getAllUsers = async () => {
    if (!isAdmin()) {
      console.log('관리자 권한이 없습니다')
      return []
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('사용자 조회 에러:', error)
        return []
      }
      
      console.log('사용자 조회 성공:', data)
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Error fetching users:', error)
      return []
    }
  }

  // 모든 주문 조회 (관리자 전용)
  const getAllOrders = async () => {
    if (!isAdmin()) {
      console.log('관리자 권한이 없습니다')
      return []
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          users (name, email)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('주문 조회 에러:', error)
        return []
      }

      console.log('주문 조회 성공:', data)
      // 데이터 형식 변환
      const orders = Array.isArray(data) ? data.map(order => ({
        ...order,
        customerName: order.users?.name,
        customerEmail: order.users?.email,
        customerId: order.user_id
      })) : []
      
      return orders
    } catch (error) {
      console.error('Error fetching orders:', error)
      return []
    }
  }

  // 모든 리뷰 조회 (관리자 전용)
  const getAllReviews = async () => {
    if (!isAdmin()) {
      console.log('관리자 권한이 없습니다')
      return []
    }

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          users (name, email)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('리뷰 조회 에러:', error)
        return []
      }

      console.log('리뷰 조회 성공:', data)
      // 데이터 형식 변환
      const reviews = Array.isArray(data) ? data.map(review => ({
        ...review,
        userName: review.users?.name,
        userEmail: review.users?.email
      })) : []
      
      return reviews
    } catch (error) {
      console.error('Error fetching reviews:', error)
      return []
    }
  }

  // 주문 상태 변경 (관리자 전용)
  const updateOrderStatus = async (orderId, newStatus) => {
    if (!isAdmin()) return false

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating order status:', error)
      return false
    }
  }

  // 리뷰 삭제 (관리자 전용)
  const adminDeleteReview = async (reviewId) => {
    if (!isAdmin()) return false

    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting review:', error)
      return false
    }
  }

  // 매출 통계 (관리자 전용)
  const getSalesStats = async () => {
    if (!isAdmin()) return null

    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('total_amount, created_at, status')

      if (error) throw error

      const today = new Date()
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)

      // 이번 달 매출
      const thisMonthOrders = orders?.filter(order => 
        new Date(order.created_at) >= thisMonth
      ) || []
      const thisMonthRevenue = thisMonthOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)

      // 지난 달 매출
      const lastMonthOrders = orders?.filter(order => {
        const orderDate = new Date(order.created_at)
        return orderDate >= lastMonth && orderDate < thisMonth
      }) || []
      const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)

      // 전체 통계
      const totalOrders = orders?.length || 0
      const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

      return {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        thisMonthRevenue,
        lastMonthRevenue,
        monthlyGrowth: lastMonthRevenue > 0 
          ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
          : 0
      }
    } catch (error) {
      console.error('Error fetching sales stats:', error)
      // 에러 발생시 기본값 반환
      return {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        thisMonthRevenue: 0,
        lastMonthRevenue: 0,
        monthlyGrowth: 0
      }
    }
  }

  // 구매 확인
  const hasPurchasedProduct = (productId) => {
    if (!user || !user.orders) return false
    
    return user.orders.some(order => 
      order.status === 'delivered' &&
      order.items && 
      order.items.some(item => item.id === productId)
    )
  }

  // 리뷰 작성 여부 확인
  const hasReviewedProduct = (productId) => {
    if (!user || !user.reviews) return false
    return user.reviews.some(review => review.product_id === productId)
  }

  // 리뷰 추가
  const addReview = async (reviewData) => {
    if (!user) return null

    if (!hasPurchasedProduct(reviewData.product_id)) {
      throw new Error('구매한 상품만 리뷰를 작성할 수 있습니다.')
    }

    if (hasReviewedProduct(reviewData.product_id)) {
      throw new Error('이미 이 상품에 리뷰를 작성하셨습니다.')
    }

    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert([
          {
            ...reviewData,
            user_id: user.id,
            verified: true
          }
        ])
        .select()
        .single()

      if (error) throw error

      // 사용자 리뷰 목록 업데이트
      const updatedReviews = [...(user.reviews || []), data]
      setUser({ ...user, reviews: updatedReviews })

      return data
    } catch (error) {
      console.error('Error creating review:', error)
      throw error
    }
  }

  // 주문 추가
  const addOrder = async (orderData) => {
    if (!user) return null

    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([
          {
            ...orderData,
            user_id: user.id
          }
        ])
        .select()
        .single()

      if (error) throw error

      // 사용자 주문 목록 업데이트
      const updatedOrders = [...(user.orders || []), data]
      setUser({ ...user, orders: updatedOrders })

      return data
    } catch (error) {
      console.error('Error creating order:', error)
      throw error
    }
  }

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: isAdmin(),
    signup,
    login,
    logout,
    updateUser,
    toggleWishlist,
    hasPurchasedProduct,
    hasReviewedProduct,
    addReview,
    addOrder,
    // 관리자 전용 기능들
    getAllUsers,
    getAllOrders,
    getAllReviews,
    updateOrderStatus,
    adminDeleteReview,
    getSalesStats
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth는 AuthProvider 내부에서 사용되어야 합니다')
  }
  return context
}