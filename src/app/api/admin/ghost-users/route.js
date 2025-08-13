// src/app/api/admin/ghost-users/route.js
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    console.log('👻 유령 사용자 찾기 API 호출')

    // 인증 확인
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다.' }, 
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // 서비스 키 확인
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.' }, 
        { status: 500 }
      )
    }

    // Admin Supabase 클라이언트 생성 (서비스 키 사용)
    const { createClient } = await import('@supabase/supabase-js')
    
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

    // 현재 요청자가 관리자인지 확인
    const { getSupabase } = await import('@/lib/supabase')
    const supabase = getSupabase()
    
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

    console.log('🔐 관리자 권한 확인 완료')

    // 1. Auth에서 모든 사용자 가져오기 (서비스 키 사용)
    console.log('📊 Auth 사용자 목록 조회 중...')
    
    const { data: authUsers, error: authUsersError } = await adminSupabase.auth.admin.listUsers()

    if (authUsersError) {
      console.error('Auth 사용자 목록 조회 실패:', authUsersError)
      return NextResponse.json(
        { error: 'Auth 사용자 목록 조회에 실패했습니다: ' + authUsersError.message }, 
        { status: 500 }
      )
    }

    console.log(`✅ Auth 사용자 ${authUsers.users?.length || 0}명 조회 완료`)

    // 2. user_profiles에서 모든 사용자 가져오기
    console.log('📋 프로필 사용자 목록 조회 중...')
    
    const { data: profileUsers, error: profileUsersError } = await supabase
      .from('user_profiles')
      .select('user_id, email')

    if (profileUsersError) {
      console.error('프로필 사용자 목록 조회 실패:', profileUsersError)
      return NextResponse.json(
        { error: '프로필 사용자 목록 조회에 실패했습니다: ' + profileUsersError.message }, 
        { status: 500 }
      )
    }

    console.log(`✅ 프로필 사용자 ${profileUsers?.length || 0}명 조회 완료`)

    // 3. Auth에는 있지만 user_profiles에는 없는 사용자 찾기 (유령 사용자)
    const profileUserIds = new Set(profileUsers?.map(p => p.user_id) || [])
    
    const ghostUsers = authUsers.users?.filter(authUser => 
      !profileUserIds.has(authUser.id)
    ).map(authUser => ({
      id: authUser.id,
      email: authUser.email,
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at
    })) || []

    console.log(`👻 유령 사용자 ${ghostUsers.length}명 발견`)

    return NextResponse.json({
      success: true,
      ghostUsers,
      stats: {
        authUsers: authUsers.users?.length || 0,
        profileUsers: profileUsers?.length || 0,
        ghostUsers: ghostUsers.length
      }
    })

  } catch (error) {
    console.error('💥 유령 사용자 찾기 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다: ' + error.message }, 
      { status: 500 }
    )
  }
} 