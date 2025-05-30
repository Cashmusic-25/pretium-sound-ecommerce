'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // 관리자 계정 초기화
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
      
      // 관리자 계정이 없으면 생성
      const adminExists = existingUsers.find(u => u.role === 'admin')
      if (!adminExists) {
        const adminUser = {
          id: 999999,
          name: '관리자',
          email: 'admin@pretiumsound.com',
          password: 'admin123',
          role: 'admin',
          joinDate: new Date().toISOString(),
          avatar: null,
          wishlist: [],
          orders: [],
          reviews: []
        }
        
        existingUsers.push(adminUser)
        localStorage.setItem('users', JSON.stringify(existingUsers))
        console.log('🔑 관리자 계정 생성: admin@pretiumsound.com / admin123')
      }
    }
  }, [])

  // 로컬 스토리지에서 사용자 정보 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser))
        } catch (error) {
          console.error('사용자 정보 로드 실패:', error)
          localStorage.removeItem('user')
        }
      }
      setIsLoading(false)
    }
  }, [])

  // 사용자 정보가 변경될 때마다 로컬 스토리지에 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user))
      } else {
        localStorage.removeItem('user')
      }
    }
  }, [user])

  // 회원가입
  const signup = async (userData) => {
    setIsLoading(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
      const existingUser = existingUsers.find(u => u.email === userData.email)
      
      if (existingUser) {
        throw new Error('이미 등록된 이메일입니다.')
      }
      
      const newUser = {
        id: Date.now(),
        name: userData.name,
        email: userData.email,
        role: 'user', // 기본 사용자
        joinDate: new Date().toISOString(),
        avatar: null,
        wishlist: [],
        orders: [],
        reviews: []
      }
      
      existingUsers.push({ ...newUser, password: userData.password })
      localStorage.setItem('users', JSON.stringify(existingUsers))
      
      setUser(newUser)
      
      return { success: true, user: newUser }
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
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
      const foundUser = existingUsers.find(u => u.email === email && u.password === password)
      
      if (!foundUser) {
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
      }
      
      const { password: _, ...userWithoutPassword } = foundUser
      
      setUser(userWithoutPassword)
      
      // 관리자 로그인 시 알림
      if (foundUser.role === 'admin') {
        console.log('🛡️ 관리자로 로그인되었습니다.')
      }
      
      return { success: true, user: userWithoutPassword }
    } catch (error) {
      throw new Error(error.message || '로그인에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 로그아웃
  const logout = () => {
    setUser(null)
  }

  // 사용자 정보 업데이트
  const updateUser = (updatedData) => {
    if (user) {
      const updatedUser = { ...user, ...updatedData }
      setUser(updatedUser)
      
      const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
      const userIndex = existingUsers.findIndex(u => u.id === user.id)
      if (userIndex !== -1) {
        existingUsers[userIndex] = { ...existingUsers[userIndex], ...updatedData }
        localStorage.setItem('users', JSON.stringify(existingUsers))
      }
    }
  }

  // 위시리스트에 상품 추가/제거
  const toggleWishlist = (productId) => {
    if (!user) return false
    
    const currentWishlist = user.wishlist || []
    const isInWishlist = currentWishlist.includes(productId)
    
    let newWishlist
    if (isInWishlist) {
      newWishlist = currentWishlist.filter(id => id !== productId)
    } else {
      newWishlist = [...currentWishlist, productId]
    }
    
    updateUser({ wishlist: newWishlist })
    return !isInWishlist
  }

  // 주문 추가
  const addOrder = (orderData) => {
    if (!user) return
    
    const newOrder = {
      id: Date.now(),
      ...orderData,
      orderDate: new Date().toISOString(),
      status: 'processing'
    }
    
    const currentOrders = user.orders || []
    updateUser({ orders: [...currentOrders, newOrder] })
    
    return newOrder
  }

  // 사용자가 특정 상품을 구매했는지 확인
  const hasPurchasedProduct = (productId) => {
    if (!user || !user.orders) return false
    
    return user.orders.some(order => 
      order.items && order.items.some(item => item.id === productId)
    )
  }

  // 사용자가 특정 상품에 리뷰를 작성했는지 확인
  const hasReviewedProduct = (productId) => {
    if (!user || !user.reviews) return false
    
    return user.reviews.some(review => review.productId === productId)
  }

  // 리뷰 추가
  const addReview = (reviewData) => {
    if (!user) return null
    
    if (!hasPurchasedProduct(reviewData.productId)) {
      throw new Error('구매한 상품만 리뷰를 작성할 수 있습니다.')
    }
    
    if (hasReviewedProduct(reviewData.productId)) {
      throw new Error('이미 이 상품에 리뷰를 작성하셨습니다.')
    }
    
    const newReview = {
      ...reviewData,
      id: Date.now(),
      userId: user.id,
      userName: user.name,
      createdAt: new Date().toISOString(),
      helpful: 0,
      helpfulUsers: [],
      verified: true
    }
    
    const currentReviews = user.reviews || []
    updateUser({ reviews: [...currentReviews, newReview] })
    
    const allReviews = JSON.parse(localStorage.getItem('reviews') || '[]')
    allReviews.push(newReview)
    localStorage.setItem('reviews', JSON.stringify(allReviews))
    
    return newReview
  }

  // 리뷰 수정
  const updateReview = (reviewId, updatedData) => {
    if (!user) return null
    
    const reviewIndex = user.reviews.findIndex(review => review.id === reviewId)
    if (reviewIndex === -1) {
      throw new Error('리뷰를 찾을 수 없습니다.')
    }
    
    const updatedReviews = [...user.reviews]
    updatedReviews[reviewIndex] = {
      ...updatedReviews[reviewIndex],
      ...updatedData,
      updatedAt: new Date().toISOString()
    }
    
    updateUser({ reviews: updatedReviews })
    
    const allReviews = JSON.parse(localStorage.getItem('reviews') || '[]')
    const globalReviewIndex = allReviews.findIndex(review => review.id === reviewId)
    if (globalReviewIndex !== -1) {
      allReviews[globalReviewIndex] = updatedReviews[reviewIndex]
      localStorage.setItem('reviews', JSON.stringify(allReviews))
    }
    
    return updatedReviews[reviewIndex]
  }

  // 리뷰 삭제
  const deleteReview = (reviewId) => {
    if (!user) return false
    
    const updatedReviews = user.reviews.filter(review => review.id !== reviewId)
    updateUser({ reviews: updatedReviews })
    
    const allReviews = JSON.parse(localStorage.getItem('reviews') || '[]')
    const filteredReviews = allReviews.filter(review => review.id !== reviewId)
    localStorage.setItem('reviews', JSON.stringify(filteredReviews))
    
    return true
  }

  // 리뷰 도움이 됨 토글
  const toggleReviewHelpful = (reviewId) => {
    if (!user) return false
    
    const allReviews = JSON.parse(localStorage.getItem('reviews') || '[]')
    const reviewIndex = allReviews.findIndex(review => review.id === reviewId)
    
    if (reviewIndex === -1) return false
    
    const review = allReviews[reviewIndex]
    const helpfulUsers = review.helpfulUsers || []
    const hasVoted = helpfulUsers.includes(user.id)
    
    if (hasVoted) {
      review.helpful = Math.max(0, review.helpful - 1)
      review.helpfulUsers = helpfulUsers.filter(userId => userId !== user.id)
    } else {
      review.helpful = (review.helpful || 0) + 1
      review.helpfulUsers = [...helpfulUsers, user.id]
    }
    
    allReviews[reviewIndex] = review
    localStorage.setItem('reviews', JSON.stringify(allReviews))
    
    return !hasVoted
  }

  // ==================== 관리자 전용 기능들 ====================

  // 관리자 권한 확인
  const isAdmin = () => {
    return user?.role === 'admin'
  }

  // 모든 사용자 조회 (관리자 전용)
  const getAllUsers = () => {
    if (!isAdmin()) return []
    
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]')
    return allUsers.map(({ password, ...user }) => user) // 비밀번호 제외
  }

  // 모든 주문 조회 (관리자 전용)
  const getAllOrders = () => {
    if (!isAdmin()) return []
    
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]')
    const allOrders = []
    
    allUsers.forEach(user => {
      if (user.orders) {
        user.orders.forEach(order => {
          allOrders.push({
            ...order,
            customerName: user.name,
            customerEmail: user.email,
            customerId: user.id
          })
        })
      }
    })
    
    return allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  // 모든 리뷰 조회 (관리자 전용)
  const getAllReviews = () => {
    if (!isAdmin()) return []
    
    return JSON.parse(localStorage.getItem('reviews') || '[]')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  // 사용자 상태 변경 (관리자 전용)
  const updateUserStatus = (userId, status) => {
    if (!isAdmin()) return false
    
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]')
    const userIndex = allUsers.findIndex(u => u.id === userId)
    
    if (userIndex !== -1) {
      allUsers[userIndex].status = status
      localStorage.setItem('users', JSON.stringify(allUsers))
      return true
    }
    
    return false
  }

  // 주문 상태 변경 (관리자 전용)
  const updateOrderStatus = (orderId, newStatus) => {
    if (!isAdmin()) return false
    
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]')
    let orderFound = false
    
    allUsers.forEach(user => {
      if (user.orders) {
        const orderIndex = user.orders.findIndex(order => order.id === orderId)
        if (orderIndex !== -1) {
          user.orders[orderIndex].status = newStatus
          user.orders[orderIndex].updatedAt = new Date().toISOString()
          orderFound = true
        }
      }
    })
    
    if (orderFound) {
      localStorage.setItem('users', JSON.stringify(allUsers))
    }
    
    return orderFound
  }

  // 리뷰 삭제 (관리자 전용)
  const adminDeleteReview = (reviewId) => {
    if (!isAdmin()) return false
    
    // 전역 리뷰에서 삭제
    const allReviews = JSON.parse(localStorage.getItem('reviews') || '[]')
    const filteredReviews = allReviews.filter(review => review.id !== reviewId)
    localStorage.setItem('reviews', JSON.stringify(filteredReviews))
    
    // 사용자 리뷰에서도 삭제
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]')
    allUsers.forEach(user => {
      if (user.reviews) {
        user.reviews = user.reviews.filter(review => review.id !== reviewId)
      }
    })
    localStorage.setItem('users', JSON.stringify(allUsers))
    
    return true
  }

  // 매출 통계 (관리자 전용)
  const getSalesStats = () => {
    if (!isAdmin()) return null
    
    const allOrders = getAllOrders()
    const today = new Date()
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    
    // 이번 달 매출
    const thisMonthOrders = allOrders.filter(order => 
      new Date(order.createdAt) >= thisMonth
    )
    const thisMonthRevenue = thisMonthOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    
    // 지난 달 매출
    const lastMonthOrders = allOrders.filter(order => {
      const orderDate = new Date(order.createdAt)
      return orderDate >= lastMonth && orderDate < thisMonth
    })
    const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    
    // 전체 통계
    const totalOrders = allOrders.length
    const totalRevenue = allOrders.reduce((sum, order) => sum + order.totalAmount, 0)
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
    addOrder,
    hasPurchasedProduct,
    hasReviewedProduct,
    addReview,
    updateReview,
    deleteReview,
    toggleReviewHelpful,
    // 관리자 전용 기능들
    getAllUsers,
    getAllOrders,
    getAllReviews,
    updateUserStatus,
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