import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-6 text-white">Bienvenue sur Multiverse</h1>
        <p className="text-xl text-gray-300 mb-8">Le Multivers, en Site.</p>
        <Link href="/signin" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300">
          Commencer l&apos;aventure
        </Link>
      </div>
    </div>
  )
}
