import React from 'react'

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-800 text-white py-4 mt-auto">
      <div className="container mx-auto text-center">
        <p>&copy; {currentYear} Multiverse. Tous droits réservés.</p>
      </div>
    </footer>
  )
}

export default Footer
