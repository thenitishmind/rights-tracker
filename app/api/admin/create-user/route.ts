import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Use service role key for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body = await request.json()
    const { email, password, full_name, role, branch_id, can_view, can_edit, is_active } = body

    // Verify caller is admin
    const authHeader = request.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)
      if (user) {
        const { data: callerProfile } = await supabaseAdmin
          .from('user_profiles').select('role').eq('id', user.id).single()
        if (callerProfile?.role !== 'admin') {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }
      }
    }

    // Create user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data.user) return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })

    // Update profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles').update({
        full_name, role,
        branch_id: branch_id || null,
        can_view: can_view ?? true,
        can_edit: can_edit ?? false,
        is_active: is_active ?? true,
      }).eq('id', data.user.id)

    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

    return NextResponse.json({ success: true, userId: data.user.id })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
