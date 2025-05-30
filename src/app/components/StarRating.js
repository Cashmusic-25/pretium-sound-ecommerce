'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

export default function StarRating({ 
  rating = 0, 
  maxRating = 5, 
  size = 20, 
  interactive = false, 
  onRatingChange = null,
  showText = false 
}) {
  const [hoverRating, setHoverRating] = useState(0)
  const [selectedRating, setSelectedRating] = useState(rating)

  const handleClick = (clickedRating) => {
    if (!interactive) return
    
    setSelectedRating(clickedRating)
    if (onRatingChange) {
      onRatingChange(clickedRating)
    }
  }

  const handleMouseEnter = (hoveredRating) => {
    if (!interactive) return
    setHoverRating(hoveredRating)
  }

  const handleMouseLeave = () => {
    if (!interactive) return
    setHoverRating(0)
  }

  const displayRating = interactive ? (hoverRating || selectedRating) : rating

  const getRatingText = (rating) => {
    if (rating >= 4.5) return '매우 만족'
    if (rating >= 4.0) return '만족'
    if (rating >= 3.0) return '보통'
    if (rating >= 2.0) return '불만족'
    if (rating >= 1.0) return '매우 불만족'
    return '평점 없음'
  }

  return (
    <div className="flex items-center space-x-1">
      <div className="flex items-center">
        {[...Array(maxRating)].map((_, index) => {
          const starNumber = index + 1
          const isFilled = starNumber <= displayRating
          const isPartiallyFilled = !isFilled && starNumber - 0.5 <= displayRating

          return (
            <div
              key={index}
              className={`relative ${interactive ? 'cursor-pointer' : ''}`}
              onClick={() => handleClick(starNumber)}
              onMouseEnter={() => handleMouseEnter(starNumber)}
              onMouseLeave={handleMouseLeave}
            >
              {/* 배경 별 (회색) */}
              <Star 
                size={size} 
                className="text-gray-300" 
                fill="currentColor"
              />
              
              {/* 채워진 별 (노란색) */}
              {(isFilled || isPartiallyFilled) && (
                <Star 
                  size={size} 
                  className={`absolute top-0 left-0 text-yellow-400 ${
                    interactive && hoverRating >= starNumber ? 'text-yellow-500' : ''
                  }`}
                  fill="currentColor"
                  style={isPartiallyFilled ? { 
                    clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' 
                  } : {}}
                />
              )}
            </div>
          )
        })}
      </div>
      
      {showText && (
        <span className="text-sm text-gray-600 ml-2">
          {displayRating > 0 ? `${displayRating.toFixed(1)} (${getRatingText(displayRating)})` : '평점 없음'}
        </span>
      )}
      
      {interactive && hoverRating > 0 && (
        <span className="text-sm text-gray-500 ml-2">
          {getRatingText(hoverRating)}
        </span>
      )}
    </div>
  )
}