# pretium-sound-ecommerce
Modern music education material e-commerce platform built with Next.js
# 🎵 Pretium Sound - 음악 교재 전문 쇼핑몰

> 전문 음악가들이 집필한 고품질 교재로 체계적인 음악 학습을 경험해보세요

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![React](https://img.shields.io/badge/React-18-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3-38B2AC)
![License](https://img.shields.io/badge/license-MIT-green)

## 🚀 프로젝트 개요

Pretium Sound는 음악 교육 자료 전문 이커머스 플랫폼입니다. 현대적인 UI/UX와 완벽한 쇼핑 기능을 제공합니다.

### ✨ 주요 기능

#### 🛒 **전자상거래 핵심 기능**
- **상품 카탈로그**: 카테고리별 분류, 검색, 필터링
- **장바구니 시스템**: 실시간 수량 조절, 가격 계산
- **결제 시스템**: 토스페이먼츠 연동 준비 완료
- **주문 관리**: 주문 내역, 배송 추적

#### 👤 **사용자 시스템**
- **회원가입/로그인**: 보안 인증 시스템
- **사용자 프로필**: 개인정보 관리, 등급 시스템
- **위시리스트**: 관심 상품 저장
- **리뷰 시스템**: 별점, 사진 첨부, 도움됨 투표

#### 🔧 **관리자 기능**
- **상품 관리**: CRUD 작업, 이미지 업로드
- **주문 관리**: 상태 변경, 고객 정보 확인
- **사용자 관리**: 회원 정보 조회, 통계
- **리뷰 관리**: 리뷰 모니터링, 삭제
- **대시보드**: 매출 통계, 성과 지표

## 🛠 기술 스택

### Frontend
- **Next.js 14** - React 프레임워크 (App Router)
- **React 18** - UI 라이브러리
- **Tailwind CSS** - 유틸리티 CSS 프레임워크
- **Lucide React** - 아이콘 라이브러리

### 상태 관리
- **React Context API** - 전역 상태 관리
- **Local Storage** - 클라이언트 데이터 저장

### 예정된 통합
- **Toss Payments** - 결제 시스템
- **Database** - 영구 데이터 저장
- **이미지 CDN** - 최적화된 이미지 전송

## 🚀 빠른 시작

### 필수 요구사항
- Node.js 18.0 이상
- npm 또는 yarn

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/YOUR_USERNAME/pretium-sound-ecommerce.git
cd pretium-sound-ecommerce

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 브라우저에서 확인
# http://localhost:3000
```

### 환경 변수 설정 (토스페이먼츠 연동시)

```bash
# .env.local 파일 생성
NEXT_PUBLIC_TOSS_CLIENT_KEY=your_client_key
TOSS_SECRET_KEY=your_secret_key
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 📁 프로젝트 구조

```
pretium-sound/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/             # 관리자 페이지
│   │   ├── checkout/          # 결제 페이지
│   │   ├── components/        # 재사용 컴포넌트
│   │   ├── contexts/          # React Context
│   │   ├── order/            # 주문 관련 페이지
│   │   └── ...
│   └── data/                  # 데이터 모델 및 헬퍼
├── public/                    # 정적 파일
└── README.md
```

## 🎯 주요 컴포넌트

### 📊 **관리자 대시보드**
- 실시간 매출 통계
- 사용자 활동 분석
- 주문 현황 모니터링

### 🛍 **쇼핑 경험**
- 직관적인 상품 탐색
- 스마트 검색 및 필터
- 원클릭 장바구니 추가

### 💳 **결제 시스템**
- 다단계 결제 프로세스
- 실시간 유효성 검사
- 토스페이먼츠 연동 준비

## 🔐 보안 기능

- **클라이언트 사이드 유효성 검사**
- **XSS 방지 처리**
- **안전한 인증 시스템**
- **민감 정보 환경변수 분리**

## 📱 반응형 디자인

- **모바일 우선** 설계
- **Tablet 최적화**
- **Desktop 전체화면** 지원

## 🚀 배포 준비

### Vercel 배포
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 환경변수 설정
vercel env add NEXT_PUBLIC_TOSS_CLIENT_KEY
vercel env add TOSS_SECRET_KEY
```

### Docker 배포
```dockerfile
# Dockerfile 예시
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 알려진 이슈

- [ ] 대용량 이미지 업로드 시 성능 최적화 필요
- [ ] 모바일에서 결제 위젯 UI 개선 예정

## 📋 로드맵

- [ ] **결제 시스템 완성** (토스페이먼츠)
- [ ] **데이터베이스 연동** (PostgreSQL/MongoDB)
- [ ] **이미지 CDN 적용**
- [ ] **PWA 지원**
- [ ] **다국어 지원**
- [ ] **AI 추천 시스템**

## 📄 라이센스

이 프로젝트는 MIT 라이센스 하에 있습니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 👨‍💻 개발자

**Jason Kim**
- GitHub: [@your-username](https://github.com/your-username)
- Email: your-email@example.com

## 🙏 감사의 말

- [Next.js](https://nextjs.org/) - 뛰어난 React 프레임워크
- [Tailwind CSS](https://tailwindcss.com/) - 유연한 CSS 프레임워크
- [Lucide](https://lucide.dev/) - 아름다운 아이콘 세트
- [Toss Payments](https://docs.tosspayments.com/) - 안정적인 결제 시스템

---

⭐ 이 프로젝트가 도움이 되었다면 Star를 눌러주세요!
