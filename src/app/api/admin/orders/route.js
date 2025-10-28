import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET(request) {
  try {
    // 1) 인증 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]

    // 2) 사용자 확인
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      return Response.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 })
    }

    // 3) 관리자 권한 확인 (user_profiles.role === 'admin')
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return Response.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    // 4) 전체 주문 조회 (Service Role)
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        users (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return Response.json({ error: '주문 조회 실패' }, { status: 500 })
    }

    return Response.json({ orders: data || [] })
  } catch (error) {
    return Response.json({ error: '서버 오류', details: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, status } = body || {}
    if (!id || !status) {
      return Response.json({ error: 'id와 status가 필요합니다' }, { status: 400 })
    }

    // 인증 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    const token = authHeader.split(' ')[1]

    // 사용자 확인
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user } } = await supabaseClient.auth.getUser(token)
    if (!user) {
      return Response.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 })
    }

    // 관리자 권한 확인
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    if (!profile || profile.role !== 'admin') {
      return Response.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    // 상태 업데이트
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return Response.json({ error: '상태 변경 실패' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: '서버 오류', details: error.message }, { status: 500 })
  }
}


