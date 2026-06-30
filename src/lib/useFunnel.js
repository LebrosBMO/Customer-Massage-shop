import { useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from './supabase.js'
import { defaultQuestions } from '../data/funnel.js'

// Public hook: returns the active funnel questions, sorted. Reads from Supabase
// when configured, otherwise falls back to the bundled default questions.
export function useFunnel() {
  const [questions, setQuestions] = useState(supabaseConfigured ? [] : defaultQuestions)
  const [loading, setLoading] = useState(supabaseConfigured)

  useEffect(() => {
    if (!supabaseConfigured) return
    let alive = true
    ;(async () => {
      const { data, error } = await supabase
        .from('funnel_questions')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true })
      if (!alive) return
      setQuestions(error || !data?.length ? defaultQuestions : data)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  return { questions, loading }
}
