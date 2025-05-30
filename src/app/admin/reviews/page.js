'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  Filter,
  Star,
  Trash2,
  ArrowLeft,
  MessageSquare,
  ThumbsUp,
  Eye,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import Header from '../../components/Header'
import Avatar from '../../components/Avatar'
import StarRating from '../../components/StarRating'

export default function AdminReviewsPage() {
  const router = useRouter()
  const { isAdmin, getAllReviews, adminDeleteReview } = useAuth()
  const [reviews, setReviews] = useState([])
  const [filteredReviews, setFilteredReviews] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRating, setSelectedRating] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReview, setSelectedReview] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [reviewToDelete, setReviewToDelete] = useState(null)

  useEffect(() => {
    if (!isAdmin) {
      router.push('/')
      return
    }

    loadReviews()
  }, [isAdmin, router])

  const loadReviews = () => {
    const allReviews = getAllReviews()
    setReviews(allReviews)
    setFilteredReviews(allReviews)
    setIsLoading(false)
  }

  // 검색 및 필터링
  useEffect(() => {
    let filtered = reviews

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(review =>
        review.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (review.title && review.title.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // 평점 필터링
    if (selectedRating !== 'all') {
      filtered = filtered.filter(review => review.rating === parseInt(selectedRating))
    }

    setFilteredReviews(filtered)
  }, [searchTerm, selectedRating, reviews])

  const handleDeleteReview = (review) => {
    setReviewToDelete(review)
    setShowDeleteModal(true)
  }

  const confirmDelete = () => {
    if (reviewToDelete) {
      const success = adminDeleteReview(reviewToDelete.id)
      if (success) {
        loadReviews() // 리뷰 목록 새로고침
        setShowDeleteModal(false)
        setReviewToDelete(null)
      } else {
        alert('리뷰 삭제에 실패했습니다.')
      }
    }
  }

  const getReviewStats = () => {
    const stats = {
      total: reviews.length,
      excellent: reviews.filter(r => r.rating === 5).length,
      good: reviews.filter(r => r.rating === 4).length,
      average: reviews.filter(r => r.rating === 3).length,
      poor: reviews.filter(r => r.rating <= 2).length,
      averageRating: reviews.length > 0 
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : '0.0'
    }
    return stats
  }

  const getRatingColor = (rating) => {
    if (rating >= 4) return 'text-green-600'
    if (rating >= 3) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ko-KR')
  }

  if (!isAdmin) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">리뷰 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  const stats = getReviewStats()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* 헤더 */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>대시보드로 돌아가기</span>
              </button>
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-gray-800">리뷰 관리</h1>
              <p className="text-gray-600 mt-2">고객 리뷰를 모니터링하고 관리하세요</p>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-4 text-center">
              <MessageSquare className="text-indigo-600 mb-2 mx-auto" size={24} />
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-sm text-gray-600">전체 리뷰</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Star className="text-yellow-400 fill-current" size={24} />
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats.averageRating}</p>
              <p className="text-sm text-gray-600">평균 평점</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.excellent}</p>
              <p className="text-sm text-gray-600">5점 (우수)</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.good}</p>
              <p className="text-sm text-gray-600">4점 (좋음)</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.average}</p>
              <p className="text-sm text-gray-600">3점 (보통)</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.poor}</p>
              <p className="text-sm text-gray-600">2점 이하</p>
            </div>
          </div>

          {/* 검색 및 필터 */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              {/* 검색 */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="리뷰 내용, 작성자명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              {/* 평점 필터 */}
              <select
                value={selectedRating}
                onChange={(e) => setSelectedRating(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white min-w-[150px]"
              >
                <option value="all">전체 평점</option>
                <option value="5">⭐⭐⭐⭐⭐ (5점)</option>
                <option value="4">⭐⭐⭐⭐ (4점)</option>
                <option value="3">⭐⭐⭐ (3점)</option>
                <option value="2">⭐⭐ (2점)</option>
                <option value="1">⭐ (1점)</option>
              </select>
            </div>

            {/* 결과 개수 */}
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>총 {filteredReviews.length}개의 리뷰</span>
              {(searchTerm || selectedRating !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedRating('all')
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  필터 초기화
                </button>
              )}
            </div>
          </div>

          {/* 리뷰 목록 */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {filteredReviews.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {filteredReviews.map((review) => (
                  <div key={review.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <Avatar name={review.userName} size={48} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-semibold text-gray-800">{review.userName}</h4>
                            {review.verified && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                구매 인증
                              </span>
                            )}
                            <span className="text-sm text-gray-500">
                              {formatDate(review.createdAt)}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2 mb-2">
                            <StarRating rating={review.rating} size={16} />
                            <span className={`text-sm font-medium ${getRatingColor(review.rating)}`}>
                              {review.rating}.0
                            </span>
                          </div>
                          
                          {review.title && (
                            <h5 className="font-medium text-gray-800 mb-2">{review.title}</h5>
                          )}
                          
                          <p className="text-gray-700 leading-relaxed mb-3">{review.content}</p>
                          
                          {/* 리뷰 사진들 */}
                          {review.photos && review.photos.length > 0 && (
                            <div className="flex space-x-2 mb-3">
                              {review.photos.map((photo) => (
                                <img
                                  key={photo.id}
                                  src={photo.url}
                                  alt={photo.name}
                                  className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                />
                              ))}
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <ThumbsUp size={14} />
                              <span>도움이 됨 {review.helpful || 0}</span>
                            </div>
                            <span>상품 ID: {review.productId}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 액션 버튼들 */}
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedReview(review)
                            setShowDetailModal(true)
                          }}
                          className="text-gray-600 hover:text-indigo-600 transition-colors p-2"
                          title="상세 보기"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteReview(review)}
                          className="text-gray-600 hover:text-red-600 transition-colors p-2"
                          title="삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* 리뷰가 없을 때 */
              <div className="text-center py-16">
                <MessageSquare size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {searchTerm || selectedRating !== 'all' ? '검색 결과가 없습니다' : '리뷰가 없습니다'}
                </h3>
                <p className="text-gray-600">
                  {searchTerm || selectedRating !== 'all' 
                    ? '다른 검색어나 필터를 시도해보세요.' 
                    : '아직 고객 리뷰가 없습니다.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 리뷰 상세 모달 */}
      {showDetailModal && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">리뷰 상세 정보</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 리뷰 작성자 정보 */}
              <div className="flex items-center space-x-4">
                <Avatar name={selectedReview.userName} size={64} />
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-xl font-bold text-gray-800">{selectedReview.userName}</h4>
                    {selectedReview.verified && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        구매 인증
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600">사용자 ID: {selectedReview.userId}</p>
                  <p className="text-sm text-gray-500">
                    작성일: {formatDate(selectedReview.createdAt)}
                  </p>
                </div>
              </div>

              {/* 평점 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-800 mb-2">평점</h5>
                <div className="flex items-center space-x-3">
                  <StarRating rating={selectedReview.rating} size={24} />
                  <span className={`text-2xl font-bold ${getRatingColor(selectedReview.rating)}`}>
                    {selectedReview.rating}.0
                  </span>
                </div>
              </div>

              {/* 리뷰 내용 */}
              <div>
                {selectedReview.title && (
                  <div className="mb-4">
                    <h5 className="font-semibold text-gray-800 mb-2">제목</h5>
                    <p className="text-lg font-medium text-gray-800">{selectedReview.title}</p>
                  </div>
                )}
                
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">내용</h5>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedReview.content}
                  </p>
                </div>
              </div>

              {/* 리뷰 사진들 */}
              {selectedReview.photos && selectedReview.photos.length > 0 && (
                <div>
                  <h5 className="font-semibold text-gray-800 mb-3">첨부 사진</h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedReview.photos.map((photo) => (
                      <img
                        key={photo.id}
                        src={photo.url}
                        alt={photo.name}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(photo.url, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 통계 정보 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-800 mb-3">통계</h5>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-indigo-600">{selectedReview.helpful || 0}</p>
                    <p className="text-sm text-gray-600">도움이 됨</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-600">{selectedReview.productId}</p>
                    <p className="text-sm text-gray-600">상품 ID</p>
                  </div>
                </div>
              </div>

              {/* 관리자 액션 */}
              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    handleDeleteReview(selectedReview)
                  }}
                  className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <Trash2 size={20} />
                  <span>이 리뷰 삭제</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteModal && reviewToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="text-red-500" size={24} />
              <h3 className="text-lg font-bold text-gray-800">리뷰 삭제 확인</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                "<strong>{reviewToDelete.userName}</strong>"님의 리뷰를 정말 삭제하시겠습니까?
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <StarRating rating={reviewToDelete.rating} size={14} />
                  <span className="text-sm font-medium">{reviewToDelete.rating}.0</span>
                </div>
                {reviewToDelete.title && (
                  <p className="font-medium text-sm text-gray-800 mb-1">{reviewToDelete.title}</p>
                )}
                <p className="text-sm text-gray-600 line-clamp-2">{reviewToDelete.content}</p>
              </div>
              
              <p className="text-red-600 text-sm mt-3">
                ⚠️ 이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setReviewToDelete(null)
                }}
                className="flex-1 border-2 border-gray-300 text-gray-600 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}