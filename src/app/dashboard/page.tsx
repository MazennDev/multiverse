import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function Dashboard() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/signin')
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-900 to-blue-900 p-4">
      <h1 className="text-4xl font-bold text-white mb-4">Tableau de bord</h1>
      <p className="text-xl text-gray-300">Bienvenue, {session.user.email}</p>
    </div>
  )
}
