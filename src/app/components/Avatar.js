export default function Avatar({ name, size = 96, className = "" }) {
    // 이름의 첫 글자들 추출
    const getInitials = (name) => {
      if (!name) return 'U'
      
      const words = name.trim().split(' ')
      if (words.length === 1) {
        return words[0].charAt(0).toUpperCase()
      }
      
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
    }
  
    // 이름 기반 색상 생성
    const getAvatarColor = (name) => {
      if (!name) return 'bg-gray-500'
      
      const colors = [
        'bg-indigo-500',
        'bg-purple-500', 
        'bg-pink-500',
        'bg-red-500',
        'bg-orange-500',
        'bg-yellow-500',
        'bg-green-500',
        'bg-teal-500',
        'bg-blue-500',
        'bg-cyan-500'
      ]
      
      // 이름의 글자 코드 합으로 색상 선택
      const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      return colors[hash % colors.length]
    }
  
    const initials = getInitials(name)
    const bgColor = getAvatarColor(name)
  
    return (
      <div 
        className={`${bgColor} ${className} flex items-center justify-center text-white font-bold rounded-full`}
        style={{ 
          width: size, 
          height: size,
          fontSize: size * 0.4
        }}
      >
        {initials}
      </div>
    )
  }