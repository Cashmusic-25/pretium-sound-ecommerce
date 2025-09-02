'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
// products.js import 제거 - 이제 Supabase 데이터만 사용

export default function Hero() {
  const router = useRouter()
  const [allSlides, setAllSlides] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)

  // Context hooks
  const { addToCart, isInCart } = useCart()
  const { isAuthenticated, toggleWishlist, isInWishlist } = useAuth()

  // 토스트 메시지 표시 함수
  const showToastMessage = (message) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 3000)
  }

  // 히어로 슬라이더 데이터 가져오기
  useEffect(() => {
    const fetchHeroSlides = async () => {
      try {
        setIsLoading(true)

        const response = await fetch('/api/hero-slides')
        
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || '데이터 로딩 실패')
        }
        
        setAllSlides(result.slides || [])

        if (!result.slides || result.slides.length === 0) {
          setAllSlides([])
        }

      } catch (err) {
        console.error('❌ 히어로 슬라이더 데이터 로딩 실패:', err)
        setError(err.message)
        setAllSlides([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchHeroSlides()
  }, [])

  // 데스크톱용: 2개씩 묶기
  const slideGroups = []
  for (let i = 0; i < allSlides.length; i += 2) {
    slideGroups.push(allSlides.slice(i, i + 2))
  }

  // 자동 슬라이드
  useEffect(() => {
    if (!isAutoPlaying || isLoading || allSlides.length === 0) {
      return
    }

    const interval = setInterval(() => {
      const maxSlides = window.innerWidth < 1024 ? allSlides.length : slideGroups.length
      setCurrentSlide((prev) => (prev + 1) % maxSlides)
    }, 5000)

    return () => {
      clearInterval(interval)
    }
  }, [isAutoPlaying, allSlides.length, slideGroups.length, isLoading])

  // 다음 슬라이드
  const nextSlide = () => {
    const maxSlides = window.innerWidth < 1024 ? allSlides.length : slideGroups.length
    setCurrentSlide((prev) => (prev + 1) % maxSlides)
  }

  // 이전 슬라이드
  const prevSlide = () => {
    const maxSlides = window.innerWidth < 1024 ? allSlides.length : slideGroups.length
    setCurrentSlide((prev) => (prev - 1 + maxSlides) % maxSlides)
  }

  // 특정 슬라이드로 이동
  const goToSlide = (index) => {
    setCurrentSlide(index)
  }

  // 상품 페이지로 이동하는 함수
  const handleProductClick = (slideId, slideTitle) => {
    router.push(`/product/${slideId}`)
  }

  // 위시리스트 토글 함수
  const handleWishlistToggle = (slide, e) => {
    e.stopPropagation()
    e.preventDefault()
    
    if (!isAuthenticated) {
      showToastMessage('로그인이 필요한 서비스입니다.')
      return
    }

    try {
      const wasInWishlist = isInWishlist(slide.id)
      
      toggleWishlist(slide.id)
      
      if (wasInWishlist) {
        showToastMessage(`${slide.title}이(가) 위시리스트에서 제거되었습니다.`)
      } else {
        showToastMessage(`${slide.title}이(가) 위시리스트에 추가되었습니다.`)
      }
    } catch (error) {
      console.error('위시리스트 토글 실패:', error)
      showToastMessage('위시리스트 업데이트에 실패했습니다.')
    }
  }

  // 장바구니 추가 함수
  const handleAddToCart = (slide, e) => {
    e.stopPropagation()
    e.preventDefault()
    
    try {
      if (isInCart(slide.id)) {
        showToastMessage(`${slide.title}은(는) 이미 장바구니에 있습니다.`)
        return
      }

      // products 데이터에서 해당 상품 찾기
      const productData = products.find(p => p.id === slide.id)
      
      if (!productData) {
        showToastMessage('상품 정보를 찾을 수 없습니다.')
        return
      }

      // 기존 상품 데이터 사용 (가격 포함)
      const cartItem = {
        id: productData.id,
        title: productData.title,
        price: productData.price, // products.js의 가격 정보 사용
        category: productData.category,
        icon: productData.icon,
        image: slide.image || productData.image, // 슬라이드 이미지 우선 사용
        description: productData.description
      }

      addToCart(cartItem)
      showToastMessage(`${slide.title}이(가) 장바구니에 추가되었습니다.`)
    } catch (error) {
      console.error('장바구니 추가 실패:', error)
      showToastMessage('장바구니 추가에 실패했습니다.')
    }
  }

  // 슬라이드 카드 컴포넌트
  const SlideCard = ({ slide }) => {
    return (
      <div className="relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group cursor-pointer">
        {/* 카드 전체 클릭 영역 */}
        <div 
          className="block"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleProductClick(slide.id, slide.title)
          }}
        >
          {/* 이미지 영역 */}
          <div className="relative h-64 lg:h-80 overflow-hidden">
            <img 
              src={slide.image} 
              alt={slide.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.target.src = '/images/hero-background.jpg'
              }}
            />
            {/* 카테고리 태그 */}
            <div className="absolute top-4 left-4">
              <span className={`${slide.categoryColor || 'bg-blue-500'} text-white px-3 py-1 rounded-full text-sm font-medium shadow-md`}>
                {slide.category}
              </span>
            </div>
          </div>

          {/* 텍스트 영역 */}
          <div className="p-6">
            <h3 className="text-lg lg:text-xl font-bold text-gray-800 mb-3 leading-tight group-hover:text-blue-600 transition-colors">
              {slide.title}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              {slide.subtitle}
            </p>
          </div>
        </div>
        
        {/* 액션 버튼들 (별도 영역) */}
        <div className="px-6 pb-6">
          <div className="flex justify-between items-center">
            <button
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                handleProductClick(slide.id, slide.title)
              }}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors hover:underline cursor-pointer"
            >
              자세히 보기 →
            </button>
            <div className="flex space-x-2">
              <button 
                className={`p-2 transition-colors rounded-full ${
                  isInWishlist(slide.id)
                    ? 'text-red-500 bg-red-50 hover:bg-red-100'
                    : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                }`}
                onClick={(e) => handleWishlistToggle(slide, e)}
                title={isInWishlist(slide.id) ? '위시리스트에서 제거' : '위시리스트에 추가'}
              >
                <svg className="w-5 h-5" fill={isInWishlist(slide.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <button 
                className={`p-2 transition-colors rounded-full ${
                  isInCart(slide.id)
                    ? 'text-green-500 bg-green-50 hover:bg-green-100'
                    : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
                }`}
                onClick={(e) => handleAddToCart(slide, e)}
                title={isInCart(slide.id) ? '이미 장바구니에 있음' : '장바구니에 추가'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <section className="pt-24 pb-16 bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
              좋은 교재, 새로운 기회
            </h1>
            <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
              전문 음악가들이 집필한 고품질 교재로<br/>
              체계적인 음악 학습을 경험해보세요
            </p>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">슬라이더를 불러오는 중...</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // 슬라이드가 없는 경우 - 관리자에게 안내 메시지
  if (allSlides.length === 0) {
    return (
      <section className="pt-24 pb-16 bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
              좋은 교재, 새로운 기회
            </h1>
            <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              전문 음악가들이 집필한 고품질 교재로<br/>
              체계적인 음악 학습을 경험해보세요
            </p>
            
            {/* 슬라이드가 없을 때 표시할 기본 콘텐츠 */}
            <div className="bg-white rounded-xl p-8 shadow-lg max-w-2xl mx-auto">
              <div className="mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  🎵 곧 새로운 교재를 만나보세요!
                </h3>
                <p className="text-gray-600 mb-4">
                  현재 히어로 슬라이더에 표시할 상품이 없습니다.
                </p>
                {error && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-4">
                    <p className="text-sm">⚠️ {error}</p>
                  </div>
                )}
              </div>
              
              {/* 액션 버튼들 */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a
                  href="#products"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  전체 교재 둘러보기
                </a>
                <a
                  href="#about"
                  className="border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:text-gray-800 px-8 py-4 rounded-full font-bold text-lg transition-all duration-300"
                >
                  더 알아보기
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section 
      id="home" 
      className="pt-24 md:pt-28 lg:pt-32 xl:pt-36 pb-16 bg-gray-50 min-h-screen relative"
    >
      
      {/* 토스트 메시지 */}
      {showToast && (
        <div className="fixed top-24 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 transform transition-all duration-300">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-800 font-medium">{toastMessage}</p>
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4">
        {/* 헤더 - 추가 여백 적용 */}
        <div className="text-center mb-8 md:mb-10 lg:mb-12 xl:mb-16">
          <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-800 mb-4 md:mb-6">
            좋은 교재, 새로운 기회
          </h1>
          <p className="text-lg lg:text-xl xl:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            전문 음악가들이 집필한 고품질 교재로<br/>
            체계적인 음악 학습을 경험해보세요
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-6">
            <p className="text-sm">⚠️ 데이터 로딩 중 문제가 발생했습니다: {error}</p>
            <p className="text-xs mt-1">기본 슬라이드를 표시합니다.</p>
          </div>
        )}

        {/* 슬라이더 컨테이너 */}
        <div className="relative max-w-6xl mx-auto">
          {/* 데스크톱 버전: 2개씩 표시 */}
          <div className="hidden lg:block relative overflow-hidden rounded-2xl">
            <div 
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {slideGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="w-full flex-shrink-0">
                  <div className="grid grid-cols-2 gap-6 p-6">
                    {group.map((slide) => (
                      <SlideCard key={slide.id} slide={slide} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 모바일 버전: 1개씩 표시 */}
          <div className="lg:hidden relative overflow-hidden rounded-2xl">
            <div 
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {allSlides.map((slide) => (
                <div key={slide.id} className="w-full flex-shrink-0">
                  <div className="p-6">
                    <SlideCard slide={slide} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 네비게이션 컨트롤 */}
          <div className="flex justify-center items-center mt-8 space-x-4">
            {/* 이전 버튼 */}
            <button
              onClick={prevSlide}
              className="p-3 bg-white rounded-full shadow-md hover:shadow-lg text-gray-600 hover:text-gray-800 transition-all duration-300 z-20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* 도트 인디케이터 - 반응형 */}
            <div className="flex space-x-2">
              {/* 데스크톱: 그룹 수만큼 */}
              <div className="hidden lg:flex space-x-2">
                {slideGroups.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 z-20 ${
                      index === currentSlide 
                        ? 'bg-blue-500 w-8' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
              {/* 모바일: 전체 슬라이드 수만큼 */}
              <div className="lg:hidden flex space-x-2">
                {allSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 z-20 ${
                      index === currentSlide 
                        ? 'bg-blue-500 w-8' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* 다음 버튼 */}
            <button
              onClick={nextSlide}
              className="p-3 bg-white rounded-full shadow-md hover:shadow-lg text-gray-600 hover:text-gray-800 transition-all duration-300 z-20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* 자동재생 토글 */}
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className={`p-3 rounded-full transition-all duration-300 z-20 ${
                isAutoPlaying 
                  ? 'bg-blue-500 text-white shadow-md hover:bg-blue-600' 
                  : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
              }`}
            >
              {isAutoPlaying ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
            <a
              href="#products"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              전체 교재 둘러보기
            </a>
            <a
              href="#about"
              className="border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:text-gray-800 px-8 py-4 rounded-full font-bold text-lg transition-all duration-300"
            >
              더 알아보기
            </a>
          </div>
        </div>

        {/* 마우스 호버시 자동재생 일시정지 - 슬라이더 영역에만 적용 */}
        <div 
          className="absolute inset-0 z-10 pointer-events-none"
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
        ></div>
      </div>
    </section>
  )
}