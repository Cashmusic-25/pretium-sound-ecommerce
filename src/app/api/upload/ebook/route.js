// src/app/api/upload/ebook/route.js
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 파일 타입 결정
function getFileType(extension) {
  const ext = extension.toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (['zip', 'rar', '7z'].includes(ext)) return 'archive'
  if (['mp3', 'wav', 'flac', 'm4a'].includes(ext)) return 'audio'
  if (['mp4', 'avi', 'mov', 'wmv'].includes(ext)) return 'video'
  return 'document'
}

// 파일 크기 포맷팅
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export async function POST(request) {
  try {
    console.log('📚 E-Book 파일 업로드 API 시작');

    // FormData에서 파일 추출
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json(
        { error: '파일이 제공되지 않았습니다' },
        { status: 400 }
      );
    }

    console.log('📁 업로드 파일 정보:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // 파일 크기 체크 (50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '파일 크기는 50MB 이하만 가능합니다' },
        { status: 400 }
      );
    }

    // 파일 타입 체크
    const fileExt = file.name.split('.').pop().toLowerCase();
    const allowedExtensions = ['pdf', 'zip', 'mp3', 'wav', 'mp4', 'avi', 'rar', '7z'];
    
    if (!allowedExtensions.includes(fileExt)) {
      return NextResponse.json(
        { error: 'PDF, ZIP, MP3, WAV, MP4 파일만 업로드 가능합니다' },
        { status: 400 }
      );
    }

    // 영문 파일명 생성
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2);
    const fileName = `ebook_${timestamp}_${randomStr}.${fileExt}`;

    console.log('☁️ Supabase Storage 업로드 시작:', fileName);

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from('ebooks')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ 업로드 실패:', error);
      return NextResponse.json(
        { error: `업로드 실패: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('✅ 업로드 성공:', data);

    // 성공 응답
    const result = {
      filename: file.name,
      filePath: fileName,
      type: getFileType(fileExt),
      size: formatFileSize(file.size),
      uploadedAt: new Date().toISOString()
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('💥 API 오류:', error);
    return NextResponse.json(
      { error: `서버 오류: ${error.message}` },
      { status: 500 }
    );
  }
}