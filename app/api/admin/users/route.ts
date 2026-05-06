import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Uses service role key — bypasses RLS for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET() {
  try {
    const { data: users, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*, branch:branches(name, code, cluster_name)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ users })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, full_name, role, branch_id, can_view, can_edit, is_active } = body

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password,
      email_confirm: true,
      user_metadata: { full_name, role }
    })
    if (authError) throw authError

    // Update profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({ full_name, role, branch_id: branch_id || null, can_view, can_edit, is_active })
      .eq('id', authData.user.id)
    if (profileError) throw profileError

    return NextResponse.json({ success: true, user: authData.user })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, full_name, role, branch_id, can_view, can_edit, is_active } = body

    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({ full_name, role, branch_id: branch_id || null, can_view, can_edit, is_active })
      .eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 })

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
