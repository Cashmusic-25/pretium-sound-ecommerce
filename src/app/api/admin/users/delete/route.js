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
    const { targetUserId } = await request.json()
    if (!targetUserId) {
      return Response.json({ error: '유효하지 않은 요청' }, { status: 400 })
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      return Response.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 })
    }

    // 관리자 권한 확인
    const isAdmin = user.email === 'admin@pretiumsound.com' || user.email === 'jasonincompany@gmail.com' || user.user_metadata?.role === 'admin'
    if (!isAdmin) {
      return Response.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 종속 데이터 삭제/정리 필요시 이곳에서 처리 (orders/reviews 등)
    const { error: userRowError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', targetUserId)
    if (userRowError) {
      console.warn('users 삭제 경고:', userRowError)
    }

    const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)
    if (delError) {
      console.error('auth 사용자 삭제 실패:', delError)
      return Response.json({ error: '사용자 삭제 실패' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('관리자 사용자 삭제 API 오류:', error)
    return Response.json({ error: '서버 오류' }, { status: 500 })
  }
}


