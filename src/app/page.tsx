import Navbar from '@/components/Navbar'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-r from-purple-900 to-blue-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-4">Bienvenue sur Multiverse</h1>
        <p className="text-xl text-gray-300">Le Multivers, en Site.</p>
      </div>
    </main>
  )
}
