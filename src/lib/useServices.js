import { useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from './supabase.js'
import { services as staticServices, priceList } from '../data/content.js'

// Build the static fallback used in demo mode (no Supabase): merge the service
// cards from content.js with their prices from the price list, by name. This
// gives every service the same shape as a row in the Supabase `services` table.
export function staticServiceList() {
  return staticServices.map((s, i) => {
    const price = priceList.find((p) => p.service === s.name) || {}
    return {
      id: s.id,
      sort_order: i,
      name: s.name,
      duration: s.duration,
      price_60: price.d60 ?? null,
      price_90: price.d90 ?? null,
      blurb: s.blurb,
      image: s.image,
      active: true,
    }
  })
}

// Public-facing hook: returns active services, sorted. Reads from Supabase when
// configured, otherwise falls back to the static list (so the site still works
// in demo mode and if the network/table is unavailable).
export function useServices() {
  const [services, setServices] = useState(supabaseConfigured ? [] : staticServiceList())
  const [loading, setLoading] = useState(supabaseConfigured)

  useEffect(() => {
    if (!supabaseConfigured) return
    let alive = true
    ;(async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true })
      if (!alive) return
      // On error (e.g. table not created yet) fall back to the bundled content.
      setServices(error ? staticServiceList() : data)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  return { services, loading }
}
