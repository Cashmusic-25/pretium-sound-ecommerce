// src/app/api/hero-slides/route.js
import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET() {
  try {
    if (!supabase) {
      console.error('❌ Supabase 연결 실패')
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        slides: []
      }, { status: 500 })
    }

    // show_in_hero가 true인 상품들을 hero_order 순으로 조회
    const { data: heroSlides, error } = await supabase
      .from('products')
      .select(`
        id,
        title,
        price,
        description,
        category,
        icon,
        hero_title,
        hero_subtitle,
        hero_image_url,
        hero_category,
        hero_category_color,
        hero_order,
        image_url
      `)
      .eq('show_in_hero', true)
      .eq('is_active', true)
      .order('hero_order', { ascending: true })

    if (error) {
      console.error('❌ 히어로 슬라이더 조회 실패:', error)
      throw error
    }

    // 데이터 가공
    const processedSlides = heroSlides?.map(slide => ({
      id: slide.id,
      image: slide.hero_image_url || slide.image_url, // 히어로 이미지가 없으면 상품 이미지 사용
      title: slide.hero_title || slide.title,
      subtitle: slide.hero_subtitle || slide.description, // 서브타이틀이 없으면 설명 사용
      category: slide.hero_category || slide.category || '상품',
      categoryColor: slide.hero_category_color || 'bg-blue-500',
      order: slide.hero_order || 0,
      // 상품 정보 추가
      price: typeof slide.price === 'number' ? `₩${slide.price.toLocaleString()}` : (slide.price || '가격 문의'),
      description: slide.description || '',
      icon: slide.icon || '🎵'
    })) || []



    return NextResponse.json({
      success: true,
      slides: processedSlides,
      count: processedSlides.length
    })

  } catch (error) {
    console.error('💥 히어로 슬라이더 API 에러:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      slides: []
    }, { status: 500 })
  }
}