import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
	try {
		const authHeader = request.headers.get('authorization')
		if (!authHeader) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
		const token = authHeader.replace('Bearer ', '')
		const { data: { user }, error: authError } = await supabase.auth.getUser(token)
		if (authError || !user) return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 })
		const { data: profile } = await supabase.from('user_profiles').select('role').eq('user_id', user.id).single()
		if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

		// 1) 결제/출석/수업/사용자 조인으로 기본 데이터
		const { data: payments, error } = await supabase
			.from('class_payments')
			.select(`
				id, class_id, student_id, attendance_count, last_attendance_date, payment_status,
				classes(id, title, status, teacher_id),
				user_profiles:student_id!inner(name),
				class_paid:class_paid!class_paid_class_payment_id_fkey(payment_amount)
			`)
			.order('updated_at', { ascending: false })
		if (error) return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })

		const base = (payments || []).map((row) => {
			const totalPaid = (row.class_paid || []).reduce((s, r) => s + (r.payment_amount || 0), 0)
			const remaining = (row.attendance_count || 0) - totalPaid
			return {
				id: row.id,
				class_id: row.class_id,
				student_id: row.student_id,
				attendance_count: row.attendance_count,
				last_attendance_date: row.last_attendance_date,
				payment_status: row.payment_status,
				total_paid_amount: totalPaid,
				remaining_attendance: remaining,
				class_title: row.classes?.title || 'Unknown Class',
				class_status: row.classes?.status || null,
				teacher_id: row.classes?.teacher_id || null,
				student_name: row.user_profiles?.name || 'Unknown',
			}
		})

		// 2) 활성 등록 여부 확인 후 필터
		const results = []
		for (const p of base) {
			if ((p.remaining_attendance || 0) <= 0) continue
			let activeEnrollment = false
			if (p.class_status === 'active') {
				const { data: cs } = await supabase
					.from('class_students')
					.select('id')
					.eq('class_id', p.class_id)
					.eq('student_id', p.student_id)
					.eq('status', 'active')
					.limit(1)
				activeEnrollment = Array.isArray(cs) && cs.length > 0
			}
			if (p.class_status !== 'active' || !activeEnrollment) {
				results.push(p)
			}
		}

		return NextResponse.json({ items: results })
	} catch (error) {
		console.error('Payments non-continuing API error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}


