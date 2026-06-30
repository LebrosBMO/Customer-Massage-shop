// ---------------------------------------------------------------------------
// Алхам алхмаар асуулгын (funnel) тохиргоо ба анхдагч асуултууд.
// Асуултуудыг админ хэсгээс засна. Эдгээр нь зөвхөн туршилтын/нөөц өгөгдөл.
// ---------------------------------------------------------------------------

export const funnelConfig = {
  // Хэдэн асуултыг нэг дэлгэцэнд харуулах вэ (утсанд ээлтэй).
  perStep: 2,
  // Урьдчилгаа төлбөрийн дүн (₮).
  depositAmount: 10000,
  intro: {
    title: 'Хувийн зөвлөгөө',
    text: 'Танд хамгийн тохирох үйлчилгээг санал болгохын тулд хэдэн товч асуултад хариулна уу. Ердөө 1 минут зарцуулна.',
    cta: 'Эхлэх',
  },
  // Шаардлага хангасан үед харагдах текст (төлбөрийн өмнө).
  qualifyTitle: 'Гайхалтай! Та манай үйлчилгээнд тохирч байна',
  qualifyText: 'Захиалгаа баталгаажуулахын тулд урьдчилгаа төлбөрөө төлнө үү.',
  // Шаардлага хангаагүй үед харагдах текст.
  declineTitle: 'Баярлалаа',
  declineText: 'Уучлаарай, таны хариулт одоогийн нөхцөлд бүрэн тохирохгүй байна. Бид тантай удахгүй холбогдох болно.',
  doneTitle: 'Захиалга баталгаажлаа',
  doneText: 'Таны урьдчилгаа төлбөрийг хүлээн авлаа. Бид удахгүй тантай холбогдоно. Баярлалаа!',
}

// Анхдагч асуултууд. Сонголт бүрд disqualifies: true гэвэл тухайн хариулт
// сонгосон үед үйлчлүүлэгч шаардлага хангахгүй (төлбөрийн цонх гарахгүй).
export const defaultQuestions = [
  {
    id: 'q-before',
    sort_order: 0,
    active: true,
    question: 'Та урьд нь манай үйлчилгээг авч байсан уу?',
    choices: [
      { label: 'Тийм, өмнө нь', disqualifies: false },
      { label: 'Үгүй, анх удаа', disqualifies: false },
    ],
  },
  {
    id: 'q-age',
    sort_order: 1,
    active: true,
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
    question: 'Ямар үйлчилгээ сонирхож байна?',
    choices: [
      { label: 'Сонгодог тайвшруулах', disqualifies: false },
      { label: 'Тантрик массаж', disqualifies: false },
      { label: 'Хосуудын массаж', disqualifies: false },
      { label: 'Бусад / Мэдэхгүй', disqualifies: false },
    ],
  },
  {
    id: 'q-when',
    sort_order: 3,
    active: true,
    question: 'Хэзээ зочлохыг хүсэж байна?',
    choices: [
      { label: 'Өнөөдөр', disqualifies: false },
      { label: 'Энэ долоо хоногт', disqualifies: false },
      { label: 'Дараа нь төлөвлөж байна', disqualifies: false },
    ],
  },
  {
    id: 'q-deposit',
    sort_order: 4,
    active: true,
    question: 'Захиалгаа баталгаажуулахын тулд бага хэмжээний урьдчилгаа төлөхөд бэлэн үү?',
    choices: [
      { label: 'Тийм, бэлэн', disqualifies: false },
      { label: 'Үгүй', disqualifies: true },
    ],
  },
]
