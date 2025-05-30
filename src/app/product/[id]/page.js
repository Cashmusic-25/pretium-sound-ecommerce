// 상품 상세페이지에서 이미지 표시 부분만 수정

// 기존 코드에서 이 부분만 교체하세요:

{/* 왼쪽: 상품 이미지 */}
<div className="space-y-6">
  <div className="rounded-2xl h-96 overflow-hidden">
    {product.image && !imageError ? (
      <img
        src={product.image}
        alt={product.title}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
    ) : (
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 h-full flex items-center justify-center text-white text-8xl">
        {product.icon}
      </div>
    )}
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
  </div>
</div>

// 그리고 컴포넌트 상단에 state 추가:
const [imageError, setImageError] = useState(false)