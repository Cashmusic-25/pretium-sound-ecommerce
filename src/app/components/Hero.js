'use client'

export default function Hero() {
  return (
    <section 
      id="home" 
      className="pt-32 pb-0 md:pb-16 text-white relative overflow-hidden min-h-screen flex items-center"
      style={{
        backgroundImage: 'url(/images/hero-background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onError={() => {
          // 배경 이미지 로드 실패시 그라데이션 배경으로 대체
          const section = document.getElementById('home');
          if (section) {
            section.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
          }
        }}
      ></div>

      {/* 배경 애니메이션 요소들 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white bg-opacity-10 rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/3 w-24 h-24 bg-white bg-opacity-10 rounded-full animate-pulse"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* 왼쪽: 텍스트 콘텐츠 */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              PretiumSound<br />
              <span className="text-gray-100">Educational E-Book Store</span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-3xl lg:max-w-none mx-auto lg:mx-0 text-gray-100">
              전문 음악가들이 집필한 고품질 교재로 체계적인 음악 학습을 경험해보세요
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
              <a
                href="#products"
                className="bg-white text-gray-800 px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:bg-gray-100"
              >
                교재 둘러보기
              </a>
              <a
                href="#about"
                className="border-2 border-white text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-gray-800 transition-all duration-300"
              >
                더 알아보기
              </a>
            </div>
          </div>

          {/* 오른쪽: 빈 공간 또는 간단한 장식 */}
          <div className="relative flex justify-center lg:justify-end">
            {/* 플로팅 요소들만 남김 */}
            <div className="relative w-64 h-64">
              <div className="absolute bottom-20 left-8 w-12 h-12 bg-pink-200 bg-opacity-80 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-lg">🎼</span>
              </div>
              <div className="absolute top-32 left-8 w-8 h-8 bg-blue-200 bg-opacity-80 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-sm">♪</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 이미지 로드 실패 감지를 위한 숨겨진 이미지 */}
      <img 
        src="/images/hero-background.jpg" 
        alt="" 
        className="hidden"
        onError={() => {
          // 배경 이미지 로드 실패시 그라데이션 배경으로 대체
          const section = document.getElementById('home');
          if (section) {
            section.style.backgroundImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
          }
        }}
      />
    </section>
  )
}