import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET(req) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const subject = searchParams.get('subject')

  if (!subject) {
    return NextResponse.json({ error: 'subject 파라미터가 필요합니다.' }, { status: 400 })
  }

  // 1. 조건에 맞는 강사(user_profiles) 모두 조회
  const { data: teachers, error } = await supabase
    .from('user_profiles')
    .select('user_id, name, email, subjects, specialization')
    .eq('role', 'teacher')
    .eq('status', 'approved')
    .contains('subjects', [subject])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!teachers || teachers.length === 0) {
    return NextResponse.json([])
  }

  // 2. 각 강사별로 teacher_availability에 데이터가 있는지 확인
  const teacherIds = teachers.map(t => t.user_id)
  const { data: availabilities, error: availError } = await supabase
    .from('teacher_availability')
    .select('teacher_id')
    .in('teacher_id', teacherIds)

  if (availError) {
    return NextResponse.json({ error: availError.message }, { status: 500 })
  }

  const availableTeacherIds = new Set(availabilities.map(a => a.teacher_id))
  const filteredTeachers = teachers.filter(t => availableTeacherIds.has(t.user_id))

  return NextResponse.json(filteredTeachers)
} 