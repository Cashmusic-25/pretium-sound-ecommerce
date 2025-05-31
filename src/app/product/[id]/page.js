'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShoppingCart, Heart, Star, Plus, Minus, Play, Download, Book, Award, Users, Clock } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'
import { useAuth } from '../../contexts/AuthContext'
import { getVisibleProductById } from '../../../data/productHelpers'
import Header from '../../components/Header'
import StarRating from '../../components/StarRating'
import ReviewModal from '../../components/ReviewModal'

export default function ProductPage({ params }) {
  const router = useRouter()
  const { addToCart } = useCart()
  const { user, isAuthenticated, toggleWishlist, hasPurchasedProduct, hasReviewedProduct, addReview, updateReview, deleteReview, toggleReviewHelpful } = useAuth()
  
  // Next.js 15에서 params는 Promise이므로 use()로 unwrap
  const resolvedParams = use(params)
  
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState('description')
  const [reviews, setReviews] = useState([])
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [reviewFilter, setReviewFilter] = useState('all')
  const [reviewSort, setReviewSort] = useState('newest')

  useEffect(() => {
    if (resolvedParams?.id) {
      loadProduct()
    }
  }, [resolvedParams?.id])

  useEffect(() => {
    if (product) {
      loadReviews()
    }
  }, [product])

  const loadProduct = async () => {  // ✅ async 추가
    setLoading(true)
    setError(null)
    
    try {
      const productData = await getVisibleProductById(resolvedParams.id)  // ✅ await 추가
      if (!productData) {
        setError('상품을 찾을 수 없습니다.')
        return
      }
      setProduct(productData)
    } catch (err) {
      setError('상품을 불러오는데 실패했습니다.')
      console.error('Product loading error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadReviews = () => {
    if (typeof window !== 'undefined') {
      try {
        const allReviews = JSON.parse(localStorage.getItem('reviews') || '[]')
        const productReviews = allReviews.filter(review => review.productId === product.id)
        
        // 기본 상품의 리뷰도 포함
        const defaultReviews = product.reviews || []
        
        const combinedReviews = [...defaultReviews, ...productReviews]
        setReviews(combinedReviews)
      } catch (error) {
        console.warn('리뷰 로드 실패:', error)
        setReviews(product.reviews || [])
      }
    }
  }

  const handleAddToCart = () => {
    if (!product) return
    
    try {
      addToCart({ 
        ...product, 
        quantity,
        id: product.id,
        title: product.title,
        price: product.price,
        category: product.category,
        icon: product.icon
      })
      alert('장바구니에 추가되었습니다!')
    } catch (error) {
      console.error('장바구니 추가 실패:', error)
      alert('장바구니 추가에 실패했습니다.')
    }
  }

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      alert('로그인이 필요한 서비스입니다.')
      return
    }
    
    try {
      await toggleWishlist(product.id)
    } catch (error) {
      console.error('위시리스트 토글 실패:', error)
      alert('위시리스트 업데이트에 실패했습니다.')
    }
  }

  const handleReviewSubmit = async (reviewData, isEdit = false) => {
    try {
      if (isEdit && editingReview) {
        await updateReview(editingReview.id, reviewData)
      } else {
        await addReview({
          ...reviewData,
          product_id: product.id,
          productId: product.id // localStorage용 호환성
        })
      }
      loadReviews()
      setIsReviewModalOpen(false)
      setEditingReview(null)
      alert(isEdit ? '리뷰가 수정되었습니다!' : '리뷰가 작성되었습니다!')
    } catch (error) {
      console.error('리뷰 처리 실패:', error)
      throw new Error(error.message || (isEdit ? '리뷰 수정에 실패했습니다.' : '리뷰 작성에 실패했습니다.'))
    }
  }

  const handleReviewEdit = (review) => {
    setEditingReview(review)
    setIsReviewModalOpen(true)
  }

  const handleReviewDelete = async (reviewId) => {
    if (!window.confirm('리뷰를 삭제하시겠습니까?')) return
    
    try {
      await deleteReview(reviewId)
      loadReviews()
      alert('리뷰가 삭제되었습니다.')
    } catch (error) {
      console.error('리뷰 삭제 실패:', error)
      alert('리뷰 삭제에 실패했습니다.')
    }
  }

  const handleReviewHelpful = async (reviewId) => {
    if (!isAuthenticated) {
      alert('로그인이 필요한 서비스입니다.')
      return
    }
    
    try {
      await toggleReviewHelpful(reviewId)
      loadReviews()
    } catch (error) {
      console.error('리뷰 도움됨 토글 실패:', error)
    }
  }

  const getFilteredReviews = () => {
    let filtered = [...reviews]

    // 평점 필터
    if (reviewFilter !== 'all') {
      filtered = filtered.filter(review => review.rating === parseInt(reviewFilter))
    }

    // 정렬
    switch (reviewSort) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt || b.created_at || Date.now()) - new Date(a.createdAt || a.created_at || Date.now()))
        break
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt || a.created_at || Date.now()) - new Date(b.createdAt || b.created_at || Date.now()))
        break
      case 'rating-high':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0))
        break
      case 'rating-low':
        filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0))
        break
      case 'helpful':
        filtered.sort((a, b) => (b.helpful_count || b.helpful || 0) - (a.helpful_count || a.helpful || 0))
        break
      default:
        break
    }

    return filtered
  }

  const getRatingStats = () => {
    if (reviews.length === 0) {
      return {
        average: 0,
        total: 0,
        distribution: [0, 0, 0, 0, 0]
      }
    }

    const total = reviews.length
    const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0)
    const average = total > 0 ? sum / total : 0

    const distribution = [0, 0, 0, 0, 0]
    reviews.forEach(review => {
      const rating = review.rating || 0
      if (rating >= 1 && rating <= 5) {
        distribution[rating - 1]++
      }
    })

    return { average, total, distribution }
  }

  const formatPrice = (price) => {
    if (!price) return '₩0'
    if (typeof price === 'string') return price
    return `₩${price.toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-24 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">상품을 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-24 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              {error || '상품을 찾을 수 없습니다'}
            </h1>
            <p className="text-gray-600 mb-6">
              요청하신 상품이 존재하지 않거나 삭제되었을 수 있습니다.
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isInWishlist = user?.wishlist?.includes(product.id) || false
  const isPurchased = hasPurchasedProduct && hasPurchasedProduct(product.id)
  const hasReviewed = hasReviewedProduct && hasReviewedProduct(product.id)
  const ratingStats = getRatingStats()
  const filteredReviews = getFilteredReviews()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* 뒤로가기 */}
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 mb-8 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>뒤로가기</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            {/* 왼쪽: 상품 이미지 */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
                <div className="aspect-square">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 h-full flex items-center justify-center text-white text-8xl">
                      {product.icon}
                    </div>
                  )}
                </div>
              </div>

              {/* 상품 뱃지들 */}
              <div className="flex flex-wrap gap-3">
                <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                  {product.category}
                </span>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  베스트셀러
                </span>
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                  무료배송
                </span>
                {isPurchased && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    구매완료
                  </span>
                )}
              </div>
            </div>

            {/* 오른쪽: 상품 정보 */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {product.title}
                </h1>
                <p className="text-gray-600 text-lg leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* 평점 */}
              <div className="flex items-center space-x-4">
                <StarRating rating={ratingStats.average} size={20} />
                <span className="text-lg font-medium text-gray-800">
                  {ratingStats.average.toFixed(1)}
                </span>
                <span className="text-gray-500">
                  ({ratingStats.total}개 리뷰)
                </span>
              </div>

              {/* 가격 */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-3xl font-bold text-indigo-600">
                    {formatPrice(product.price)}
                  </span>
                </div>

                {/* 수량 선택 */}
                <div className="flex items-center space-x-4 mb-6">
                  <span className="text-gray-700 font-medium">수량:</span>
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 hover:bg-gray-100 transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="px-4 py-2 font-medium">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-2 hover:bg-gray-100 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* 액션 버튼들 */}
                <div className="space-y-4">
                  <button
                    onClick={handleAddToCart}
                    className="w-full bg-indigo-600 text-white py-4 px-6 rounded-xl hover:bg-indigo-700 transition-colors font-semibold text-lg flex items-center justify-center space-x-2"
                  >
                    <ShoppingCart size={20} />
                    <span>장바구니에 추가</span>
                  </button>
                  
                  <button
                    onClick={handleWishlistToggle}
                    className={`w-full py-3 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2 ${
                      isInWishlist
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Heart size={20} fill={isInWishlist ? 'currentColor' : 'none'} />
                    <span>{isInWishlist ? '위시리스트에서 제거' : '위시리스트에 추가'}</span>
                  </button>
                </div>
              </div>

              {/* 빠른 정보 */}
              {product.specifications && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold mb-4">상품 정보</h3>
                  <div className="space-y-2 text-sm">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600">{key}:</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="border-b border-gray-200">
              <div className="flex">
                {[
                  { id: 'description', label: '상세정보', icon: <Book size={20} /> },
                  { id: 'features', label: '주요특징', icon: <Award size={20} /> },
                  { id: 'contents', label: '목차', icon: <Users size={20} /> },
                  { id: 'reviews', label: `리뷰 (${ratingStats.total})`, icon: <Star size={20} /> }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-6 py-4 font-semibold transition-colors ${
                      activeTab === tab.id
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-8">
              {/* 상세정보 탭 */}
              {activeTab === 'description' && (
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed text-lg">
                    {product.detailedDescription || product.description || '이 교재는 음악 학습을 위한 전문적인 콘텐츠를 제공합니다. 체계적인 커리큘럼을 통해 단계별로 실력을 향상시킬 수 있으며, 다양한 예제와 연습 문제를 통해 실전 능력을 기를 수 있습니다.'}
                  </p>
                </div>
              )}

              {/* 주요특징 탭 */}
              {activeTab === 'features' && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-6">주요 특징</h3>
                  {product.features && product.features.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {product.features.map((feature, index) => (
                        <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                          <div className="bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                            {index + 1}
                          </div>
                          <p className="text-gray-700 flex-1">{feature}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        '고품질 음원 및 악보 제공',
                        '단계별 학습 커리큘럼',
                        '전문가의 상세한 해설',
                        '다양한 연습 예제 포함',
                        '온라인 보조 자료 제공',
                        '평생 무료 업데이트'
                      ].map((feature, index) => (
                        <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                          <div className="bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                            {index + 1}
                          </div>
                          <p className="text-gray-700 flex-1">{feature}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 목차 탭 */}
              {activeTab === 'contents' && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-6">목차</h3>
                  {product.contents && product.contents.length > 0 ? (
                    <div className="space-y-3">
                      {product.contents.map((content, index) => (
                        <div key={index} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="bg-indigo-100 text-indigo-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[
                        '기본 이론 및 개념 소개',
                        '기초 연습 및 테크닉',
                        '중급 레벨 학습 과정',
                        '고급 기법 및 응용',
                        '실전 연습 프로젝트',
                        '보너스 자료 및 팁'
                      ].map((content, index) => (
                        <div key={index} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="bg-indigo-100 text-indigo-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 리뷰 탭 */}
              {activeTab === 'reviews' && (
                <div>
                  {/* 리뷰 헤더 */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">
                      고객 리뷰 ({ratingStats.total})
                    </h3>
                    
                    {isPurchased && !hasReviewed && (
                      <button
                        onClick={() => setIsReviewModalOpen(true)}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        리뷰 작성하기
                      </button>
                    )}
                  </div>

                  {/* 평점 통계 */}
                  {ratingStats.total > 0 && (
                    <div className="bg-gray-50 rounded-xl p-6 mb-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-indigo-600 mb-2">
                            {ratingStats.average.toFixed(1)}
                          </div>
                          <StarRating rating={ratingStats.average} size={24} />
                          <p className="text-gray-600 mt-2">{ratingStats.total}개의 리뷰</p>
                        </div>
                        
                        <div className="space-y-2">
                          {[5, 4, 3, 2, 1].map(star => {
                            const count = ratingStats.distribution[star - 1]
                            const percentage = ratingStats.total > 0 ? (count / ratingStats.total) * 100 : 0
                            
                            return (
                              <div key={star} className="flex items-center space-x-3">
                                <span className="text-sm text-gray-600 w-3">{star}</span>
                                <Star size={16} className="text-yellow-400 fill-current" />
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm text-gray-600 w-8">{count}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 리뷰 필터 */}
                  {ratingStats.total > 0 && (
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                      <select
                        value={reviewFilter}
                        onChange={(e) => setReviewFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      >
                        <option value="all">전체 평점</option>
                        <option value="5">⭐⭐⭐⭐⭐ (5점)</option>
                        <option value="4">⭐⭐⭐⭐ (4점)</option>
                        <option value="3">⭐⭐⭐ (3점)</option>
                        <option value="2">⭐⭐ (2점)</option>
                        <option value="1">⭐ (1점)</option>
                      </select>
                      
                      <select
                        value={reviewSort}
                        onChange={(e) => setReviewSort(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      >
                        <option value="newest">최신순</option>
                        <option value="oldest">오래된순</option>
                        <option value="rating-high">평점 높은순</option>
                        <option value="rating-low">평점 낮은순</option>
                        <option value="helpful">도움순</option>
                      </select>
                    </div>
                  )}

                  {/* 리뷰 목록 */}
                  {filteredReviews.length > 0 ? (
                    <div className="space-y-6">
                      {filteredReviews.map((review, index) => (
                        <div key={review.id || index} className="border border-gray-200 rounded-lg p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold">
                                {(review.userName || review.user_name || '사용자').charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-semibold text-gray-800">
                                    {review.userName || review.user_name || '사용자'}
                                  </span>
                                  {review.verified && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                      구매 인증
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <StarRating rating={review.rating || 0} size={16} />
                                  <span className="text-sm text-gray-500">
                                    {new Date(review.createdAt || review.created_at || Date.now()).toLocaleDateString('ko-KR')}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {user && (user.id === review.userId || user.id === review.user_id) && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleReviewEdit(review)}
                                  className="text-gray-600 hover:text-indigo-600 text-sm"
                                >
                                  수정
                                </button>
                                <button
                                  onClick={() => handleReviewDelete(review.id)}
                                  className="text-gray-600 hover:text-red-600 text-sm"
                                >
                                  삭제
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {review.title && (
                            <h4 className="font-semibold text-gray-800 mb-2">{review.title}</h4>
                          )}
                          
                          <p className="text-gray-700 leading-relaxed mb-4">{review.content}</p>
                          
                          {review.photos && review.photos.length > 0 && (
                            <div className="flex space-x-2 mb-4">
                              {review.photos.map((photo, photoIndex) => (
                                <img
                                  key={photo.id || photoIndex}
                                  src={photo.url}
                                  alt={photo.name || `리뷰 이미지 ${photoIndex + 1}`}
                                  className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                />
                              ))}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => handleReviewHelpful(review.id)}
                              className="flex items-center space-x-1 text-gray-600 hover:text-indigo-600 transition-colors"
                            >
                              <span className="text-sm">도움이 됨</span>
                              <span className="text-sm font-medium">
                                {review.helpful_count || review.helpful || 0}
                              </span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Star size={48} className="mx-auto text-gray-300 mb-4" />
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        {reviewFilter === 'all' ? '아직 리뷰가 없습니다' : '해당 평점의 리뷰가 없습니다'}
                      </h3>
                      <p className="text-gray-600">
                        {isPurchased 
                          ? '첫 번째 리뷰를 작성해보세요!' 
                          : '상품을 구매하시면 리뷰를 작성할 수 있습니다.'
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 리뷰 작성 모달 */}
      {ReviewModal && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false)
            setEditingReview(null)
          }}
          product={product}
          user={user}
          onSubmitReview={handleReviewSubmit}
          editingReview={editingReview}
        />
      )}
    </div>
  )
}