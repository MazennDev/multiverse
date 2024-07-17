import Link from 'next/link'

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-16">
      <div className="card max-w-2xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-6">Bienvenue sur Multiverse</h1>
        <p className="text-xl text-gray-300 mb-8">Le Multivers, en Site.</p>
        <Link href="/signin" className="btn btn-primary">Commencer l&apos;aventure</Link>
      </div>
    </main>
  )
}
