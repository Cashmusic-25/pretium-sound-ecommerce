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
        title: "회사 정보",
        links: ["회사 소개", "이용약관", "개인정보처리방침", "채용정보"]
      }
    ]
  
    return (
      <footer id="contact" className="bg-gray-900 text-white py-16 mt-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {footerSections.map((section, index) => (
              <div key={index}>
                <h3 className="text-lg font-bold mb-4 text-indigo-400">
                  {section.title}
                </h3>
                <ul className="space-y-2">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a
                        href="#"
                        className="text-gray-300 hover:text-indigo-400 transition-colors duration-200"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-700 pt-8 text-center">
            <div className="text-2xl font-bold gradient-text mb-4">
              Pretium Sound
            </div>
            <p className="text-gray-400">
              &copy; 2025 Pretium Sound. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    )
  }