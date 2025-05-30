'use client'

import { useState } from 'react'
import { X, Star, Camera, Loader } from 'lucide-react'
import StarRating from './StarRating'

export default function ReviewModal({ 
  isOpen, 
  onClose, 
  product, 
  user, 
  onSubmitReview,
  editingReview = null
}) {
  const [reviewForm, setReviewForm] = useState({
    rating: editingReview?.rating || 0,
    title: editingReview?.title || '',
    content: editingReview?.content || '',
    photos: editingReview?.photos || []
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (field, value) => {
    setReviewForm(prev => ({
      ...prev,
      [field]: value
    }))
    if (error) setError('')
  }

  const handleRatingChange = (rating) => {
    setReviewForm(prev => ({
      ...prev,
      rating
    }))
    if (error) setError('')
  }

  const validateForm = () => {
    if (reviewForm.rating === 0) {
      setError('별점을 선택해주세요.')
      return false
    }
    
    if (!reviewForm.content.trim()) {
      setError('리뷰 내용을 입력해주세요.')
      return false
    }

    if (reviewForm.content.trim().length < 10) {
      setError('리뷰는 최소 10자 이상 작성해주세요.')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    setError('')

    try {
      if (editingReview) {
        // 수정 모드
        const updatedReview = {
          ...editingReview,
          rating: reviewForm.rating,
          title: reviewForm.title.trim(),
          content: reviewForm.content.trim(),
          photos: reviewForm.photos,
          updatedAt: new Date().toISOString()
        }
        
        await onSubmitReview(updatedReview, true) // 두 번째 매개변수로 수정임을 표시
      } else {
        // 새 리뷰 작성
        const newReview = {
          id: Date.now(),
          userId: user.id,
          userName: user.name,
          productId: product.id,
          rating: reviewForm.rating,
          title: reviewForm.title.trim(),
          content: reviewForm.content.trim(),
          photos: reviewForm.photos,
          createdAt: new Date().toISOString(),
          helpful: 0,
          helpfulUsers: [],
          verified: true
        }

        await onSubmitReview(newReview, false)
      }
      
      // 폼 초기화
      setReviewForm({
        rating: 0,
        title: '',
        content: '',
        photos: []
      })
      
      onClose()
    } catch (err) {
      setError(err.message || '리뷰 작성 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files)
    
    // 최대 3개까지만 허용
    if (reviewForm.photos.length + files.length > 3) {
      setError('사진은 최대 3개까지 업로드 가능합니다.')
      return
    }

    // 파일 크기 체크 (5MB 제한)
    const maxSize = 5 * 1024 * 1024
    const invalidFiles = files.filter(file => file.size > maxSize)
    
    if (invalidFiles.length > 0) {
      setError('파일 크기는 5MB 이하만 가능합니다.')
      return
    }

    // 파일을 Base64로 변환 (실제로는 서버에 업로드해야 함)
    const promises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          resolve({
            id: Date.now() + Math.random(),
            name: file.name,
            url: e.target.result
          })
        }
        reader.readAsDataURL(file)
      })
    })

    Promise.all(promises).then(newPhotos => {
      setReviewForm(prev => ({
        ...prev,
        photos: [...prev.photos, ...newPhotos]
      }))
    })
  }

  const removePhoto = (photoId) => {
    setReviewForm(prev => ({
      ...prev,
      photos: prev.photos.filter(photo => photo.id !== photoId)
    }))
  }

  const getRatingText = (rating) => {
    const texts = {
      1: '매우 불만족',
      2: '불만족',
      3: '보통',
      4: '만족',
      5: '매우 만족'
    }
    return texts[rating] || ''
  }

  if (!isOpen) return null

  return (
    <>
      {/* 배경 오버레이 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* 모달 컨테이너 */}
        <div 
          className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative"
          onClick={e => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingReview ? '리뷰 수정' : '리뷰 작성'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* 상품 정보 */}
            <div className="flex items-center space-x-4 mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg w-16 h-16 flex items-center justify-center text-white text-2xl">
                {product.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">{product.title}</h3>
                <p className="text-sm text-gray-600">{product.category}</p>
              </div>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* 별점 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                별점 *
              </label>
              <div className="flex items-center space-x-4">
                <StarRating
                  rating={reviewForm.rating}
                  size={32}
                  interactive={true}
                  onRatingChange={handleRatingChange}
                />
                {reviewForm.rating > 0 && (
                  <span className="text-lg font-medium text-indigo-600">
                    {getRatingText(reviewForm.rating)}
                  </span>
                )}
              </div>
            </div>

            {/* 제목 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                리뷰 제목 (선택사항)
              </label>
              <input
                type="text"
                value={reviewForm.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="리뷰 제목을 입력하세요"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-1">
                {reviewForm.title.length}/50자
              </p>
            </div>

            {/* 내용 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                리뷰 내용 *
              </label>
              <textarea
                value={reviewForm.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder="상품에 대한 솔직한 후기를 남겨주세요. (최소 10자)"
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {reviewForm.content.length}/500자 (최소 10자)
              </p>
            </div>

            {/* 사진 업로드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사진 첨부 (선택사항)
              </label>
              
              {/* 업로드된 사진들 */}
              {reviewForm.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {reviewForm.photos.map((photo) => (
                    <div key={photo.id} className="relative">
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 업로드 버튼 */}
              {reviewForm.photos.length < 3 && (
                <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="text-center">
                    <Camera className="mx-auto text-gray-400 mb-2" size={24} />
                    <p className="text-sm text-gray-600">
                      사진 업로드 ({reviewForm.photos.length}/3)
                    </p>
                    <p className="text-xs text-gray-500">
                      JPG, PNG (최대 5MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* 제출 버튼 */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border-2 border-gray-300 text-gray-600 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-300"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isSubmitting && <Loader className="animate-spin" size={20} />}
                <span>
                  {isSubmitting 
                    ? (editingReview ? '수정 중...' : '작성 중...') 
                    : (editingReview ? '리뷰 수정 완료' : '리뷰 작성 완료')
                  }
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}