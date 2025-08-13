import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get('teacherId')

    if (!teacherId) {
      return NextResponse.json({ 
        success: false, 
        error: 'teacherId 파라미터가 필요합니다.' 
      }, { status: 400 })
    }

    console.log('🔍 공개 API: 강사 이용 가능 시간 조회 시작:', teacherId)

    // 강사 이용 가능 시간 조회 (서비스 키로 RLS 우회)
    const { data: availabilityData, error: availabilityError } = await supabase
      .from('teacher_availability')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('is_available', true)
      .order('day_of_week')
      .order('start_time')

    if (availabilityError) {
      console.error('❌ 강사 이용 가능 시간 조회 오류:', availabilityError)
      return NextResponse.json({ 
        success: false, 
        error: '이용 가능 시간 조회에 실패했습니다.' 
      }, { status: 500 })
    }

    console.log('✅ 공개 API: 강사 이용 가능 시간 조회 완료:', availabilityData?.length, '개')

    return NextResponse.json({
      success: true,
      availability: availabilityData || []
    })

  } catch (error) {
    console.error('공개 강사 이용 가능 시간 API 오류:', error)
    return NextResponse.json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    }, { status: 500 })
  }
} 