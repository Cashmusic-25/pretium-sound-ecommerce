'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShoppingCart, Heart, Plus, Minus, Book, Award, Users } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'
import { useAuth } from '../../contexts/AuthContext'
import { getVisibleProductById } from '../../../data/productHelpers'
import Header from '../../components/Header'

export default function ProductPage({ params }) {
  const router = useRouter()
  const { addToCart } = useCart()
  const { user, isAuthenticated, toggleWishlist, hasPurchasedProduct } = useAuth()
  
  // Next.js 15에서 params는 Promise이므로 use()로 unwrap
  const resolvedParams = use(params)
  
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState('description')
  const [isPurchased, setIsPurchased] = useState(false)

  useEffect(() => {
    if (resolvedParams?.id) {
      loadProduct()
    }
  }, [resolvedParams?.id])

  // 구매 상태 확인
  useEffect(() => {
    const checkPurchaseStatus = async () => {
      if (product && user && hasPurchasedProduct) {
        const purchased = await hasPurchasedProduct(product.id)
        setIsPurchased(purchased)
      }
    }
    
    checkPurchaseStatus()
  }, [product, user, hasPurchasedProduct])

  const loadProduct = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const productData = await getVisibleProductById(resolvedParams.id)
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

  const formatPrice = (price) => {
    if (!price) return '₩0'
    if (typeof price === 'string') return price
    return `₩${price.toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
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
        <div className="flex items-center justify-center min-h-[60vh]">
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="pb-16">
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
                <div>
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-auto object-contain"
                    />
                  ) : (
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 min-h-[300px] flex items-center justify-center text-white text-8xl">
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

          {/* 서비스 제공 기간 안내 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center">
              <span className="mr-2">📥</span>
              서비스 제공 기간
            </h3>
            <div className="space-y-2 text-blue-800">
              <p className="flex items-center">
                <span className="font-medium">• 이용 시작:</span>
                <span className="ml-2">구매 후 즉시 다운로드 가능</span>
              </p>
              <p className="flex items-center">
                <span className="font-medium">• 이용 기간:</span>
                <span className="ml-2">구매일로부터 1년간 다운로드 이용 가능</span>
              </p>
              <p className="text-sm text-blue-600 mt-2">
                ※ 다운로드 후에는 영구적으로 이용 가능합니다
              </p>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="border-b border-gray-200">
              <div className="flex">
                {[
                  { id: 'description', label: '상세정보', icon: <Book size={20} /> },
                  { id: 'features', label: '주요특징', icon: <Award size={20} /> },
                  { id: 'contents', label: '목차', icon: <Users size={20} /> }
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}