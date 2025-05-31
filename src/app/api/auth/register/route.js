import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase } from '../../../../lib/supabase'

export async function POST(request) {
  try {
    const { email, password, name } = await request.json()

    // 입력 검증
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: '이메일, 비밀번호, 이름은 필수입니다.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 최소 6자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    // 이메일 중복 확인
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: '이미 등록된 이메일입니다.' },
        { status: 409 }
      )
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 12)

    // 사용자 생성
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password_hash: hashedPassword,
          name,
          role: 'user'
        }
      ])
      .select('id, email, name, role, created_at')
      .single()

    if (error) {
      console.error('User creation error:', error)
      return NextResponse.json(
        { error: '회원가입 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 비밀번호 제외하고 반환
    const { password_hash, ...userWithoutPassword } = newUser

    return NextResponse.json({
      message: '회원가입이 완료되었습니다.',
      user: userWithoutPassword
    }, { status: 201 })

  } catch (error) {
    console.error('Register API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}