import { Music, Headphones, Video, Target } from 'lucide-react'

export default function Features() {
  const features = [
    {
      icon: <Music className="w-8 h-8" />,
      title: "전문 음악가 집필",
      description: "현직 연주자와 음악 교육 전문가들이 직접 집필한 실용적인 교재만을 제공합니다."
    },
    {
      icon: <Headphones className="w-8 h-8" />,
      title: "오디오 자료 제공",
      description: "모든 교재에 고품질 오디오 예제와 반주 파일을 함께 제공하여 효과적인 학습을 지원합니다."
    },
    {
      icon: <Video className="w-8 h-8" />,
      title: "온라인 레슨",
      description: "교재 구매 후 온라인 화상 레슨과 Q&A 세션으로 추가 학습 지원을 받을 수 있습니다."
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "단계별 커리큘럼",
      description: "초급부터 고급까지 체계적인 단계별 학습 과정으로 구성되어 있습니다."
    }
  ]

  return (
    <section id="about" className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-8 md:p-12 mb-16">
      <h2 className="text-4xl font-bold text-center mb-12 gradient-text">
        왜 Pretium Sound인가요?
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {features.map((feature, index) => (
          <div key={index} className="text-center group">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-white group-hover:scale-110 transition-transform duration-300">
              {feature.icon}
            </div>
            
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {feature.title}
            </h3>
            
            <p className="text-gray-600 leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}