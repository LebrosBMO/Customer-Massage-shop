// ---------------------------------------------------------------------------
// Алхам алхмаар, салаалсан (branching) асуулгын тохиргоо ба анхдагч асуултууд.
// Асуултуудыг админ хэсгээс засна. Эдгээр нь зөвхөн туршилтын/нөөц өгөгдөл.
//
// Асуулт бүрд:
//   type      — 'single' (нэг сонголт) | 'multi' (олон сонголт) | 'text' (бичих)
//   required  — true бол хариулахгүйгээр цааш явж болохгүй
//   choices   — [{ label, disqualifies, next }]  (single/multi-д хэрэглэнэ)
//
// Сонголтын талбарууд:
//   disqualifies — true бол сонгосон үед төлбөрийн цонх гарахгүй
//   next         — дараа нь очих асуулт (зөвхөн single):
//                    undefined = дараалсан дараагийн асуулт
//                    асуултын id = тухайн асуулт руу үсрэх (салаа)
//                    'end' = асуулгыг дуусгах
// ---------------------------------------------------------------------------

export const funnelConfig = {
  depositAmount: 10000,
  intro: {
    title: 'Хувийн зөвлөгөө',
    text: 'Танд хамгийн тохирох үйлчилгээг санал болгохын тулд хэдэн товч асуултад хариулна уу. Ердөө 1 минут зарцуулна.',
    cta: 'Эхлэх',
  },
  qualifyTitle: 'Гайхалтай! Та манай үйлчилгээнд тохирч байна',
  qualifyText: 'Захиалгаа баталгаажуулахын тулд урьдчилгаа төлбөрөө төлнө үү.',
  declineTitle: 'Баярлалаа',
  declineText: 'Уучлаарай, таны хариулт одоогийн нөхцөлд бүрэн тохирохгүй байна. Бид тантай удахгүй холбогдох болно.',
  doneTitle: 'Захиалга баталгаажлаа',
  doneText: 'Таны урьдчилгаа төлбөрийг хүлээн авлаа. Бид удахгүй тантай холбогдоно. Баярлалаа!',
}

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
    // ОЛОН СОНГОЛТ (multi) — олон хайрцаг тэмдэглэж болно.
    id: 'q-goals',
    sort_order: 3,
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
    sort_order: 4,
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
    sort_order: 5,
    active: true,
    type: 'text',
    required: false,
    question: 'Нэмэлт хүсэлт эсвэл тэмдэглэл байвал бичнэ үү (заавал биш).',
    choices: [],
  },
  {
    id: 'q-deposit',
    sort_order: 6,
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
    sort_order: 7,
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
