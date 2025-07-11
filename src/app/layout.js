import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { CartProvider } from './contexts/CartContext'
import { FilterProvider } from './contexts/FilterContext'
import { AuthProvider } from './contexts/AuthContext'
import { RoomProvider } from './contexts/RoomContext'  // 새로 추가
import DebugAuth from './components/DebugAuth'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Pretium Sound - 프리미엄 음악 교재 전문점',
  description: '전문 음악가들이 집필한 고품질 교재로 체계적인 음악 학습을 경험해보세요',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className={`${inter.className} text-gray-800 min-h-screen bg-white`}>
        {/* 포트원 V2 스크립트 */}
        <Script 
          src="https://cdn.portone.io/v2/browser-sdk.js"
          strategy="beforeInteractive"
        />
        
        <AuthProvider>
          <RoomProvider>  {/* 새로 추가 */}
            <CartProvider>
              <FilterProvider>
                {children}
              </FilterProvider>
            </CartProvider>
          </RoomProvider>  {/* 새로 추가 */}
        </AuthProvider>
      </body>
    </html>
  )
}