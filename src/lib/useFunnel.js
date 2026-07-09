import { useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from './supabase.js'
import { defaultQuestions, defaultGroups } from '../data/funnel.js'

// Public hook: returns the active funnel questions + score groups, sorted.
// Reads from Supabase when configured, otherwise falls back to the bundled
// default questions/groups.
export function useFunnel() {
  const [questions, setQuestions] = useState(supabaseConfigured ? [] : defaultQuestions)
  const [groups, setGroups] = useState(supabaseConfigured ? [] : defaultGroups)
  const [loading, setLoading] = useState(supabaseConfigured)

  useEffect(() => {
    if (!supabaseConfigured) return
    let alive = true
    ;(async () => {
      const [qRes, gRes] = await Promise.all([
        supabase
          .from('salon_funnel_questions')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('salon_funnel_groups')
          .select('*')
          .order('sort_order', { ascending: true }),
      ])
      if (!alive) return
      setQuestions(qRes.error || !qRes.data?.length ? defaultQuestions : qRes.data)
      setGroups(gRes.error ? defaultGroups : gRes.data || [])
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  return { questions, groups, loading }
}
