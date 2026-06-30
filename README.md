# Aurora Salon — Massage & Wellness Website

A React + Vite template for a massage / wellness salon, with the same section
structure as a typical salon site (home, therapists & schedules, price list,
services, FAQ, blog, contacts, and a reservation flow). Reservations are stored
in Supabase. All content is original placeholder text and stock imagery — swap
it for your own brand.

## Tech stack

- **React 18** + **React Router 6**
- **Vite** dev server / build
- **Supabase** (Postgres) for storing reservation requests
- Plain CSS (no framework) — one stylesheet at `src/index.css`

## Getting started

```bash
npm install
npm run dev
```

The site runs at http://localhost:5173. It works immediately in **demo mode** —
the reservation form accepts input but does not store it until you connect
Supabase.

## Connecting Supabase (real reservations)

1. Create a free project at https://supabase.com.
2. In **SQL Editor**, run the script in [`supabase/schema.sql`](supabase/schema.sql).
3. Copy `.env.example` to `.env` and fill in:
   ```
   VITE_SUPABASE_URL=...        # Project Settings > API > Project URL
   VITE_SUPABASE_ANON_KEY=...   # Project Settings > API > anon public key
   ```
4. Restart `npm run dev`. The reservation form now writes to the
   `reservations` table. View submissions in the Supabase **Table Editor**.

Security note: the anon key only has permission to *insert* reservations
(enforced by Row Level Security). Visitors cannot read other people's bookings.

## Rebranding

Almost everything you need to change lives in **`src/data/content.js`**:

- `brand` — name, tagline, intro, email, Instagram, age notice
- `locations` — addresses, phones, opening hours
- `services`, `priceList` — your menu and prices
- `masseuses` — therapist profiles, tags, weekly schedules
- `faq`, `blogPosts`, `testimonials`

Replace the Unsplash image URLs with your own photos (drop them in `public/`
and reference as `/your-image.jpg`). Colours live at the top of
`src/index.css` under `:root`.

## Pages

| Route          | File                          |
|----------------|-------------------------------|
| `/`            | `src/pages/Home.jsx`          |
| `/masseuses`   | `src/pages/Masseuses.jsx`     |
| `/prices`      | `src/pages/PriceList.jsx`     |
| `/services`    | `src/pages/Services.jsx`      |
| `/faq`         | `src/pages/Faq.jsx`           |
| `/blog`        | `src/pages/Blog.jsx`          |
| `/contacts`    | `src/pages/Contacts.jsx`      |
| `/reservation` | `src/pages/Reservation.jsx`   |

## Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build locally
```

Deploy `dist/` to any static host (Netlify, Vercel, Cloudflare Pages, etc.).
Add the two `VITE_SUPABASE_*` variables in your host's environment settings.

---

This is an original template inspired by the general structure of salon
websites. It does not copy any specific site's text, images, or branding.
