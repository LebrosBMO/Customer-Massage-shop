// ---------------------------------------------------------------------------
// Алхам алхмаар, салаалсан (branching) асуулгын тохиргоо ба анхдагч асуултууд.
// Асуултуудыг админ хэсгээс засна. Эдгээр нь зөвхөн туршилтын/нөөц өгөгдөл.
//
// Асуулт бүрд:
//   type      — 'single' (нэг сонголт) | 'multi' (олон сонголт) | 'text' (бичих)
//   required  — true бол хариулахгүйгээр цааш явж болохгүй
//   choices   — [{ label, disqualifies, points, next }]  (single/multi-д хэрэглэнэ)
//
// Сонголтын талбарууд:
//   disqualifies — true бол сонгосон үед төлбөрийн цонх гарахгүй
//   points       — тухайн хариултын оноо (жишээ нь 5 сонголттой асуултад
//                   1-ээс 5 хүртэл оноо өгч болно). Сонгосон бүх хариултын
//                   оноог нийлбэрлээд захиалгын хамт хадгална — админ
//                   (Формын хариу) хэсэгт нийт оноог харна.
//   next         — дараа нь очих асуулт (зөвхөн single):
//                    undefined = дараалсан дараагийн асуулт
//                    асуултын id = тухайн асуулт руу үсрэх (салаа)
//                    'end' = асуулгыг дуусгах
//
// Бүлэг (group): асуулт бүрийг бүлэгт хамааруулж болно. Бүлэг тус бүр өөрийн
// "үржүүлэгч" (multiplier) утгатай — тухайн асуултын сонгосон хариултын оноог
// энэ үржүүлэгчээр үржүүлээд нийт онооноос нэмнэ. Жишээ: Бүлэг 1 = x1,
// Бүлэг 2 = x1.5, Бүлэг 3 = x2. Асуулт бүлэггүй бол x1 гэж тооцно.
// ---------------------------------------------------------------------------

export const funnelConfig = {
  depositAmount: 50000,
  // Ажиллах цаг ба цагийн хуваарь. Үйлчилгээ = serviceMin, завсарлага = gapMin.
  // Эхлэх боломжит цагууд эндээс автоматаар тооцоологдоно.
  booking: { open: '12:00', close: '22:00', serviceMin: 60, gapMin: 30 },
  intro: {
    title: 'Үйлчлүүлэгчийн асуумж',
    text: 'Энэ үйлчилгээг авахын тулд дараах асуултанд үнэн зөв хариулна уу.',
    cta: 'Эхлэх',
  },
  qualifyTitle: '',
  qualifyText: 'Захиалгаа баталгаажуулахын тулд урьдчилгаа төлбөрөө төлнө үү.',
  declineTitle: 'Баярлалаа',
  declineText: 'Уучлаарай, таны хариулт одоогийн нөхцөлд бүрэн тохирохгүй байна. Бид тантай удахгүй холбогдох болно.',
  doneTitle: 'Захиалга баталгаажлаа',
  doneText: 'Таны урьдчилгаа төлбөрийг хүлээн авлаа. Бид удахгүй тантай холбогдоно. Баярлалаа!',
}

// Ажиллах цагаас эхлэх боломжит цагуудыг тооцоолно.
// Жишээ 12:00–22:00, үйлчилгээ 60 мин, завсар 30 мин → 12:00, 13:30, ... 21:00
export function bookingSlots(cfg = funnelConfig.booking) {
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const pad = (n) => String(n).padStart(2, '0')
  const fmt = (mins) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`
  const start = toMin(cfg.open)
  const end = toMin(cfg.close)
  const step = cfg.serviceMin + cfg.gapMin
  const out = []
  for (let t = start; t + cfg.serviceMin <= end; t += step) out.push(fmt(t))
  return out
}

export const defaultGroups = [
  { id: 'g1', sort_order: 0, name: 'Бүлэг 1', multiplier: 1 },
  { id: 'g2', sort_order: 1, name: 'Бүлэг 2', multiplier: 1.5 },
  { id: 'g3', sort_order: 2, name: 'Бүлэг 3', multiplier: 2 },
  { id: 'g4', sort_order: 3, name: 'Бүлэг 4', multiplier: 2 },
]

export const defaultQuestions = [
  {
    id: 'q-before',
    sort_order: 0,
    active: true,
    type: 'single',
    required: true,
    question: 'Та урьд нь манай үйлчилгээг авч байсан уу?',
    choices: [
      { label: 'Тийм, өмнө нь', disqualifies: false },
      // Жишээ: энэ хариултыг сонговол шууд цаг сонгож, урьдчилгаа төлнө.
      { label: 'Үгүй, анх удаа', disqualifies: false, next: 'pay' },
    ],
  },
  {
    id: 'q-age',
    sort_order: 1,
    active: true,
    type: 'single',
    required: true,
    question: 'Таны нас?',
    choices: [
      { label: '18-аас доош', disqualifies: true },
      { label: '18 – 25', disqualifies: false },
      { label: '26 – 40', disqualifies: false },
      { label: '40-өөс дээш', disqualifies: false },
    ],
  },
  {
    id: 'q-service',
    sort_order: 2,
    active: true,
    type: 'single',
    required: true,
    question: 'Ямар үйлчилгээ сонирхож байна?',
    choices: [
      { label: 'Сонгодог тайвшруулах', disqualifies: false, explain: 'Бүх биеийг хамарсан, дулаахан тосоор хийх сонгодог массаж. Булчингийн хурцадлыг тайлж, гүн амралт өгнө. Үргэлжлэх хугацаа: 60–90 мин.' },
      { label: 'Тантрик массаж', disqualifies: false, explain: 'Амьсгал, мэдрэхүйд төвлөрсөн удаан, ухамсартай зан үйл. Бие сэтгэлийг гүнзгий тайвшруулна. Үргэлжлэх хугацаа: 90 мин.' },
      { label: 'Хосуудын массаж', disqualifies: false, next: 'q-people', explain: 'Хоёр хүнд зэрэг, хажуу хажуугаа хийх дотно, тайван зан үйл. Хамтдаа амрах төгс сонголт.' },
      { label: 'Бусад / Мэдэхгүй', disqualifies: false },
    ],
  },
  {
    // ОНОО (points) жишээ: 5 сонголт, тус бүр 1-ээс 5 хүртэл оноотой.
    id: 'q-urgency',
    sort_order: 3,
    active: true,
    type: 'single',
    required: true,
    question: 'Одоо ямар түвшний тайвшрал хэрэгтэй байна вэ?',
    choices: [
      { label: 'Бага зэрэг — зүгээр амрахыг хүсэж байна', disqualifies: false, points: 1 },
      { label: 'Дунд зэрэг ядарсан байна', disqualifies: false, points: 2 },
      { label: 'Нэлээд стресстэй, амралт хэрэгтэй', disqualifies: false, points: 3 },
      { label: 'Их ядарсан, яаралтай амрах хэрэгтэй', disqualifies: false, points: 4 },
      { label: 'Туйлдаа хүрсэн — яг одоо тусламж хэрэгтэй', disqualifies: false, points: 5 },
    ],
  },
  {
    // ОЛОН СОНГОЛТ (multi) — олон хайрцаг тэмдэглэж болно.
    id: 'q-goals',
    sort_order: 4,
    active: true,
    type: 'multi',
    required: false,
    question: 'Юунд илүү анхаарах вэ? (хэдийг ч сонгож болно)',
    choices: [
      { label: 'Стресс тайлах', disqualifies: false },
      { label: 'Булчин сулруулах', disqualifies: false },
      { label: 'Гүн амралт', disqualifies: false },
      { label: 'Дотно уур амьсгал', disqualifies: false },
    ],
  },
  {
    id: 'q-when',
    sort_order: 5,
    active: true,
    type: 'single',
    required: true,
    question: 'Хэзээ зочлохыг хүсэж байна?',
    choices: [
      { label: 'Өнөөдөр', disqualifies: false },
      { label: 'Энэ долоо хоногт', disqualifies: false },
      { label: 'Дараа нь төлөвлөж байна', disqualifies: false },
    ],
  },
  {
    // ТЕКСТ БИЧИХ (text) — чөлөөт бичвэр.
    id: 'q-note',
    sort_order: 6,
    active: true,
    type: 'text',
    required: false,
    question: 'Нэмэлт хүсэлт эсвэл тэмдэглэл байвал бичнэ үү (заавал биш).',
    choices: [],
  },
  {
    id: 'q-deposit',
    sort_order: 7,
    active: true,
    type: 'single',
    required: true,
    question: 'Захиалгаа баталгаажуулахын тулд бага хэмжээний урьдчилгаа төлөхөд бэлэн үү?',
    choices: [
      { label: 'Тийм, бэлэн', disqualifies: false, next: 'end' },
      { label: 'Үгүй', disqualifies: true, next: 'end' },
    ],
  },
  {
    id: 'q-people',
    sort_order: 8,
    active: true,
    type: 'single',
    required: true,
    question: 'Та хэдүүлээ ирэх вэ?',
    choices: [
      { label: '2 хүн', disqualifies: false, next: 'q-goals' },
      { label: '3-аас дээш', disqualifies: false, next: 'q-goals' },
    ],
  },
]
