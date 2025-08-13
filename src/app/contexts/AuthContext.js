// src/contexts/AuthContext.js - 출결 시스템용 역할 확장 버전 (수정됨)
'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getSupabase } from '../../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null) // 사용자 프로필 정보 추가
  const [loading, setLoading] = useState(true)
  const [supabase, setSupabase] = useState(null)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [supabaseReady, setSupabaseReady] = useState(false)
  const [wishlist, setWishlist] = useState([])

  // 위시리스트 관련 함수들 (기존 코드 유지)
  const getWishlistKey = (userId) => `wishlist_${userId}`

  const loadWishlist = useCallback((userId) => {
    if (!userId) return []
    
    try {
      const savedWishlist = localStorage.getItem(getWishlistKey(userId))
      return savedWishlist ? JSON.parse(savedWishlist) : []
    } catch (error) {
      console.warn('위시리스트 로드 실패:', error)
      return []
    }
  }, [])

  const saveWishlist = useCallback((userId, wishlistData) => {
    if (!userId) return
    
    try {
      localStorage.setItem(getWishlistKey(userId), JSON.stringify(wishlistData))
    } catch (error) {
      console.warn('위시리스트 저장 실패:', error)
    }
  }, [])

  const toggleWishlist = useCallback((productId) => {
    if (!user) {
      throw new Error('로그인이 필요합니다.')
    }

    setWishlist(prevWishlist => {
      const productIdStr = String(productId)
      const isInWishlist = prevWishlist.includes(productIdStr)
      
      let newWishlist
      if (isInWishlist) {
        newWishlist = prevWishlist.filter(id => id !== productIdStr)
      } else {
        newWishlist = [...prevWishlist, productIdStr]
      }
      
      saveWishlist(user.id, newWishlist)
      return newWishlist
    })
    
    return !wishlist.includes(String(productId))
  }, [user, saveWishlist, wishlist])

  const isInWishlist = useCallback((productId) => {
    return wishlist.includes(String(productId))
  }, [wishlist])

  const getWishlist = useCallback(() => {
    return wishlist
  }, [wishlist])

  const clearWishlist = useCallback(() => {
    if (!user) return
    
    setWishlist([])
    saveWishlist(user.id, [])
  }, [user, saveWishlist])

  // 사용자 프로필 정보 로드 (수정됨 - null 체크 강화)
  const loadUserProfile = useCallback(async (userId, supabaseClient = null) => {
    // supabase 클라이언트가 매개변수로 전달되지 않으면 상태에서 가져옴
    const client = supabaseClient || supabase
    
    if (!userId || !client) {
      return null
    }

    try {
      const { data, error } = await client
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        // 프로필이 없는 경우 (새로 가입한 사용자일 수 있음)
        if (error.code === 'PGRST116') {
          return null
        }
        console.error('사용자 프로필 로드 실패:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('사용자 프로필 로드 중 오류:', error)
      return null
    }
  }, [supabase])

  // 역할별 권한 확인 함수들
  const isAdmin = useCallback(() => {
    return userProfile?.role === 'admin' || user?.email === 'admin@pretiumsound.com'
  }, [userProfile, user])

  const isTeacher = useCallback(() => {
    return userProfile?.role === 'teacher'
  }, [userProfile])

  const isStudent = useCallback(() => {
    return userProfile?.role === 'student'
  }, [userProfile])

  const isApprovedTeacher = useCallback(async () => {
    if (!isTeacher() || !supabase || !user) return false

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('status')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('강사 승인 상태 확인 실패:', error)
        return false
      }

      return data?.status === 'approved'
    } catch (error) {
      console.error('강사 승인 상태 확인 중 오류:', error)
      return false
    }
  }, [isTeacher, supabase, user])

  // 강사 승인 상태 확인 (동기 버전)
  const getTeacherStatus = useCallback(() => {
    if (!isTeacher() || !userProfile) return null
    
    // userProfile에 teacherInfo가 있다면 거기서 status 가져오기
    // 없다면 별도로 조회 필요
    return 'pending' // 기본값은 승인 대기
  }, [isTeacher, userProfile])

  // 강사가 승인되지 않았을 때 로그인 제한
  const checkTeacherApproval = useCallback(async () => {
    if (!isTeacher() || !supabase || !user) return true

    try {
      let { data, error } = await supabase
        .from('user_profiles')
        .select('status')
        .eq('user_id', user.id)
        .single()

      // user_profiles row가 없으면 자동 생성
      if (error && error.code === 'PGRST116') {
        console.warn('user_profiles row 없음, 자동 생성 시도')
        const insertRes = await supabase
          .from('user_profiles')
          .insert([
            {
              user_id: user.id,
              status: 'pending'
            }
          ])
        // 생성 후 재조회
        const retry = await supabase
          .from('user_profiles')
          .select('status')
          .eq('user_id', user.id)
          .single()
        data = retry.data
        error = retry.error
      }

      if (error) {
        console.error('강사 승인 상태 확인 실패:', error)
        return false
      }

      const status = data?.status
      if (status === 'rejected') {
        throw new Error('강사 승인이 거부되었습니다. 관리자에게 문의해주세요.')
      }
      if (status === 'pending') {
        throw new Error('강사 승인이 완료되지 않았습니다. 승인 완료 후 다시 로그인해주세요.')
      }
      return status === 'approved'
    } catch (error) {
      console.error('강사 승인 확인 중 오류:', error)
      throw error
    }
  }, [isTeacher, supabase, user])

  // 사용자 역할 정보 가져오기
  const getUserRole = useCallback(() => {
    return userProfile?.role || 'user'
  }, [userProfile])

  // 사용자 추가 정보 가져오기 (학생/강사 정보)
  const getUserAdditionalInfo = useCallback(async () => {
    if (!user || !supabase) return null

    try {
      const role = getUserRole()
      
      if (role === 'student') {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('학생 정보 로드 실패:', error)
          return null
        }

        return { type: 'student', data }
      } else if (role === 'teacher') {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('강사 정보 로드 실패:', error)
          return null
        }

        return { type: 'teacher', data }
      }

      return null
    } catch (error) {
      console.error('사용자 추가 정보 로드 중 오류:', error)
      return null
    }
  }, [user, supabase, getUserRole])

  // 인증된 API 요청 함수 (useCallback으로 메모이제이션하여 무한 로딩 방지)
  // 반복 수업 세션 생성 함수
  const createRecurringClasses = async (enrollmentData, additionalData, userArg) => {
    const currentUser = userArg || user;
    if (!currentUser || !currentUser.id) {
      throw new Error('로그인 정보가 없습니다. 다시 로그인 해주세요.')
    }
    if (!enrollmentData || !enrollmentData.student_id) {
      throw new Error('수업 등록 정보에 학생 ID가 없습니다.')
    }

    const startDate = new Date(enrollmentData.start_date)
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 3) // 3개월 후까지 생성

    // 강사 이름 조회
    const { data: teacherProfile } = await supabase
      .from('user_profiles')
      .select('name')
      .eq('user_id', enrollmentData.teacher_id)
      .single()

    const teacherName = teacherProfile?.name || '강사'

    // 학생 이름 조회
    const { data: studentProfile } = await supabase
      .from('user_profiles')
      .select('name')
      .eq('user_id', currentUser.id)
      .single()

    const studentName = studentProfile?.name || '학생'

    // 매주 반복되는 수업 세션들 생성
    const classesToCreate = []
    let currentDate = new Date(startDate)

    // 요일 조정 (startDate부터 해당 요일까지)
    const dayOfWeek = enrollmentData.day_of_week
    const dayDiff = (dayOfWeek - currentDate.getDay() + 7) % 7
    currentDate.setDate(currentDate.getDate() + dayDiff)

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const endTime = calculateEndTime(enrollmentData.lesson_time, enrollmentData.lesson_duration)
      classesToCreate.push({
        title: `${additionalData.selectedSubject || '개인레슨'} - ${studentName}`,
        room_id: enrollmentData.room_id,
        day_of_week: dayOfWeek,
        start_time: enrollmentData.lesson_time,
        duration: enrollmentData.lesson_duration,
        status: enrollmentData.status || 'active',
        teacher_id: enrollmentData.teacher_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      currentDate.setDate(currentDate.getDate() + 7)
    }

    console.log('🗓️ 생성할 수업 세션들:', classesToCreate.length, '개')

    // classes_new 테이블에 일괄 삽입
    const { data: insertedClasses, error: classInsertError } = await supabase
      .from('classes_new')
      .insert(classesToCreate)
      .select()

    if (classInsertError) {
      console.error('수업 세션 생성 실패:', classInsertError)
      throw classInsertError
    }

    // 각 수업 세션에 학생 매핑(class_students)도 생성
    if (insertedClasses && insertedClasses.length > 0) {
      const classStudentsToCreate = insertedClasses.map(cls => ({
        class_id: cls.id,
        student_id: currentUser.id,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
      const { error: csError } = await supabase.from('class_students').insert(classStudentsToCreate)
      if (csError) {
        console.error('class_students insert 실패:', csError)
      } else {
        // 학생이 수업에 등록된 후 user_profiles의 subjects 필드 업데이트
        try {
          // 현재 학생의 수업 과목들을 가져오기
          const { data: studentClasses, error: classesError } = await supabase
            .from('class_students')
            .select(`
              classes (
                subject
              )
            `)
            .eq('student_id', currentUser.id)
            .eq('status', 'active')

          if (classesError) {
            console.error('학생 수업 정보 조회 실패:', classesError)
          } else {
            // 중복 제거된 과목 목록 생성
            const subjects = [...new Set(studentClasses?.map(cs => cs.classes?.subject).filter(Boolean) || [])]
            
            // user_profiles 업데이트
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({ 
                subjects: subjects,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', currentUser.id)

            if (updateError) {
              console.error('user_profiles subjects 업데이트 실패:', updateError)
            } else {
              console.log('✅ 학생 과목 정보 업데이트 완료:', subjects)
            }
          }
        } catch (error) {
          console.error('학생 과목 정보 업데이트 중 오류:', error)
        }
      }
    }

    console.log('✅ 수업 세션 생성 완료:', classesToCreate.length, '개')
  }

  // 수업 종료 시간 계산
  const calculateEndTime = (startTime, duration) => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const startMinutes = hours * 60 + minutes
    const endMinutes = startMinutes + duration
    const endHours = Math.floor(endMinutes / 60)
    const endMins = endMinutes % 60
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
  }

  const makeAuthenticatedRequest = useCallback(async (url, options = {}) => {
    try {
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      if (!supabase) {
        throw new Error('Supabase 클라이언트가 준비되지 않았습니다.');
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('세션 가져오기 오류:', sessionError);
        throw new Error('세션을 가져올 수 없습니다.');
      }

      if (!session?.access_token) {
        throw new Error('유효한 세션이 없습니다.');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        ...options.headers
      };

      const response = await fetch(url, {
        ...options,
        headers
      });

      return response;

    } catch (error) {
      console.error('❌ makeAuthenticatedRequest 오류:', error);
      throw error;
    }
  }, [user, supabase]);

  // 기존 리뷰 관련 함수들 (코드 유지)
  const hasPurchasedProduct = async (productId) => {
    if (!user || !supabase) return false

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('items')
        .eq('status', 'delivered')

      if (error) {
        console.error('구매 여부 확인 실패:', error)
        return false
      }

      const hasPurchased = data.some(order => 
        order.items?.some(item => item.id === productId || item.id === parseInt(productId))
      )

      return hasPurchased

    } catch (error) {
      console.error('구매 여부 확인 중 오류:', error)
      return false
    }
  }

  const hasReviewedProduct = async (productId) => {
    if (!user || !supabase) return false

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('id')
        .eq('product_id', productId)

      if (error) {
        console.error('리뷰 확인 실패:', error)
        return false
      }

      return data.length > 0

    } catch (error) {
      console.error('리뷰 확인 중 오류:', error)
      return false
    }
  }

  const addReview = async (reviewData) => {
    if (!user || !supabase) {
      throw new Error('로그인이 필요합니다.')
    }

    try {
      const supabaseReviewData = {
        product_id: reviewData.product_id,
        rating: reviewData.rating,
        title: reviewData.title || '',
        content: reviewData.content,
        photos: reviewData.photos || [],
        verified: true
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert([supabaseReviewData])
        .select()
        .single()

      if (error) {
        console.error('리뷰 저장 실패:', error)
        throw error
      }

      return data

    } catch (error) {
      console.error('리뷰 추가 실패:', error)
      throw error
    }
  }

  const updateReview = async (reviewId, reviewData) => {
    if (!user || !supabase) {
      throw new Error('로그인이 필요합니다.')
    }

    try {
      const { data, error } = await supabase
        .from('reviews')
        .update({
          rating: reviewData.rating,
          title: reviewData.title || '',
          content: reviewData.content,
          photos: reviewData.photos || [],
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)
        .select()
        .single()

      if (error) {
        console.error('리뷰 수정 실패:', error)
        throw error
      }

      return data

    } catch (error) {
      console.error('리뷰 수정 실패:', error)
      throw error
    }
  }

  const deleteReview = async (reviewId) => {
    if (!user || !supabase) {
      throw new Error('로그인이 필요합니다.')
    }

    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)

      if (error) {
        console.error('리뷰 삭제 실패:', error)
        throw error
      }

      return true

    } catch (error) {
      console.error('리뷰 삭제 실패:', error)
      throw error
    }
  }

  // 초기화 함수 (수정됨 - Supabase 클라이언트 전달)
  const initializeAuth = useCallback(async () => {
    if (typeof window === 'undefined') {
      setLoading(false)
      return
    }

    try {
  
      setError(null)
      
      const client = await getSupabase()
      if (!client) {
        throw new Error('Supabase 클라이언트를 생성할 수 없습니다. 환경 변수를 확인해주세요.')
      }

      setSupabase(client)
      setSupabaseReady(true)

      const { data: { session }, error: sessionError } = await client.auth.getSession()
      
      if (sessionError) {
        console.warn('세션 가져오기 경고:', sessionError)
      } 
      
      if (session?.user) {
        setUser(session.user)
        
        // 사용자 프로필 로드 (클라이언트를 명시적으로 전달)
        const profile = await loadUserProfile(session.user.id, client)
        setUserProfile(profile) // 프로필 상태 설정 추가
        
        // 강사인 경우 승인 상태 확인
        if (profile?.role === 'teacher') {
          try {
            await checkTeacherApproval()
          } catch (error) {
            console.error('강사 승인 상태 오류:', error.message)
            // 승인되지 않은 강사는 로그아웃
            await client.auth.signOut()
            setUser(null)
            setUserProfile(null)
            setWishlist([])
            setError(error.message)
            setLoading(false)
            return
          }
        }
        
        // 위시리스트 로드
        const userWishlist = loadWishlist(session.user.id)
        setWishlist(userWishlist)
      } else {

      }

      // 인증 상태 변화 감지
      const { data: { subscription } } = client.auth.onAuthStateChange(
        async (event, session) => {
  
          
          if (session?.user) {
            setUser(session.user)
            
            // 로그인 시 프로필 및 위시리스트 로드 (클라이언트를 명시적으로 전달)
            const profile = await loadUserProfile(session.user.id, client)
            setUserProfile(profile) // 프로필 상태 설정 추가
            
            // 강사인 경우 승인 상태 확인
            if (profile?.role === 'teacher') {
              try {
                await checkTeacherApproval()
              } catch (error) {
                console.error('강사 승인 상태 오류:', error.message)
                // 승인되지 않은 강사는 로그아웃
                await client.auth.signOut()
                setUser(null)
                setUserProfile(null)
                setWishlist([])
                setError(error.message)
                setLoading(false)
                return
              }
            }
            
            const userWishlist = loadWishlist(session.user.id)
            setWishlist(userWishlist)
          } else {
            setUser(null)
            // 로그아웃 시 초기화
            setUserProfile(null)
            setWishlist([])
          }
          
          setLoading(false)
        }
      )

      setLoading(false)
      setRetryCount(0)

      return () => {
        subscription?.unsubscribe()
      }

    } catch (error) {
      console.error('Auth 초기화 실패:', error)
      setError(error.message)
      setLoading(false)
      setSupabaseReady(false)

      if (retryCount < 2) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
        }, 5000)
      }
    }
  }, [retryCount, loadWishlist, loadUserProfile])

  useEffect(() => {
    let cleanup = null

    const timer = setTimeout(async () => {
      cleanup = await initializeAuth()
    }, 100)

    return () => {
      clearTimeout(timer)
      if (cleanup && typeof cleanup === 'function') {
        cleanup()
      }
    }
  }, [initializeAuth])

  // 로그인 함수 (수정됨 - 프로필 로드에 클라이언트 전달)
  const login = async (email, password) => {
    if (!supabase) {
      throw new Error('인증 시스템이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.')
    }

    try {
      setLoading(true)
      setError(null)
  
      if (!email || !password) {
        throw new Error('이메일과 비밀번호를 입력해주세요.')
      }
  
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      })
  
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('이메일 인증이 필요합니다.')
        } else if (error.message.includes('Too many requests')) {
          throw new Error('너무 많은 로그인 시도입니다. 잠시 후 다시 시도해주세요.')
        } else {
          throw new Error(error.message || '로그인에 실패했습니다.')
        }
      }
  
      if (!data?.user) {
        throw new Error('사용자 데이터가 없습니다.')
      }
      
      // 사용자 프로필 로드 (클라이언트를 명시적으로 전달)
      const profile = await loadUserProfile(data.user.id, supabase)
      
      // 강사인 경우 승인 상태 확인
      if (profile?.role === 'teacher') {
        try {
          setUser(data.user) // 임시로 사용자 설정 (승인 확인을 위해)
          await checkTeacherApproval()
        } catch (error) {
          // 승인되지 않은 강사는 로그아웃
          await supabase.auth.signOut()
          setUser(null)
          setUserProfile(null)
          throw error
        }
      }
      
      return { user: data.user, error: null }
  
    } catch (error) {
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // 회원가입 함수 (역할 지정 기능 추가)
  const signup = async (userData) => {
    if (!supabase) {
      throw new Error('인증 시스템이 아직 준비되지 않았습니다.')
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            role: userData.role || 'user'
          }
        }
      })

      if (error) {
        setLoading(false)
        setError(error.message)
        throw error
      }

      // 회원가입 성공 시 사용자 프로필 생성
      if (data?.user) {
        setUser(data.user)
        // 세션 활성화 polling (최대 2초, 0.2초 간격)
        let tries = 0;
        let sessionUser = null;
        while (tries < 10) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            sessionUser = sessionData.session.user;
            break;
          }
          await new Promise(res => setTimeout(res, 200)); // 0.2초 대기
          tries++;
        }
        if (!sessionUser) {
          setLoading(false)
          setError('회원가입 후 인증 세션이 활성화되지 않았습니다. 잠시 후 다시 시도해주세요.');
          throw new Error('회원가입 후 인증 세션이 활성화되지 않았습니다. 잠시 후 다시 시도해주세요.');
        }
        
        try {
          // user_profiles 테이블에 프로필 생성 (기본 필드만 사용)
          const profileData = {
            user_id: data.user.id,
            name: userData.name,
            email: userData.email,
            role: userData.role || 'user'
          }

          // user_profiles insert 후 error 체크 및 실패시 즉시 중단
          const { data: insertedProfiles, error: profileInsertError } = await supabase
            .from('user_profiles')
            .insert([profileData])
            .select()
          if (profileInsertError) {
            setLoading(false)
            setError('user_profiles insert 실패: ' + (profileInsertError.message || ''))
            throw new Error('user_profiles insert 실패: ' + (profileInsertError.message || ''))
          }
          let profileResult = null
          // insert의 반환값에서 id가 있으면 바로 사용
          if (insertedProfiles && insertedProfiles.length > 0 && insertedProfiles[0].id) {
            profileResult = insertedProfiles[0]
          } else {
            // insert 후 select로 id를 3회까지 재시도 (보조)
            for (let i = 0; i < 3; i++) {
              const { data: profile } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', data.user.id)
                .single()
              if (profile && profile.id) {
                profileResult = profile
                break
              }
              await new Promise(res => setTimeout(res, 300))
            }
          }
          if (!profileResult) {
            setLoading(false)
            setError('프로필 생성 후 id를 찾을 수 없습니다.')
            throw new Error('프로필 생성 후 id를 찾을 수 없습니다.')
          }
          setUserProfile(profileResult)

          // 학생의 경우 수업 생성 로직
          if (userData.role === 'student' && userData.additionalData) {
            // 0. 학생 추가 정보 user_profiles에 업데이트
            const studentProfileUpdate = {
              phone: userData.additionalData.phone || null,
              parent_name: userData.additionalData.parentName || null,
              parent_phone: userData.additionalData.parentPhone || null,
              parent_email: userData.additionalData.parentEmail || userData.additionalData.guardianEmail || null,
              agree_terms: userData.additionalData.termsAgreed || false,
              agree_privacy: userData.additionalData.privacyAgreed || false,
              signature: userData.additionalData.signatureData || null
            }
            const { error: profileUpdateError } = await supabase
              .from('user_profiles')
              .update(studentProfileUpdate)
              .eq('user_id', data.user.id)
            if (profileUpdateError) {
              setLoading(false)
              setError('학생 정보 저장 실패: ' + (profileUpdateError.message || ''))
              throw new Error('학생 정보 저장 실패: ' + (profileUpdateError.message || ''))
            }

            // 1. 선택 정보 준비
            const subject = userData.additionalData.selectedSubject
            const teacher_id = userData.additionalData.selectedTeacher
            const day_of_week = userData.additionalData.selectedDayOfWeek
            const start_time = userData.additionalData.selectedTime
            const duration = userData.additionalData.selectedLessonDuration || 60
            const room_id = userData.additionalData.selectedRoom || null
            const status = 'active'
            // 2. classes 테이블에 해당 수업 row가 있는지 확인
            const { data: existingClass, error: classSelectError } = await supabase
              .from('classes')
              .select('*')
              .eq('subject', subject)
              .eq('teacher_id', teacher_id)
              .eq('day_of_week', day_of_week)
              .eq('start_time', start_time)
              .eq('duration', duration)
              .eq('room_id', room_id)
              .eq('status', status)
              .maybeSingle()
            let classId
            if (classSelectError) {
              setLoading(false)
              setError('수업 정보 조회 실패: ' + classSelectError.message)
              throw new Error('수업 정보 조회 실패: ' + classSelectError.message)
            }
            if (existingClass) {
              classId = existingClass.id
            } else {
              // 강사 이름 조회
              const { data: teacherProfile } = await supabase
                .from('user_profiles')
                .select('name')
                .eq('user_id', teacher_id)
                .single();
              const teacherName = teacherProfile?.name || '';
              // 3. 없으면 classes row 생성
              // title 자동 생성 (예: '피아노 (월요일 09:00)')
              const dayNames = ['일', '월', '화', '수', '목', '금', '토']
              const title = `${subject || '수업'} (${dayNames[day_of_week] || day_of_week}요일 ${start_time})`
              const date = new Date().toISOString().split('T')[0]
              // 종료 시간 계산 함수
              function calculateEndTime(startTime, duration) {
                const [hours, minutes] = startTime.split(':').map(Number)
                const startMinutes = hours * 60 + minutes
                const endMinutes = startMinutes + duration
                const endHours = Math.floor(endMinutes / 60)
                const endMins = endMinutes % 60
                return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
              }
              const end_time = calculateEndTime(start_time, duration)
              const { data: newClass, error: classInsertError } = await supabase
                .from('classes')
                .insert([
                  {
                    title,
                    subject,
                    teacher_id,
                    teacher: teacherName,
                    room_id,
                    day_of_week,
                    start_time,
                    duration,
                    status,
                    date,
                    end_time,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }
                ])
                .select()
                .maybeSingle()
              if (classInsertError || !newClass) {
                setLoading(false)
                setError('수업 생성 실패: ' + (classInsertError?.message || ''))
                throw new Error('수업 생성 실패: ' + (classInsertError?.message || ''))
              }
              classId = newClass.id
            }
            // 4. class_students에 학생-수업 연결 row 추가
            const { error: csError } = await supabase
              .from('class_students')
              .insert([
                {
                  class_id: classId,
                  student_id: data.user.id,
                  status: 'active',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ])
            if (csError) {
              setLoading(false)
              setError('수업-학생 연결 실패: ' + csError.message)
              throw new Error('수업-학생 연결 실패: ' + csError.message)
            }
          }

          // 강사의 경우 user_profiles 테이블에 강사 정보까지 업데이트 (teachers 테이블 insert 제거)
          if (userData.role === 'teacher' && userData.additionalData) {
            // 강사 전용 컬럼 준비 (경력사항과 자기소개 분리)
            const teacherProfileUpdate = {
              subjects: userData.additionalData.subjects || [],
              specialization: userData.additionalData.specialization || null,
              phone: userData.additionalData.phone || null,
              experience_detail: userData.additionalData.experience || null, // 경력사항(학력, 수상 등)
              bio: userData.additionalData.introduction || null, // 자기소개
              status: 'pending', // 승인 대기 상태
              signature: userData.additionalData.signatureData || null,
              agree_terms: userData.additionalData.termsAgreed || false,
              agree_privacy: userData.additionalData.privacyAgreed || false
            }
            // user_profiles에 업데이트
            const { error: teacherProfileError } = await supabase
              .from('user_profiles')
              .update(teacherProfileUpdate)
              .eq('user_id', data.user.id)
            if (teacherProfileError) {
              console.error('user_profiles 강사 정보 업데이트 실패:', teacherProfileError)
              throw new Error('강사 정보 저장 실패: ' + (teacherProfileError.message || ''))
            }
          }

        } catch (profileCreationError) {
          console.error('프로필 생성 중 오류 - 전체:', profileCreationError)
          console.error('프로필 생성 중 오류 - 메시지:', profileCreationError?.message || 'No message')
          console.error('프로필 생성 중 오류 - 스택:', profileCreationError?.stack || 'No stack')
          console.error('프로필 생성 중 오류 - JSON:', JSON.stringify(profileCreationError, null, 2))
          // 프로필 생성 실패해도 회원가입은 성공했으므로 계속 진행
        }
      }

      return { user: data.user, error: null }
  
    } catch (error) {
      console.error('💥 회원가입 실패:', error)
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // 로그아웃 함수 (프로필 초기화 추가)
  const logout = async () => {
    if (!supabase) {
      throw new Error('인증 시스템이 준비되지 않았습니다.')
    }

    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('로그아웃 에러:', error)
        throw error
      }
      
      setUser(null)
      setUserProfile(null)
      setWishlist([])
    } catch (error) {
      console.error('로그아웃 실패:', error)
      setUser(null)
      setUserProfile(null)
      setWishlist([])
      throw error
    }
  }

  // 기존 주문 관련 함수들 (코드 유지)
  const addOrder = async (orderData) => {
    if (!supabase || !user) {
      throw new Error('로그인이 필요합니다.')
    }

    try {
      const response = await makeAuthenticatedRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          orderId: orderData.id || `PS${Date.now()}`,
          userId: user.id,
          items: orderData.items,
          totalAmount: orderData.totalAmount,
          status: orderData.status || 'pending',
          shippingAddress: {
            name: orderData.shipping.name,
            phone: orderData.shipping.phone,
            email: orderData.shipping.email,
            address: orderData.shipping.address,
            detailAddress: orderData.shipping.detailAddress,
            zipCode: orderData.shipping.zipCode,
            memo: orderData.shipping.memo
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '주문 생성 실패');
      }

      return result.order;

    } catch (error) {
      console.error('주문 추가 실패:', error)
      throw error
    }
  }

  // 수동 재시도 함수
  const retry = useCallback(() => {
    setRetryCount(0)
    setError(null)
    initializeAuth()
  }, [initializeAuth])

  // 관리자용 함수들 (기존 코드 유지)
  const getAllUsers = () => {
    try {
      return JSON.parse(localStorage.getItem('allUsers') || '[]')
    } catch {
      return []
    }
  }

  const getAllOrders = () => {
    try {
      return JSON.parse(localStorage.getItem('allOrders') || '[]')
    } catch {
      return []
    }
  }

  const getAllReviews = () => {
    try {
      return JSON.parse(localStorage.getItem('reviews') || '[]')
    } catch {
      return []
    }
  }

  const updateOrderStatus = (orderId, status) => {
    try {
      const orders = getAllOrders()
      const updatedOrders = orders.map(order => 
        order.id === orderId ? { ...order, status } : order
      )
      localStorage.setItem('allOrders', JSON.stringify(updatedOrders))
      return true
    } catch {
      return false
    }
  }

  const adminDeleteReview = (reviewId) => {
    try {
      const reviews = getAllReviews()
      const updatedReviews = reviews.filter(review => review.id !== reviewId)
      localStorage.setItem('reviews', JSON.stringify(updatedReviews))
      return true
    } catch {
      return false
    }
  }
  // 강사 자료실 접근 권한 확인 함수 (새로 추가)
  const canAccessResources = useCallback(async () => {
    if (!user || !supabase) return false

    try {
      // 관리자는 항상 접근 가능
      if (isAdmin()) return true
      
      // 강사가 아닌 경우 접근 불가
      if (!isTeacher()) return false

      // 강사인 경우 승인 상태 확인
      const { data, error } = await supabase
        .from('user_profiles')
        .select('status')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('강사 상태 확인 실패:', error)
        return false
      }

      return data?.status === 'approved'
    } catch (error) {
      console.error('자료실 접근 권한 확인 중 오류:', error)
      return false
    }
  }, [user, supabase, isAdmin, isTeacher])

  // 자료 다운로드 권한 확인 함수 (새로 추가)
  const canDownloadResource = useCallback(async (productId, fileId) => {
    if (!user || !supabase) return false

    try {
      // 기본 자료실 접근 권한 먼저 확인
      const hasAccess = await canAccessResources()
      if (!hasAccess) return false

      // 추가적으로 특정 파일에 대한 권한 검사가 필요한 경우
      // 여기에 로직 추가 (예: 강사별 파일 접근 제한)
      
      return true
    } catch (error) {
      console.error('다운로드 권한 확인 중 오류:', error)
      return false
    }
  }, [user, supabase, canAccessResources])

  // 사용자의 다운로드 히스토리 조회 함수 (새로 추가)
  const getDownloadHistory = useCallback(async (limit = 10) => {
    if (!user || !supabase) return []

    try {
      const { data, error } = await supabase
        .from('download_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('downloaded_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('다운로드 히스토리 조회 실패:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('다운로드 히스토리 조회 중 오류:', error)
      return []
    }
  }, [user, supabase])

  // 강사 자료실 통계 조회 함수 (관리자용 - 새로 추가)
  const getResourcesStats = useCallback(async () => {
    if (!user || !supabase || !isAdmin()) return null

    try {
      // 전체 다운로드 수
      const { data: totalDownloads, error: totalError } = await supabase
        .from('download_logs')
        .select('id', { count: 'exact' })

      if (totalError) throw totalError

      // 오늘 다운로드 수
      const today = new Date().toISOString().split('T')[0]
      const { data: todayDownloads, error: todayError } = await supabase
        .from('download_logs')
        .select('id', { count: 'exact' })
        .gte('downloaded_at', today)

      if (todayError) throw todayError

      // 인기 파일 TOP 5
      const { data: popularFiles, error: popularError } = await supabase
        .from('download_stats')
        .select('*')
        .order('download_count', { ascending: false })
        .limit(5)

      if (popularError) throw popularError

      // 활성 강사 수 (최근 30일 내 다운로드한 강사)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { data: activeTeachers, error: teachersError } = await supabase
        .from('download_logs')
        .select('user_id')
        .gte('downloaded_at', thirtyDaysAgo.toISOString())
        .then(({ data, error }) => {
          if (error) throw error
          const uniqueUsers = [...new Set(data?.map(log => log.user_id) || [])]
          return { data: uniqueUsers, error: null }
        })

      if (teachersError) throw teachersError

      return {
        totalDownloads: totalDownloads?.length || 0,
        todayDownloads: todayDownloads?.length || 0,
        popularFiles: popularFiles || [],
        activeTeachers: activeTeachers?.data?.length || 0
      }
    } catch (error) {
      console.error('자료실 통계 조회 중 오류:', error)
      return null
    }
  }, [user, supabase, isAdmin])
  
  // value 객체 - 기존 코드를 이 형태로 수정하세요
  const value = {
    user,
    userProfile,
    loading,
    error,
    login,
    signup,
    logout,
    retry,
    isAuthenticated: !!user,
    supabaseReady,
    makeAuthenticatedRequest,
    
    // 역할 관련 함수들 - 함수 자체를 전달
    isAdmin,
    isTeacher,
    isStudent,
    isApprovedTeacher,
    getUserRole,
    getUserAdditionalInfo,
    getTeacherStatus,
    checkTeacherApproval,
    
    // 기존 함수들
    getAllUsers,
    getAllOrders,
    getAllReviews,
    updateOrderStatus,
    adminDeleteReview,
    addOrder,
    hasPurchasedProduct,
    hasReviewedProduct,
    addReview,
    updateReview,
    deleteReview,
    
    // 위시리스트 관련 함수들
    wishlist,
    toggleWishlist,
    isInWishlist,
    getWishlist,
    clearWishlist,
    
    // 새로 추가되는 자료실 관련 함수들
    canAccessResources,
    canDownloadResource,
    getDownloadHistory,
    getResourcesStats
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

