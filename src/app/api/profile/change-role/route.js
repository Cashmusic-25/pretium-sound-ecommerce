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
    const body = await request.json().catch(() => ({}))
    const { role } = body || {}

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      return Response.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 })
    }

    if (!role || !['admin', 'user'].includes(role)) {
      return Response.json({ error: '유효하지 않은 역할' }, { status: 400 })
    }

    // 보안: 본인 계정에 대해서만 변경 허용 (관리자 승격 프로세스 가정)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // users 테이블 업데이트
    const { error: updateUserError } = await supabaseAdmin
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (updateUserError) {
      console.error('역할 변경(users) 실패:', updateUserError)
      return Response.json({ error: '역할 변경에 실패했습니다' }, { status: 500 })
    }

    // auth 메타데이터에도 반영
    const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...(user.user_metadata || {}), role }
    })

    if (metaError) {
      console.warn('메타데이터 업데이트 경고:', metaError)
    }

    return Response.json({ success: true, role })
  } catch (error) {
    console.error('역할 변경 API 오류:', error)
    return Response.json({ error: '서버 오류' }, { status: 500 })
  }
}


