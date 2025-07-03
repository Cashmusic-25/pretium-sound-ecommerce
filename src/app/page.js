import Header from './components/Header'
import Hero from './components/Hero'
import ProductGrid from './components/ProductGrid'
import Footer from './components/Footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Hero />
      <main className="container mx-auto px-4">
        <div className="p-8 md:p-16">
          <ProductGrid />
        </div>
      </main>
      <Footer />
    </div>
  )
}