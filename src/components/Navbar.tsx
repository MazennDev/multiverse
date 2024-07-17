import Link from 'next/link'

const Navbar = () => {
  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">Multiverse</Link>
        <div>
          <Link href="/" className="mr-4">Accueil</Link>
          <Link href="/signin">Connexion</Link>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
