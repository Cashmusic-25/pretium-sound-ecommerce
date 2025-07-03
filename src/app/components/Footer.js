export default function Footer() {
  const footerSections = [
    {
      title: "음악 교재 카테고리",
      links: ["피아노", "기타", "드럼", "보컬", "바이올린", "음악 이론"]
    },
    {
      title: "고객 지원",
      links: ["자주 묻는 질문", "배송 안내", "반품/교환", "1:1 문의"]
    },
    {
      title: "서비스 안내",
      links: ["이용약관", "개인정보처리방침", "서비스 제공 기간", "다운로드 가이드"]
    }
  ]

  return (
    <footer id="contact" className="text-white py-16 mt-16 border-t border-gray-800" style={{backgroundColor: '#262627'}}>
      <div className="container mx-auto px-4">
        {/* 서비스 제공 기간 안내 박스 */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center">
            <span className="mr-2">📋</span>
            서비스 제공 기간 안내
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-blue-400 mb-2">E-Book 상품</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• 구매 후 즉시 다운로드 가능</li>
                <li>• 구매일로부터 1년간 다운로드 이용 가능</li>
                <li>• 다운로드 완료 후 영구 이용 가능</li>
                <li>• 무단 배포, 복제 시 법적 책임 있음</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-green-400 mb-2">이용 방법</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• 결제 완료 → 즉시 다운로드 링크 제공</li>
                <li>• 마이페이지에서 언제든 재다운로드</li>
                <li>• 1년 이후에는 고객센터 문의</li>
                <li>• 무단 배포, 복제 시 법적 책임 있음</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {footerSections.map((section, index) => (
            <div key={index}>
              <h3 className="text-lg font-bold mb-4 text-white">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      href="#"
                      className="text-gray-300 hover:text-blue-400 transition-colors duration-200"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="border-t border-gray-800 pt-8">
          <div className="text-2xl font-bold gradient-text mb-6 text-center">
            Pretium Sound
          </div>
          
          {/* 회사 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div>
              <h4 className="text-white font-semibold mb-3">이용약관 | 개인정보처리방침</h4>
              <div className="space-y-1 text-sm text-gray-400">
                <p>네오셀렉트 | 대표자: 김혜린</p>
                <p>주소: 부산광역시 강서구 과학산단2로 20번길 91 103동 2204호</p>
                <p>사업자등록번호: 503-36-14735</p>
                <p>통신판매업신고번호: 2025-부산강서구-0181</p>
                <p>개인정보관리 책임자: 김혜린</p>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-3">Contact</h4>
              <div className="space-y-1 text-sm text-gray-400">
                <p>
                  <span className="inline-block w-4 mr-2">📞</span>
                  <a 
                    href="tel:010-1234-5678" 
                    className="hover:text-blue-400 transition-colors duration-200"
                  >
                    대표자: 010-8667-9772
                  </a>
                </p>
                <p>
                  <span className="inline-block w-4 mr-2">✉️</span>
                  <a 
                    href="mailto:jasonincompany@gmail.com"
                    className="hover:text-blue-400 transition-colors duration-200"
                  >
                    jasonincompany@gmail.com
                  </a>
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-center border-t border-gray-800 pt-4">
            <p className="text-gray-400 text-sm">
              &copy; 2025 Pretium Sound. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}