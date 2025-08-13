import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
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

    // 방 목록 조회
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .order('name', { ascending: true })

    if (roomsError) {
      console.error('방 목록 조회 오류:', roomsError)
      return NextResponse.json({ error: '방 목록을 불러오는데 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ rooms: rooms || [] })

  } catch (error) {
    console.error('서버 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 