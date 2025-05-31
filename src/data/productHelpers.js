
// src/data/productHelpers.js에 이 함수가 있는지 확인하고, 없으면 추가하세요

import { supabase } from '../lib/supabase'

// 이미지를 Supabase Storage에 업로드 (디버깅 로그 포함)
export async function uploadProductImage(file) {
  console.log('🔄 이미지 업로드 시작:', file.name, file.size);
  
  try {
    // Supabase 연결 확인
    console.log('📡 Supabase 클라이언트:', supabase);
    
    // 파일명 생성 (중복 방지)
    const fileExt = file.name.split('.').pop()
    const fileName = `product_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `products/${fileName}`
    
    console.log('📁 파일 경로:', filePath);

    // Supabase Storage에 업로드
    console.log('⬆️ Supabase Storage 업로드 시도...');
    const { data, error } = await supabase.storage
      .from('product-images') // 'product-images' 버킷에 업로드
      .upload(filePath, file)

    console.log('📤 업로드 결과 - data:', data);
    console.log('❌ 업로드 결과 - error:', error);

    if (error) {
      console.error('🚨 이미지 업로드 실패:', error)
      throw error
    }

    // 공개 URL 생성
    console.log('🔗 공개 URL 생성 중...');
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath)

    console.log('✅ 생성된 공개 URL:', publicUrl);

    return {
      url: publicUrl,
      path: filePath
    }
  } catch (error) {
    console.error('💥 이미지 업로드 에러:', error)
    throw error
  }
}

// 2. 관리자 페이지의 handleImageUpload 함수 수정

const handleImageUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  // 파일 크기 체크 (5MB 제한)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    setError('이미지 크기는 5MB 이하만 가능합니다.')
    return
  }

  // 파일 타입 체크
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    setError('JPG, PNG, WEBP 파일만 업로드 가능합니다.')
    return
  }

  // 업로드 진행상태 표시
  setIsLoading(true)
  setError('')

  try {
    // 미리보기 URL 생성 (즉시 표시용)
    const previewUrl = URL.createObjectURL(file)
    setProductForm(prev => ({
      ...prev,
      imagePreview: previewUrl
    }))

    // Supabase Storage에 업로드
    const { url, path } = await uploadProductImage(file)
    
    // 실제 업로드된 URL로 업데이트
    setProductForm(prev => ({
      ...prev,
      image: url, // 실제 Supabase URL
      imagePath: path, // 삭제용 경로
      imagePreview: url
    }))

    setSuccess('이미지 업로드 완료!')
    
  } catch (error) {
    setError('이미지 업로드 실패: ' + error.message)
    // 실패 시 미리보기 제거
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

// 3. productForm 상태에 imagePath 추가

const [productForm, setProductForm] = useState({
  title: '',
  description: '',
  detailedDescription: '',
  price: '',
  icon: '🎵',
  image: null,        // Supabase URL
  imagePath: null,    // Supabase 파일 경로 (삭제용)
  imagePreview: null, // 미리보기 URL
  category: '',
  features: [''],
  contents: [''],
  specifications: {
    '페이지 수': '',
    '난이도': '',
    '출판사': 'Pretium Sound',
    '언어': '한국어',
    '포함 자료': ''
  }
})

// 4. productHelpers.js의 createProduct 함수도 수정

export async function createProduct(productData) {
  try {
    // 가격을 숫자로 변환
    const priceNumber = typeof productData.price === 'string' 
      ? parseInt(productData.price.replace(/[₩,]/g, ''))
      : productData.price

    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          ...productData,
          price: priceNumber,
          is_active: true,
          created_at: new Date().toISOString(),
          // image URL은 이미 Supabase Storage URL이므로 그대로 저장
          image: productData.image
        }
      ])
      .select()
      .single()

    if (error) throw error

    return {
      ...data,
      price: data.price ? `₩${data.price.toLocaleString()}` : '₩0'
    }
  } catch (error) {
    console.error('Error creating product:', error)
    throw error
  }
}