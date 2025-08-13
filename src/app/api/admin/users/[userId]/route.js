// src/app/api/admin/users/[userId]/route.js
import { getSupabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function DELETE(request, { params }) {
  try {
    console.log('🗑️ 사용자 삭제 API 호출:', params.userId)

    // 인증 확인
    const supabase = getSupabase()
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다.' }, 
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // 토큰으로 사용자 정보 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '유효하지 않은 인증 토큰입니다.' }, 
        { status: 401 }
      )
    }

    // 관리자 권한 확인
    const { data: adminProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || adminProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' }, 
        { status: 403 }
      )
    }

    const userIdToDelete = params.userId

    // 1. 학생 정보 삭제
    console.log('📚 학생 정보 삭제 중...')
    const { error: studentError } = await supabase
      .from('students')
      .delete()
      .eq('user_id', userIdToDelete)

    if (studentError && studentError.code !== 'PGRST116') {
      console.warn('학생 정보 삭제 실패:', studentError)
    } else {
      console.log('✅ 학생 정보 삭제 완료')
    }

    // 2. 강사 정보 삭제
    console.log('👨‍🏫 강사 정보 삭제 중...')
    const { error: teacherError } = await supabase
      .from('teachers')
      .delete()
      .eq('user_id', userIdToDelete)

    if (teacherError && teacherError.code !== 'PGRST116') {
      console.warn('강사 정보 삭제 실패:', teacherError)
    } else {
      console.log('✅ 강사 정보 삭제 완료')
    }

    // 3. 사용자 프로필 삭제
    console.log('👤 사용자 프로필 삭제 중...')
    const { error: profileDeleteError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userIdToDelete)

    if (profileDeleteError) {
      console.error('사용자 프로필 삭제 실패:', profileDeleteError)
      return NextResponse.json(
        { error: '사용자 프로필 삭제에 실패했습니다.' }, 
        { status: 500 }
      )
    }
    console.log('✅ 사용자 프로필 삭제 완료')

    // 4. Auth 사용자 삭제 (관리자 권한으로)
    console.log('🔐 Auth 사용자 삭제 중...')
    
    // Supabase Admin API 사용 (서비스 키 필요)
    const { createClient } = await import('@supabase/supabase-js')
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY가 설정되지 않음 - Auth 사용자는 삭제되지 않습니다')
      return NextResponse.json({ 
        success: true, 
        message: '프로필 데이터는 삭제되었지만 Auth 사용자는 삭제되지 않았습니다. SUPABASE_SERVICE_ROLE_KEY를 설정해주세요.' 
      })
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(userIdToDelete)

    if (authDeleteError) {
      console.error('Auth 사용자 삭제 실패:', authDeleteError)
      return NextResponse.json(
        { error: 'Auth 사용자 삭제에 실패했습니다: ' + authDeleteError.message }, 
        { status: 500 }
      )
    }

    console.log('✅ Auth 사용자 삭제 완료')
    console.log('🎉 사용자 완전 삭제 성공:', userIdToDelete)

    return NextResponse.json({ 
      success: true, 
      message: '사용자가 완전히 삭제되었습니다.' 
    })

  } catch (error) {
    console.error('💥 사용자 삭제 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다: ' + error.message }, 
      { status: 500 }
    )
  }
}