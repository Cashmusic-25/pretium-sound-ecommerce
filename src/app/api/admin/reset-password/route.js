import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    // 인증 확인 (관리자 권한)
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 })
    }

    // 관리자 권한 확인
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    // 요청 본문 파싱
    const { email, newPassword } = await request.json()

    if (!email || !newPassword) {
      return NextResponse.json({ error: '이메일과 새 비밀번호가 필요합니다.' }, { status: 400 })
    }

    // 사용자 ID 찾기
    const { data: users, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      return NextResponse.json({ error: '사용자 목록을 가져오는데 실패했습니다.' }, { status: 500 })
    }

    const targetUser = users.users.find(u => u.email === email)
    
    if (!targetUser) {
      return NextResponse.json({ error: '해당 이메일의 사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 비밀번호 변경
    const { data, error } = await supabase.auth.admin.updateUserById(
      targetUser.id,
      { password: newPassword }
    )

    if (error) {
      console.error('비밀번호 변경 오류:', error)
      return NextResponse.json({ error: '비밀번호 변경에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: '비밀번호가 성공적으로 변경되었습니다.',
      user: { id: targetUser.id, email: targetUser.email }
    })

  } catch (error) {
    console.error('서버 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 