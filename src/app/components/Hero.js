export default function Hero() {
    return (
      <section id="home" className="pt-24 pb-20 text-white text-center relative overflow-hidden">
        {/* 배경 애니메이션 요소들 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full floating-animation"></div>
          <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-white/5 rounded-full floating-animation" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-1/4 left-1/3 w-24 h-24 bg-white/15 rounded-full floating-animation" style={{animationDelay: '4s'}}></div>
        </div>
  
        <div className="container mx-auto px-4 relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            프리미엄 음악 교재로<br />
            <span className="text-yellow-300">당신의 음악 여정을 시작하세요</span>
          </h1>
          
          <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-3xl mx-auto">
            전문 음악가들이 집필한 고품질 교재로 체계적인 음악 학습을 경험해보세요
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="#products"
              className="bg-white text-indigo-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              교재 둘러보기
            </a>
            <a
              href="#about"
              className="border-2 border-white text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-indigo-600 transition-all duration-300"
            >
              더 알아보기
            </a>
          </div>
        </div>
      </section>
    )
  }