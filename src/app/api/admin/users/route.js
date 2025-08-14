import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') // 'teacher' | 'student' | null

    // 인증 확인
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

    let query = supabase.from('user_profiles').select('user_id,name,email,role').order('name')
    if (role) {
      query = query.eq('role', role)
    }
    const { data, error } = await query
    if (error) {
      console.error('사용자 목록 조회 오류:', error)
      return NextResponse.json({ error: '사용자 목록을 불러오는데 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ users: data || [] })
  } catch (error) {
    console.error('서버 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}


