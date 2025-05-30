// 리뷰 생성 템플릿
export const createReview = (reviewData) => {
    return {
      id: Date.now(),
      ...reviewData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      helpful: 0, // 도움이 됨 카운트
      helpfulUsers: [] // 도움이 됨을 누른 사용자들
    }
  }
  
  // 평점 라벨
  export const getRatingLabel = (rating) => {
    const labels = {
      5: '매우 만족',
      4: '만족',
      3: '보통',
      2: '불만족',
      1: '매우 불만족'
    }
    return labels[rating] || '평점 없음'
  }
  
  // 평점 색상
  export const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-500'
    if (rating >= 4.0) return 'text-blue-500'
    if (rating >= 3.0) return 'text-yellow-500'
    if (rating >= 2.0) return 'text-orange-500'
    return 'text-red-500'
  }
  
  // 리뷰 필터링 함수
  export const filterReviews = (reviews, filters = {}) => {
    let filtered = [...reviews]
  
    // 평점 필터
    if (filters.rating && filters.rating !== 'all') {
      filtered = filtered.filter(review => review.rating === parseInt(filters.rating))
    }
  
    // 사진 리뷰만 보기
    if (filters.withPhotos) {
      filtered = filtered.filter(review => review.photos && review.photos.length > 0)
    }
  
    // 정렬
    switch (filters.sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        break
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        break
      case 'rating-high':
        filtered.sort((a, b) => b.rating - a.rating)
        break
      case 'rating-low':
        filtered.sort((a, b) => a.rating - b.rating)
        break
      case 'helpful':
        filtered.sort((a, b) => b.helpful - a.helpful)
        break
      default:
        // 기본 정렬 (최신순)
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        break
    }
  
    return filtered
  }
  
  // 평점 통계 계산
  export const calculateRatingStats = (reviews) => {
    if (!reviews || reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: [0, 0, 0, 0, 0]
      }
    }
  
    const totalReviews = reviews.length
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
    const averageRating = totalRating / totalReviews
  
    // 별점별 분포 계산 (1점부터 5점까지)
    const ratingDistribution = [0, 0, 0, 0, 0]
    reviews.forEach(review => {
      if (review.rating >= 1 && review.rating <= 5) {
        ratingDistribution[review.rating - 1]++
      }
    })
  
    return {
      averageRating: Math.round(averageRating * 10) / 10, // 소수점 첫째 자리
      totalReviews,
      ratingDistribution
    }
  }