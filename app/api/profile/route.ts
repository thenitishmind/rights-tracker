import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// Uses service role to read the calling user's own profile — bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: Request) {
  try {
    // Get user from the request Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify the token and get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Read profile using service role (bypasses RLS)
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*, branch:branches(name, code, cluster_name)')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Profile fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If no profile exists, create a default one
    if (!profile) {
      const isAdminEmail = user.email?.toLowerCase().includes('admin001')
      const defaultRole = isAdminEmail ? 'admin' : 'viewer'

      const { data: newProfile } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email || '',
          full_name: isAdminEmail ? 'Admin' : (user.email?.split('@')[0] || 'User'),
          role: defaultRole,
          can_view: true,
          can_edit: defaultRole === 'admin',
          is_active: true,
        })
        .select('*, branch:branches(name, code, cluster_name)')
        .maybeSingle()

      return NextResponse.json({ profile: newProfile || { id: user.id, email: user.email, role: defaultRole, can_view: true, can_edit: isAdminEmail, is_active: true } })
    }

    // Admin always has full rights regardless of DB values
    if (profile.role === 'admin') {
      profile.can_view = true
      profile.can_edit = true
      profile.is_active = true
    }

    return NextResponse.json({ profile })
  } catch (err) {
    console.error('Profile API error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
