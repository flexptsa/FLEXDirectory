import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRADE_PROGRESSION: Record<string, string> = {
  '9th': '10th',
  '10th': '11th',
  '11th': '12th',
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // Verify caller is an admin via the Authorization header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Verify the calling user is a moderator or super_admin
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
  const { data: callerProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerProfile?.role !== 'moderator' && callerProfile?.role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // Parse dry_run flag from request body
  const body = await req.json().catch(() => ({}))
  const dryRun: boolean = body.dry_run !== false // default to true for safety

  const graduationYear = new Date().getFullYear()

  // ----------------------------------------------------------
  // 1. Fetch all active (non-alumni) students
  // ----------------------------------------------------------
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, first_name, last_name, grade, family_id')
    .eq('is_alumni', false)

  if (studentsError) {
    return new Response(JSON.stringify({ error: studentsError.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const advancing: { id: string; name: string; from: string; to: string; family_id: string }[] = []
  const becomingAlumni: { id: string; name: string; family_id: string }[] = []

  for (const student of students ?? []) {
    const nextGrade = GRADE_PROGRESSION[student.grade]
    if (nextGrade) {
      advancing.push({
        id: student.id,
        name: [student.first_name, student.last_name].filter(Boolean).join(' '),
        from: student.grade,
        to: nextGrade,
        family_id: student.family_id,
      })
    } else if (student.grade === '12th') {
      becomingAlumni.push({
        id: student.id,
        name: [student.first_name, student.last_name].filter(Boolean).join(' '),
        family_id: student.family_id,
      })
    }
    // Students with unrecognised grades are left untouched
  }

  // ----------------------------------------------------------
  // 2. Determine which families will become alumni
  //    (all students in the family are either already alumni
  //     or are in the becomingAlumni list from this run)
  // ----------------------------------------------------------
  const { data: allFamilies, error: familiesError } = await supabase
    .from('families')
    .select(`
      id, family_display_name,
      students!inner(id, is_alumni)
    `)
    .eq('is_alumni', false)

  if (familiesError) {
    return new Response(JSON.stringify({ error: familiesError.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const alumniStudentIds = new Set(becomingAlumni.map(s => s.id))

  const familiesBecomingAlumni: { id: string; familyName: string }[] = []

  for (const family of allFamilies ?? []) {
    const allStudentsWillBeAlumni = (family.students as any[]).every(
      s => s.is_alumni || alumniStudentIds.has(s.id)
    )
    if (allStudentsWillBeAlumni) {
      familiesBecomingAlumni.push({
        id: family.id,
        familyName: family.family_display_name,
      })
    }
  }

  // ----------------------------------------------------------
  // 3. Build preview response (returned for both dry and live)
  // ----------------------------------------------------------
  const preview = {
    dry_run: dryRun,
    graduation_year: graduationYear,
    studentsAdvancing: advancing.map(s => ({ name: s.name, from: s.from, to: s.to })),
    studentsBecomingAlumni: becomingAlumni.map(s => ({ name: s.name })),
    familiesBecomingAlumni: familiesBecomingAlumni.map(f => ({ familyName: f.familyName })),
  }

  if (dryRun) {
    return new Response(JSON.stringify(preview), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // ----------------------------------------------------------
  // 4. Commit changes (only reached when dry_run = false)
  // ----------------------------------------------------------

  // Advance grades
  for (const student of advancing) {
    await supabase
      .from('students')
      .update({ grade: student.to })
      .eq('id', student.id)
  }

  // Mark graduating students as alumni
  if (becomingAlumni.length > 0) {
    await supabase
      .from('students')
      .update({ is_alumni: true, graduation_year: graduationYear })
      .in('id', becomingAlumni.map(s => s.id))
  }

  // Cascade to families, parents, and users
  if (familiesBecomingAlumni.length > 0) {
    const familyIds = familiesBecomingAlumni.map(f => f.id)

    await supabase
      .from('families')
      .update({ is_alumni: true })
      .in('id', familyIds)

    await supabase
      .from('parents')
      .update({ is_alumni: true })
      .in('family_id', familyIds)

    await supabase
      .from('users')
      .update({ is_alumni: true })
      .in('family_id', familyIds)
  }

  return new Response(JSON.stringify({ ...preview, committed: true }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})