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

    // 사용자 토큰 검증
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      return Response.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 })
    }

    // Service Role 클라이언트로 삭제 수행
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 1) users 테이블에서 레코드 삭제 (존재 시)
    const { error: userRowError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user.id)

    if (userRowError) {
      // 계속 진행 (사용자 행이 없을 수도 있음)
      console.warn('users 테이블 삭제 경고:', userRowError)
    }

    // 2) Auth 사용자 삭제
    const { error: adminDelError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (adminDelError) {
      console.error('auth 사용자 삭제 실패:', adminDelError)
      return Response.json({ error: '계정 삭제에 실패했습니다' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('계정 삭제 API 오류:', error)
    return Response.json({ error: '서버 오류' }, { status: 500 })
  }
}


