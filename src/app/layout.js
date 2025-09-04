import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { CartProvider } from './contexts/CartContext'
import { FilterProvider } from './contexts/FilterContext'
import { AuthProvider } from './contexts/AuthContext'
import DebugAuth from './components/DebugAuth'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Pretium Sound - 프리미엄 음악 교재 전문점',
  description: '좋은 교재, 새로운 기회 — 전문 음악가들이 집필한 고품질 교재로 체계적인 음악 학습을 경험해보세요',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className={`${inter.className} text-gray-800 min-h-screen bg-white pt-28 md:pt-28 lg:pt-32 xl:pt-36`}>
        {/* 포트원 V2 스크립트 */}
        <Script 
          src="https://cdn.portone.io/v2/browser-sdk.js"
          strategy="beforeInteractive"
        />
        
        <AuthProvider>
          <CartProvider>
            <FilterProvider>
              {children}
            </FilterProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}