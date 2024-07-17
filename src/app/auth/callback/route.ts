import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)

    // Check if the user has a username
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      // If the profile doesn't exist or doesn't have a username, redirect to set username page
      if (!profile || !profile.username) {
        return NextResponse.redirect(new URL('/set-username', requestUrl.origin))
      }
    }
  }

  // Redirect to the home page
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
