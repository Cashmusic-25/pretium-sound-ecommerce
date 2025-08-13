export const products = [
  {
    id: 1,
    title: "재즈 피아노 완전정복",
    description: "기초부터 고급 테크닉까지, 재즈 피아노의 모든 것을 담은 종합 교재입니다.",
    price: "₩45,000",
    icon: "🎹",
    category: "피아노",
    // E-Book 파일 정보 추가
    files: [
      {
        id: "jazz_piano_main",
        filename: "재즈_피아노_완전정복_교재.pdf",
        filePath: "ebooks/jazz-piano-complete.pdf",
        type: "pdf",
        size: "25.6MB",
        description: "메인 교재 PDF"
      },
      {
        id: "jazz_piano_audio",
        filename: "재즈_피아노_반주음원.zip",
        filePath: "ebooks/jazz-piano-audio-files.zip",
        type: "audio",
        size: "180MB",
        description: "MP3 반주 파일 모음"
      }
    ],
    detailedDescription: `이 교재는 재즈 피아노를 처음 시작하는 분부터 중급자까지 모든 레벨의 학습자를 위해 설계되었습니다. 
    
체계적인 커리큘럼을 통해 재즈의 기본 코드 진행부터 고급 즉흥연주 기법까지 단계적으로 학습할 수 있습니다.`,
    features: [
      "기초 재즈 화성학 완벽 정리",
      "180개 이상의 코드 진행 패턴",
      "50곡의 재즈 스탠다드 수록",
      "고품질 MP3 반주 파일 제공",
      "온라인 동영상 강의 6시간 포함"
    ],
    contents: [
      "Chapter 1: 재즈 기초 이론",
      "Chapter 2: 기본 코드와 스케일",
      "Chapter 3: 리듬과 그루브",
      "Chapter 4: 즉흥연주 입문",
      "Chapter 5: 재즈 스탠다드 연주"
    ],
    specifications: {
      "페이지 수": "320페이지",
      "난이도": "초급 ~ 중급",
      "출판사": "Pretium Sound",
      "언어": "한국어",
      "포함 자료": "MP3 파일, 온라인 강의",
      "파일 형식": "PDF + ZIP"
    },
    reviews: [
      {
        id: 1,
        userId: 1001,
        userName: "김재즈",
        rating: 5,
        title: "정말 훌륭한 재즈 피아노 교재입니다!",
        content: "재즈 피아노를 배우고 싶어서 여러 교재를 찾아봤는데, 이 교재가 가장 체계적이고 이해하기 쉬웠습니다. 특히 MP3 반주 파일이 포함되어 있어서 실제로 연주해볼 수 있어서 좋았어요.",
        createdAt: "2024-12-15T10:30:00Z",
        helpful: 12,
        helpfulUsers: [],
        verified: true
      },
      {
        id: 2,
        userId: 1002,
        userName: "이연주",
        rating: 4,
        title: "초보자에게 추천!",
        content: "피아노는 조금 칠 줄 알았지만 재즈는 완전 초보였는데, 이 교재 덕분에 기초를 탄탄히 다질 수 있었습니다. 다만 고급 내용은 좀 더 자세했으면 좋겠어요.",
        createdAt: "2024-12-10T14:20:00Z",
        helpful: 8,
        helpfulUsers: [],
        verified: true
      }
    ]
  },
  {
    id: 2,
    title: "어쿠스틱 기타 바이블",
    description: "핑거스타일부터 스트러밍까지, 어쿠스틱 기타의 모든 주법을 마스터하세요.",
    price: "₩38,000",
    icon: "🎸",
    category: "기타",
    files: [
      {
        id: "guitar_main",
        filename: "어쿠스틱_기타_바이블.pdf",
        filePath: "ebooks/acoustic-guitar-bible.pdf",
        type: "pdf",
        size: "18.2MB",
        description: "메인 교재 PDF"
      },
      {
        id: "guitar_tabs",
        filename: "기타_TAB악보_모음.pdf",
        filePath: "ebooks/guitar-tab-collection.pdf",
        type: "pdf",
        size: "12.5MB",
        description: "30곡 TAB 악보 모음"
      }
    ],
    detailedDescription: `어쿠스틱 기타 연주의 모든 것을 담은 완벽한 가이드북입니다. 
    
초보자도 쉽게 따라할 수 있는 단계별 설명과 함께, 프로 기타리스트의 노하우를 전수받을 수 있습니다.`,
    features: [
      "핑거스타일 완벽 마스터",
      "200개 이상의 코드 다이어그램",
      "다양한 스트러밍 패턴",
      "유명곡 30곡 TAB 악보 수록",
      "온라인 튜토리얼 영상 제공"
    ],
    contents: [
      "Chapter 1: 기타 기초와 자세",
      "Chapter 2: 기본 코드와 스트러밍",
      "Chapter 3: 핑거스타일 테크닉",
      "Chapter 4: 고급 연주 기법",
      "Chapter 5: 실전 곡 연주"
    ],
    specifications: {
      "페이지 수": "280페이지",
      "난이도": "초급 ~ 고급",
      "출판사": "Pretium Sound",
      "언어": "한국어",
      "포함 자료": "동영상 강의, TAB 악보",
      "파일 형식": "PDF"
    },
    reviews: [
      {
        id: 3,
        userId: 1003,
        userName: "박기타",
        rating: 5,
        title: "핑거스타일 배우기 최고!",
        content: "핑거스타일을 배우고 싶어서 구매했는데 정말 만족합니다. TAB 악보도 잘 되어 있고 동영상 강의까지 있어서 혼자서도 충분히 연습할 수 있어요.",
        createdAt: "2024-12-12T16:45:00Z",
        helpful: 15,
        helpfulUsers: [],
        verified: true
      }
    ]
  },
  {
    id: 3,
    title: "보컬 테크닉 마스터",
    description: "호흡법부터 고음 발성까지, 전문 보컬리스트가 되는 완벽한 가이드입니다.",
    price: "₩42,000",
    icon: "🎤",
    category: "보컬",
    files: [
      {
        id: "vocal_main",
        filename: "보컬_테크닉_마스터.pdf",
        filePath: "ebooks/vocal-technique-master.pdf",
        type: "pdf",
        size: "15.8MB",
        description: "메인 교재 PDF"
      },
      {
        id: "vocal_audio",
        filename: "발성연습_음원.zip",
        filePath: "ebooks/vocal-practice-audio.zip",
        type: "audio",
        size: "95MB",
        description: "발성 연습용 음원 모음"
      }
    ],
    detailedDescription: `체계적인 보컬 트레이닝을 통해 건강하고 아름다운 목소리를 만들어보세요. 
    
호흡법부터 고음 발성, 표현력까지 보컬리스트에게 필요한 모든 기술을 단계별로 학습할 수 있습니다.`,
    features: [
      "과학적 발성법 완벽 정리",
      "호흡 운동 및 발성 연습곡",
      "장르별 보컬 스타일 분석",
      "실전 녹음 팁과 무대 매너",
      "개인 맞춤 연습 프로그램"
    ],
    contents: [
      "Chapter 1: 기초 발성과 호흡",
      "Chapter 2: 음역대 확장 훈련",
      "Chapter 3: 표현력과 테크닉",
      "Chapter 4: 장르별 보컬 스타일",
      "Chapter 5: 실전 퍼포먼스"
    ],
    specifications: {
      "페이지 수": "250페이지",
      "난이도": "초급 ~ 고급",
      "출판사": "Pretium Sound",
      "언어": "한국어",
      "포함 자료": "연습 음원, 발성 가이드",
      "파일 형식": "PDF + ZIP"
    },
    reviews: []
  },
  {
    id: 4,
    title: "드럼 리듬 패턴북",
    description: "다양한 장르의 리듬 패턴과 필인을 체계적으로 학습할 수 있는 교재입니다.",
    price: "₩35,000",
    icon: "🥁",
    category: "드럼",
    files: [
      {
        id: "drum_main",
        filename: "드럼_리듬_패턴북.pdf",
        filePath: "ebooks/drum-rhythm-patterns.pdf",
        type: "pdf",
        size: "22.1MB",
        description: "메인 교재 PDF"
      },
      {
        id: "drum_audio",
        filename: "드럼_클릭트랙.zip",
        filePath: "ebooks/drum-click-tracks.zip",
        type: "audio",
        size: "120MB",
        description: "연습용 클릭 트랙 모음"
      }
    ],
    detailedDescription: `록, 재즈, 펑크, 라틴 등 모든 장르의 드럼 패턴을 완벽하게 마스터할 수 있는 종합 교재입니다. 
    
기초 비트부터 고급 필인까지, 체계적인 연습을 통해 프로 드러머의 연주력을 기를 수 있습니다.`,
    features: [
      "300개 이상의 리듬 패턴",
      "장르별 특징적 비트 분석",
      "필인과 브레이크 테크닉",
      "메트로놈 연습용 클릭 트랙",
      "유명 드러머 스타일 분석"
    ],
    contents: [
      "Chapter 1: 드럼 기초와 기본 비트",
      "Chapter 2: 록과 팝 드럼 패턴",
      "Chapter 3: 재즈와 스윙 리듬",
      "Chapter 4: 라틴과 월드뮤직",
      "Chapter 5: 고급 테크닉과 필인"
    ],
    specifications: {
      "페이지 수": "200페이지",
      "난이도": "초급 ~ 고급",
      "출판사": "Pretium Sound",
      "언어": "한국어",
      "포함 자료": "클릭 트랙, 연주 음원",
      "파일 형식": "PDF + ZIP"
    },
    reviews: []
  },
  {
    id: 5,
    title: "클래식 바이올린 교본",
    description: "기초 자세부터 고급 레퍼토리까지, 바이올린 연주의 모든 것을 담았습니다.",
    price: "₩52,000",
    icon: "🎻",
    category: "바이올린",
    files: [
      {
        id: "violin_main",
        filename: "클래식_바이올린_교본.pdf",
        filePath: "ebooks/classical-violin-method.pdf",
        type: "pdf",
        size: "28.4MB",
        description: "메인 교재 PDF"
      },
      {
        id: "violin_audio",
        filename: "바이올린_반주음원.zip",
        filePath: "ebooks/violin-accompaniment.zip",
        type: "audio",
        size: "200MB",
        description: "반주 음원 및 연주 예제"
      }
    ],
    detailedDescription: `클래식 바이올린의 정통 주법을 체계적으로 학습할 수 있는 완벽한 교재입니다. 
    
올바른 자세와 활 잡는 법부터 시작해서 고급 레퍼토리까지 단계별로 마스터할 수 있습니다.`,
    features: [
      "정확한 자세와 기본기 정립",
      "스케일과 에튀드 완벽 수록",
      "클래식 명곡 20곡 악보 포함",
      "운지법과 활 테크닉 상세 설명",
      "전문가 연주 동영상 제공"
    ],
    contents: [
      "Chapter 1: 바이올린 기초와 자세",
      "Chapter 2: 음계와 기초 연습곡",
      "Chapter 3: 보잉 테크닉",
      "Chapter 4: 중급 레퍼토리",
      "Chapter 5: 고급 연주 기법"
    ],
    specifications: {
      "페이지 수": "380페이지",
      "난이도": "초급 ~ 고급",
      "출판사": "Pretium Sound",
      "언어": "한국어",
      "포함 자료": "전문가 연주 영상, 반주 음원",
      "파일 형식": "PDF + ZIP"
    },
    reviews: []
  },
  {
    id: 6,
    title: "실용 음악 이론 완성",
    description: "화성학부터 작곡법까지, 음악 창작에 필요한 모든 이론을 쉽게 설명합니다.",
    price: "₩48,000",
    icon: "🎵",
    category: "음악이론",
    files: [
      {
        id: "theory_main",
        filename: "실용_음악이론_완성.pdf",
        filePath: "ebooks/practical-music-theory.pdf",
        type: "pdf",
        size: "35.2MB",
        description: "메인 교재 PDF"
      },
      {
        id: "theory_examples",
        filename: "작곡_예제파일.zip",
        filePath: "ebooks/composition-examples.zip",
        type: "audio",
        size: "150MB",
        description: "작곡 예제 및 템플릿 파일"
      }
    ],
    detailedDescription: `복잡한 음악 이론을 쉽고 재미있게 배울 수 있는 실용적인 교재입니다. 
    
실제 음악 제작과 연주에 바로 적용할 수 있는 이론들을 중심으로 구성되어 있습니다.`,
    features: [
      "화성학 기초부터 고급까지",
      "작곡 및 편곡 기법 상세 설명",
      "장르별 화성 진행 분석",
      "실전 예제 100개 이상",
      "디지털 작곡 도구 활용법"
    ],
    contents: [
      "Chapter 1: 음악 이론 기초",
      "Chapter 2: 화성학과 코드 진행",
      "Chapter 3: 선율과 리듬",
      "Chapter 4: 작곡과 편곡 기법",
      "Chapter 5: 장르별 분석과 응용"
    ],
    specifications: {
      "페이지 수": "420페이지",
      "난이도": "초급 ~ 고급",
      "출판사": "Pretium Sound",
      "언어": "한국어",
      "포함 자료": "작곡 템플릿, 예제 파일",
      "파일 형식": "PDF + ZIP"
    },
    reviews: []
  }
]

// 기존 products.js 파일 마지막에 추가할 함수들

// ID로 상품 찾기 함수
export function getProductById(id) {
  return products.find(product => product.id === parseInt(id))
}

// 상품의 파일 정보 가져오기 함수
export function getProductFiles(id) {
  const product = getProductById(id)
  return product?.files || []
}

// 파일 ID로 특정 파일 찾기 함수 (수정됨)
export function getFileById(productId, fileId) {
  const files = getProductFiles(productId)
  return files.find(file => file.id === fileId)
}

// 모든 자료를 플랫 리스트로 반환하는 함수 (새로 추가)
export function getAllResources() {
  const allResources = []
  products.forEach(product => {
    if (product.files) {
      product.files.forEach(file => {
        allResources.push({
          id: `${product.id}_${file.id}`,
          productId: product.id,
          fileId: file.id,
          title: file.filename,
          description: file.description,
          type: file.type,
          size: file.size,
          category: product.category,
          productTitle: product.title,
          filePath: file.filePath,
          downloadUrl: `/api/download/resource/${file.id}?productId=${product.id}`
        })
      })
    }
  })
  return allResources
}

// 카테고리별 자료 개수 반환 함수 (새로 추가)
export function getResourceStats() {
  const resources = getAllResources()
  const stats = {
    total: resources.length,
    byCategory: {},
    byType: {}
  }

  resources.forEach(resource => {
    stats.byCategory[resource.category] = (stats.byCategory[resource.category] || 0) + 1
    stats.byType[resource.type] = (stats.byType[resource.type] || 0) + 1
  })

  return stats
}

// 강사가 접근 가능한 자료 필터링 함수 (새로 추가)
export function getTeacherAccessibleResources(teacherId = null) {
  // 현재는 모든 자료에 접근 가능하지만, 
  // 나중에 강사별 권한 관리가 필요한 경우 여기서 필터링
  return getAllResources()
}