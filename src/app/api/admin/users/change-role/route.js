import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    const token = authHeader.split(' ')[1]
    const { targetUserId, role } = await request.json()

    if (!targetUserId || !role || !['admin', 'user'].includes(role)) {
      return Response.json({ error: '유효하지 않은 요청' }, { status: 400 })
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      return Response.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 })
    }

    // 관리자 권한 확인 (이메일 또는 메타데이터)
    const isAdmin = user.email === 'admin@pretiumsound.com' || user.email === 'jasonincompany@gmail.com' || user.user_metadata?.role === 'admin'
    if (!isAdmin) {
      return Response.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // users 테이블 역할 업데이트
    const { error: updateUserError } = await supabaseAdmin
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', targetUserId)

    if (updateUserError) {
      console.error('역할 변경(users) 실패:', updateUserError)
      return Response.json({ error: '역할 변경 실패' }, { status: 500 })
    }

    // auth 메타데이터 업데이트
    const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      user_metadata: { role }
    })
    if (metaError) {
      console.warn('메타데이터 업데이트 경고:', metaError)
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('관리자 역할 변경 API 오류:', error)
    return Response.json({ error: '서버 오류' }, { status: 500 })
  }
}


