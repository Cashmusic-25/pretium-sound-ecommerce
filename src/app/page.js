import Header from './components/Header'
import Hero from './components/Hero'
import ProductGrid from './components/ProductGrid'
import Features from './components/Features'
import Footer from './components/Footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <Header />
      <Hero />
      <main className="container mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-2xl mx-4 -mt-12 relative overflow-hidden">
          <div className="p-8 md:p-16">
            <ProductGrid />
            <Features />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}