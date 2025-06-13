'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Save, 
  Upload,
  Plus,
  X,
  Package,
  DollarSign,
  FileText,
  Tag,
  Image as ImageIcon,
  Camera,
  File,
  Music,
  Download
} from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { supabase } from '../../../../lib/supabase'
import Header from '../../../components/Header'

// 기존 이미지 업로드 함수 (그대로 유지)
async function uploadProductImage(file) {
  console.log('🔄 이미지 업로드 시작:', file.name, file.size);
  
  try {
    const { getSupabase } = await import('../../../../lib/supabase')
    const supabase = getSupabase()
    
    if (!supabase) {
      throw new Error('Supabase 연결이 필요합니다')
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `product_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `products/${fileName}`

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file)

    if (error) {
      throw error
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath)

    return {
      url: publicUrl,
      path: filePath
    }
  } catch (error) {
    console.error('💥 이미지 업로드 에러:', error)
    throw error
  }
}

// 파일 타입 결정 함수
function getFileType(extension) {
  const ext = extension.toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (['zip', 'rar', '7z'].includes(ext)) return 'archive'
  if (['mp3', 'wav', 'flac', 'm4a'].includes(ext)) return 'audio'
  if (['mp4', 'avi', 'mov', 'wmv'].includes(ext)) return 'video'
  return 'document'
}

// 파일 크기 포맷팅 함수
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function AdminProductAddPage() {
  const router = useRouter()
  const { isAdmin } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const [productForm, setProductForm] = useState({
    title: '',
    description: '',
    detailedDescription: '',
    price: '',
    icon: '🎵',
    image: null,
    imagePath: null,
    imagePreview: null,
    category: '',
    features: [''],
    contents: [''],
    files: [], // E-Book 파일들
    specifications: {
      '페이지 수': '',
      '난이도': '',
      '출판사': 'Pretium Sound',
      '언어': '한국어',
      '포함 자료': ''
    }
  })

  const availableCategories = [
    '피아노', '기타', '보컬', '드럼', '바이올린', '음악이론'
  ]

  const availableIcons = [
    '🎹', '🎸', '🎤', '🥁', '🎻', '🎵', '🎶', '🎼', '🎺', '🎷'
  ]

  const difficultyLevels = [
    '초급', '초급 ~ 중급', '중급', '중급 ~ 고급', '고급', '전문가'
  ]

  // 관리자 권한 체크
  useEffect(() => {
    if (isMounted && !isAdmin) {
      router.push('/')
    }
  }, [isMounted, isAdmin, router])

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">페이지를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  const handleInputChange = (field, value) => {
    setProductForm(prev => ({
      ...prev,
      [field]: value
    }))
    if (error) setError('')
    if (success) setSuccess('')
  }

  // 기존 이미지 업로드 핸들러 (그대로 유지)
  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setError('이미지 크기는 5MB 이하만 가능합니다.')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('JPG, PNG, WEBP 파일만 업로드 가능합니다.')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const previewUrl = URL.createObjectURL(file)
      setProductForm(prev => ({
        ...prev,
        imagePreview: previewUrl
      }))

      const result = await uploadProductImage(file)
      
      setProductForm(prev => ({
        ...prev,
        image: result.url,
        imagePath: result.path,
        imagePreview: result.url
      }))

      setSuccess('이미지 업로드 완료!')
      
    } catch (error) {
      setError('이미지 업로드 실패: ' + error.message)
      setProductForm(prev => ({
        ...prev,
        image: null,
        imagePreview: null,
        imagePath: null
      }))
    } finally {
      setIsLoading(false)
    }
  }

  // 새로운 E-Book 파일 업로드 핸들러 (API 사용)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    console.log('📁 선택된 파일:', file.name, file.type, file.size)

    // 파일 크기 체크 (50MB 제한)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      setError('파일 크기는 50MB 이하만 가능합니다.')
      return
    }

    // 파일 타입 체크
    const fileExt = file.name.split('.').pop().toLowerCase()
    const allowedExtensions = ['pdf', 'zip', 'mp3', 'wav', 'mp4', 'avi', 'rar', '7z']
    
    if (!allowedExtensions.includes(fileExt)) {
      setError('PDF, ZIP, MP3, WAV, MP4 파일만 업로드 가능합니다.')
      return
    }

    setIsUploadingFile(true)
    setError('')

    try {
      // FormData 생성
      const formData = new FormData()
      formData.append('file', file)

      console.log('🌐 API 호출 시작...')

      // API 라우트 호출
      const response = await fetch('/api/upload/ebook', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '업로드 실패')
      }

      console.log('✅ 업로드 성공:', result)

      // 파일 ID 생성
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2)}`
      
      const newFile = {
        id: fileId,
        filename: result.filename,
        filePath: result.filePath,
        type: result.type,
        size: result.size,
        description: '', // 나중에 사용자가 입력
        uploadedAt: result.uploadedAt
      }

      setProductForm(prev => ({
        ...prev,
        files: [...prev.files, newFile]
      }))

      setSuccess(`${file.name} 업로드 완료!`)
      
      // 파일 input 리셋
      e.target.value = ''
      
    } catch (error) {
      console.error('파일 업로드 실패:', error)
      setError('파일 업로드 실패: ' + error.message)
    } finally {
      setIsUploadingFile(false)
    }
  }

  // 파일 제거 핸들러
  const handleRemoveFile = (fileId) => {
    setProductForm(prev => ({
      ...prev,
      files: prev.files.filter(file => file.id !== fileId)
    }))
  }

  // 파일 설명 업데이트 핸들러
  const handleFileDescriptionChange = (fileId, description) => {
    setProductForm(prev => ({
      ...prev,
      files: prev.files.map(file => 
        file.id === fileId ? { ...file, description } : file
      )
    }))
  }

  // 파일 아이콘 결정
  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText className="text-red-500" size={20} />
      case 'audio': return <Music className="text-purple-500" size={20} />
      case 'archive': return <Package className="text-orange-500" size={20} />
      case 'video': return <File className="text-blue-500" size={20} />
      default: return <File className="text-gray-500" size={20} />
    }
  }

  // 이미지 제거 핸들러
  const handleRemoveImage = () => {
    setProductForm(prev => ({
      ...prev,
      image: null,
      imagePreview: null
    }))
  }

  // 기존 핸들러들 (그대로 유지)
  const handleSpecificationChange = (key, value) => {
    setProductForm(prev => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [key]: value
      }
    }))
  }

  const handleArrayChange = (field, index, value) => {
    setProductForm(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }))
  }

  const addArrayItem = (field) => {
    setProductForm(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }))
  }

  const removeArrayItem = (field, index) => {
    if (productForm[field].length > 1) {
      setProductForm(prev => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index)
      }))
    }
  }

  const validateForm = () => {
    if (!productForm.title.trim()) {
      setError('상품명을 입력해주세요.')
      return false
    }
    
    if (!productForm.description.trim()) {
      setError('간단한 설명을 입력해주세요.')
      return false
    }

    if (!productForm.price.trim()) {
      setError('가격을 입력해주세요.')
      return false
    }

    if (!productForm.category) {
      setError('카테고리를 선택해주세요.')
      return false
    }

    // 가격 형식 확인
    const priceNum = parseInt(productForm.price.replace(/[,]/g, ''))
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('올바른 가격을 입력해주세요.')
      return false
    }

    // 빈 특징이나 목차 제거
    const nonEmptyFeatures = productForm.features.filter(f => f.trim())
    const nonEmptyContents = productForm.contents.filter(c => c.trim())

    if (nonEmptyFeatures.length === 0) {
      setError('최소 하나 이상의 주요 특징을 입력해주세요.')
      return false
    }

    if (nonEmptyContents.length === 0) {
      setError('최소 하나 이상의 목차를 입력해주세요.')
      return false
    }

    // 파일이 있다면 모든 파일에 설명이 있는지 확인
    for (const file of productForm.files) {
      if (!file.description.trim()) {
        setError(`"${file.filename}" 파일의 설명을 입력해주세요.`)
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
  
    setIsLoading(true)
    setError('')
  
    try {
      // 가격 포맷팅
      const priceNum = parseInt(productForm.price.replace(/[,]/g, ''))
  
      // 새 상품 데이터 생성
      const newProductData = {
        title: productForm.title.trim(),
        description: productForm.description.trim(),
        detailed_description: productForm.detailedDescription.trim() || productForm.description.trim(),
        price: priceNum,
        icon: productForm.icon,
        image_url: productForm.image,
        category: productForm.category,
        features: productForm.features.filter(f => f.trim()),
        contents: productForm.contents.filter(c => c.trim()),
        files: productForm.files, // 파일 정보 추가
        specifications: Object.fromEntries(
          Object.entries(productForm.specifications).filter(([key, value]) => value.trim())
        )
      }
  
      console.log('💾 저장할 상품 데이터:', newProductData)

      // Supabase에 직접 저장
      const { getSupabase } = await import('../../../../lib/supabase')
      const supabase = getSupabase()
      
      const { data, error } = await supabase
        .from('products')
        .insert([newProductData])
        .select()
        .single()

      if (error) {
        throw error
      }

      console.log('✅ 상품 생성 성공:', data)
      setSuccess('상품이 성공적으로 추가되었습니다!')
      
      setTimeout(() => {
        router.push('/admin/products')
      }, 2000)
  
    } catch (err) {
      console.error('상품 추가 실패:', err)
      setError('상품 추가 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const formatPrice = (value) => {
    const numbers = value.replace(/[^\d]/g, '')
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  const handlePriceChange = (value) => {
    const formatted = formatPrice(value)
    handleInputChange('price', formatted)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* 헤더 */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <button
                onClick={() => router.push('/admin/products')}
                className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>상품 목록으로 돌아가기</span>
              </button>
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-gray-800">새 상품 추가</h1>
              <p className="text-gray-600 mt-2">새로운 음악 교재 상품을 등록하세요</p>
            </div>
          </div>

          {/* 메시지 */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-8 space-y-8">
              
              {/* 기본 정보 */}
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-2">
                  <Package className="text-indigo-600" size={24} />
                  <span>기본 정보</span>
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 상품명 */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      상품명 *
                    </label>
                    <input
                      type="text"
                      value={productForm.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="예: 재즈 피아노 완전정복"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      maxLength={100}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">{productForm.title.length}/100자</p>
                  </div>

                  {/* 간단한 설명 */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      간단한 설명 *
                    </label>
                    <textarea
                      value={productForm.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="상품의 핵심 내용을 간단히 설명해주세요"
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                      maxLength={200}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">{productForm.description.length}/200자</p>
                  </div>

                  {/* 가격 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      가격 (원) *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        value={productForm.price}
                        onChange={(e) => handlePriceChange(e.target.value)}
                        placeholder="45,000"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        required
                      />
                    </div>
                    {productForm.price && (
                      <p className="text-sm text-gray-600 mt-1">
                        미리보기: ₩{productForm.price}
                      </p>
                    )}
                  </div>

                  {/* 카테고리 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      카테고리 *
                    </label>
                    <select
                      value={productForm.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                      required
                    >
                      <option value="">카테고리 선택</option>
                      {availableCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* E-Book 파일 업로드 섹션 */}
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-2">
                  <Download className="text-indigo-600" size={24} />
                  <span>E-Book 파일</span>
                </h2>

                {/* 파일 업로드 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    다운로드 파일 추가
                  </label>
                  
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="text-center">
                      {isUploadingFile ? (
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
                          <p className="text-sm text-gray-600">업로드 중...</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                          <p className="text-sm font-medium text-gray-600 mb-1">
                            파일 업로드
                          </p>
                          <p className="text-xs text-gray-500">
                            PDF, ZIP, MP3, WAV (최대 50MB)
                          </p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.zip,.mp3,.wav,.mp4,.avi"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploadingFile}
                    />
                  </label>
                </div>

                {/* 업로드된 파일 목록 */}
                {productForm.files.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-700">업로드된 파일 ({productForm.files.length}개)</h3>
                    
                    {productForm.files.map((file) => (
                      <div key={file.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getFileIcon(file.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {file.filename}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {file.size} • {file.type}
                                </p>
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(file.id)}
                                className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                              >
                                <X size={16} />
                              </button>
                            </div>
                            
                            <div className="mt-3">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                파일 설명 *
                              </label>
                              <input
                                type="text"
                                value={file.description}
                                onChange={(e) => handleFileDescriptionChange(file.id, e.target.value)}
                                placeholder="예: 메인 교재 PDF, 연습용 음원 파일"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                maxLength={100}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 이미지 업로드 섹션 */}
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-2">
                  <ImageIcon className="text-indigo-600" size={24} />
                  <span>상품 이미지</span>
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 이미지 업로드 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      상품 이미지 (권장)
                    </label>
                    
                    {!productForm.imagePreview ? (
                      <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="text-center">
                          <Camera className="mx-auto text-gray-400 mb-4" size={48} />
                          <p className="text-lg font-medium text-gray-600 mb-2">
                            이미지 업로드
                          </p>
                          <p className="text-sm text-gray-500 mb-2">
                            JPG, PNG, WEBP (최대 5MB)
                          </p>
                          <p className="text-xs text-gray-400">
                            권장 크기: 400x400px 이상
                          </p>
                        </div>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={isLoading}
                        />
                      </label>
                    ) : (
                      <div className="relative">
                        <img
                          src={productForm.imagePreview}
                          alt="상품 이미지 미리보기"
                          className="w-full h-64 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                          disabled={isLoading}
                        >
                          <X size={16} />
                        </button>
                        
                        {isLoading ? (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                            <div className="text-white text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                              <p>업로드 중...</p>
                            </div>
                          </div>
                        ) : (
                          <div className="absolute bottom-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                            ✅ 업로드 완료
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 아이콘 선택 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      아이콘 (이미지가 없을 때 사용)
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {availableIcons.map(icon => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => handleInputChange('icon', icon)}
                          className={`p-3 text-2xl rounded-lg border transition-all ${
                            productForm.icon === icon
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      이미지가 업로드되지 않은 경우 아이콘이 표시됩니다
                    </p>
                  </div>
                </div>
              </div>

              {/* 상세 설명 */}
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-2">
                  <FileText className="text-indigo-600" size={24} />
                  <span>상세 설명</span>
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상세 설명
                  </label>
                  <textarea
                    value={productForm.detailedDescription}
                    onChange={(e) => handleInputChange('detailedDescription', e.target.value)}
                    placeholder="상품에 대한 자세한 설명을 입력하세요 (선택사항)"
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                    maxLength={1000}
                  />
                  <p className="text-xs text-gray-500 mt-1">{productForm.detailedDescription.length}/1000자</p>
                </div>
              </div>

              {/* 주요 특징 */}
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center space-x-2">
                  <Tag className="text-indigo-600" size={24} />
                  <span>주요 특징</span>
                </h2>

                <div className="space-y-3">
                  {productForm.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => handleArrayChange('features', index, e.target.value)}
                        placeholder={`특징 ${index + 1}`}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        maxLength={100}
                      />
                      
                      {productForm.features.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArrayItem('features', index)}
                          className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => addArrayItem('features')}
                    className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    <Plus size={16} />
                    <span>특징 추가</span>
                  </button>
                </div>
              </div>

              {/* 목차 */}
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-6">목차</h2>

                <div className="space-y-3">
                  {productForm.contents.map((content, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="bg-indigo-100 text-indigo-800 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={content}
                        onChange={(e) => handleArrayChange('contents', index, e.target.value)}
                        placeholder={`Chapter ${index + 1}: 내용`}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        maxLength={100}
                      />
                      
                      {productForm.contents.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArrayItem('contents', index)}
                          className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => addArrayItem('contents')}
                    className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    <Plus size={16} />
                    <span>목차 추가</span>
                  </button>
                </div>
              </div>

              {/* 상품 정보 */}
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-6">상품 정보</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      페이지 수
                    </label>
                    <input
                      type="text"
                      value={productForm.specifications['페이지 수']}
                      onChange={(e) => handleSpecificationChange('페이지 수', e.target.value)}
                      placeholder="320페이지"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      난이도
                    </label>
                    <select
                      value={productForm.specifications['난이도']}
                      onChange={(e) => handleSpecificationChange('난이도', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                    >
                      <option value="">난이도 선택</option>
                      {difficultyLevels.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      출판사
                    </label>
                    <input
                      type="text"
                      value={productForm.specifications['출판사']}
                      onChange={(e) => handleSpecificationChange('출판사', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      언어
                    </label>
                    <input
                      type="text"
                      value={productForm.specifications['언어']}
                      onChange={(e) => handleSpecificationChange('언어', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      포함 자료
                    </label>
                    <input
                      type="text"
                      value={productForm.specifications['포함 자료']}
                      onChange={(e) => handleSpecificationChange('포함 자료', e.target.value)}
                      placeholder="MP3 파일, 온라인 강의"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="bg-gray-50 px-8 py-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.push('/admin/products')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isLoading || isUploadingFile}
                className="px-6 py-3 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                <Save size={20} />
                <span>{isLoading ? '저장 중...' : '상품 추가'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}