import { useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from './supabase.js'
import { brand, testimonials as staticTestimonials } from '../data/content.js'

const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=1600&q=70'

const staticContent = {
  tagline: brand.tagline,
  intro: brand.intro,
  hero_image: DEFAULT_HERO_IMAGE,
  testimonials: staticTestimonials,
}

// Public hook: returns the editable homepage content. Reads from Supabase
// when configured, otherwise falls back to the bundled static content.
export function useSiteContent() {
  const [content, setContent] = useState(supabaseConfigured ? null : staticContent)
  const [loading, setLoading] = useState(supabaseConfigured)

  useEffect(() => {
    if (!supabaseConfigured) return
    let alive = true
    ;(async () => {
      const { data, error } = await supabase
        .from('salon_site_content')
        .select('*')
        .eq('id', 1)
        .maybeSingle()
      if (!alive) return
      setContent(error || !data ? staticContent : data)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  return { content: content || staticContent, loading }
}
