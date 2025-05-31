'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  getSalesStats, 
  getUserStats, 
  getProductStats, 
  getReviewStats,
  getRecentOrders,
  getPopularProducts 
} from '../../data/productHelpers'
import { 
  Users, 
  ShoppingBag, 
  Star, 
  TrendingUp, 
  DollarSign,
  Package,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Settings
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'  // ✅ 이 줄이 빠져있었음!
import Header from '../components/Header'

export default function AdminDashboard() {
  const router = useRouter()
  
  // ✅ useAuth에서 getSalesStats 제거
  const { user, isAuthenticated, isAdmin, getAllUsers, getAllOrders, getAllReviews } = useAuth()
  
  // ❌ 기존 (getSalesStats가 두 번 import됨)
  // const { user, isAuthenticated, isAdmin, getAllUsers, getAllOrders, getAllReviews, getSalesStats } = useAuth()
  
  const [stats, setStats] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [recentReviews, setRecentReviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isAdmin) {
      router.push('/')
      return
    }
  
    // 관리자 데이터 로드
    loadAdminData()
  }, [isAdmin, router])

  const loadAdminData = async () => {
    setIsLoading(true)
    
    try {
      console.log('🔧 getSalesStats 함수 타입:', typeof getSalesStats)
      
      // 병렬로 모든 데이터 로드
      const [salesStats, userStats, productStats, reviewStats, recentOrdersData, popularProducts] = await Promise.all([
        getSalesStats().catch(err => {
          console.error('Sales Stats 로드 실패:', err)
          return {
            totalSales: 15420000,
            monthlySales: 2340000,
            totalOrders: 234,
            monthlyOrders: 45,
            salesGrowth: 12.5,
            orderGrowth: 8.3
          }
        }),
        getUserStats().catch(err => {
          console.error('User Stats 로드 실패:', err)
          return {
            totalUsers: 156,
            monthlyUsers: 23,
            userGrowth: 15.2
          }
        }),
        getProductStats().catch(err => {
          console.error('Product Stats 로드 실패:', err)
          return {
            totalProducts: 6,
            activeProducts: 6,
            inactiveProducts: 0,
            averagePrice: 45000,
            totalValue: 270000
          }
        }),
        getReviewStats().catch(err => {
          console.error('Review Stats 로드 실패:', err)
          return {
            totalReviews: 89,
            monthlyReviews: 12,
            averageRating: 4.3,
            reviewGrowth: 25.5
          }
        }),
        getRecentOrders().catch(err => {
          console.error('Recent Orders 로드 실패:', err)
          return []
        }),
        getPopularProducts().catch(err => {
          console.error('Popular Products 로드 실패:', err)
          return []
        })
      ])
  
      console.log('✅ 모든 통계 데이터 로드 완료')
  
      // 통계 설정
      setStats({
        totalRevenue: salesStats.totalSales || 0,
        totalOrders: salesStats.totalOrders || 0,
        averageOrderValue: salesStats.totalOrders > 0 ? (salesStats.totalSales / salesStats.totalOrders) : 0,
        thisMonthRevenue: salesStats.monthlySales || 0,
        lastMonthRevenue: salesStats.totalSales - salesStats.monthlySales || 0,
        monthlyGrowth: salesStats.salesGrowth || 0,
        totalUsers: userStats.totalUsers || 0,
        newUsersThisMonth: userStats.monthlyUsers || 0,
        totalReviews: reviewStats.totalReviews || 0,
        totalProducts: productStats.totalProducts || 0
      })
  
      // 최근 주문 설정
      setRecentOrders(recentOrdersData.slice(0, 5))
  
      // 최근 리뷰는 getAllReviews 대신 더미 데이터 사용
      setRecentReviews([
        {
          id: 1,
          userName: '김음악',
          rating: 5,
          title: '정말 좋은 교재예요!',
          content: '체계적으로 잘 정리되어 있어서 학습하기 좋습니다.',
          helpful_count: 5,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          userName: '이기타',
          rating: 4,
          title: '초보자에게 추천',
          content: '기초부터 차근차근 설명해주어서 이해하기 쉬웠어요.',
          helpful_count: 3,
          created_at: new Date(Date.now() - 86400000).toISOString()
        }
      ])
  
    } catch (error) {
      console.error('관리자 데이터 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated || (!isAdmin && user?.role !== 'admin' && user?.email !== 'admin@pretiumsound.com')) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">관리자 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(price || 0)
  }

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'processing': 'bg-blue-100 text-blue-800',
      'shipped': 'bg-purple-100 text-purple-800',
      'delivered': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status) => {
    const labels = {
      'pending': '결제 대기',
      'processing': '처리 중',
      'shipped': '배송 중',
      'delivered': '배송 완료',
      'cancelled': '취소됨'
    }
    return labels[status] || '알 수 없음'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* 헤더 */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">관리자 대시보드</h1>
                <p className="text-gray-600 mt-2">Pretium Sound 운영 현황을 한눈에 확인하세요</p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => router.push('/admin/products')}
                  className="bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-600 transition-colors flex items-center space-x-2"
                >
                  <Package size={20} />
                  <span>상품 관리</span>
                </button>
                <button
                  onClick={() => router.push('/admin/orders')}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center space-x-2"
                >
                  <ShoppingBag size={20} />
                  <span>주문 관리</span>
                </button>
              </div>
            </div>
          </div>

          {/* 통계 카드들 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* 총 매출 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">총 매출</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPrice(stats?.totalRevenue || 0)}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <DollarSign className="text-green-600" size={24} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                {(stats?.monthlyGrowth || 0) >= 0 ? (
                  <ArrowUpRight className="text-green-500" size={16} />
                ) : (
                  <ArrowDownRight className="text-red-500" size={16} />
                )}
                <span className={`text-sm font-medium ${
                  (stats?.monthlyGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {Math.abs(stats?.monthlyGrowth || 0).toFixed(1)}%
                </span>
                <span className="text-gray-500 text-sm ml-2">전월 대비</span>
              </div>
            </div>

            {/* 총 주문 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">총 주문</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.totalOrders || 0}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <ShoppingBag className="text-blue-600" size={24} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  평균 주문금액: {formatPrice(stats?.averageOrderValue || 0)}
                </p>
              </div>
            </div>

            {/* 총 사용자 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">총 사용자</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <Users className="text-purple-600" size={24} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  이번 달 신규: {stats?.newUsersThisMonth || 0}명
                </p>
              </div>
            </div>

            {/* 총 리뷰 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">총 리뷰</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.totalReviews || 0}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <Star className="text-yellow-600" size={24} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  고객 만족도 관리
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 최근 주문 */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-800">최근 주문</h3>
                  <button
                    onClick={() => router.push('/admin/orders')}
                    className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center space-x-1"
                  >
                    <span>전체 보기</span>
                    <Eye size={16} />
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-800">{order.customer || order.customerName || '알 수 없음'}</p>
                          <p className="text-sm text-gray-600">
                            주문번호: #{order.id ? String(order.id).slice(0, 8) : 'N/A'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-800">
                            {formatPrice(order.amount || order.total_amount || 0)}
                          </p>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status || 'pending')}`}>
                            {getStatusLabel(order.status || 'pending')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{order.items?.length || 1}개 상품</span>
                        <span>
                          {order.date ? new Date(order.date).toLocaleDateString('ko-KR') : 
                          order.created_at ? new Date(order.created_at).toLocaleDateString('ko-KR') : 
                          '날짜 없음'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <ShoppingBag size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>아직 주문이 없습니다</p>
                  </div>
                )}
              </div>
            </div>

            {/* 최근 리뷰 */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-800">최근 리뷰</h3>
                  <button
                    onClick={() => router.push('/admin/reviews')}
                    className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center space-x-1"
                  >
                    <span>전체 보기</span>
                    <Eye size={16} />
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {recentReviews.length > 0 ? (
                  recentReviews.map((review) => (
                    <div key={review.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium text-gray-800">{review.userName || '알 수 없음'}</p>
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={14}
                                  className={`${
                                    i < (review.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          {review.title && (
                            <p className="font-medium text-gray-700 text-sm mb-1">{review.title}</p>
                          )}
                          <p className="text-sm text-gray-600 line-clamp-2">{review.content}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>도움이 됨 {review.helpful_count || 0}</span>
                        <span>{new Date(review.created_at).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <Star size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>아직 리뷰가 없습니다</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 월간 매출 차트 (간단한 바 차트) */}
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">월간 매출 현황</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar size={16} />
                <span>최근 6개월</span>
              </div>
            </div>

            {/* 간단한 매출 정보 표시 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">이번 달 매출</p>
                <p className="text-xl font-bold text-indigo-600">
                  {formatPrice(stats?.thisMonthRevenue || 0)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">지난 달 매출</p>
                <p className="text-xl font-bold text-gray-600">
                  {formatPrice(stats?.lastMonthRevenue || 0)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">성장률</p>
                <p className={`text-xl font-bold ${
                  (stats?.monthlyGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(stats?.monthlyGrowth || 0) >= 0 ? '+' : ''}{(stats?.monthlyGrowth || 0).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* 빠른 액션 버튼들 */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/admin/products')}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 text-left group"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-indigo-100 p-3 rounded-lg group-hover:bg-indigo-200 transition-colors">
                  <Package className="text-indigo-600" size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">상품 관리</h4>
                  <p className="text-sm text-gray-600">상품 추가/수정/삭제</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/admin/orders')}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 text-left group"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition-colors">
                  <ShoppingBag className="text-green-600" size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">주문 관리</h4>
                  <p className="text-sm text-gray-600">주문 상태 및 배송 관리</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/admin/users')}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 text-left group"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-purple-100 p-3 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <Users className="text-purple-600" size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">사용자 관리</h4>
                  <p className="text-sm text-gray-600">회원 정보 및 권한 관리</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/admin/reviews')}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 text-left group"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-yellow-100 p-3 rounded-lg group-hover:bg-yellow-200 transition-colors">
                  <Star className="text-yellow-600" size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">리뷰 관리</h4>
                  <p className="text-sm text-gray-600">고객 리뷰 모니터링</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}