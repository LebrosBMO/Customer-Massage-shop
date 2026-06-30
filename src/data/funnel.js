// ---------------------------------------------------------------------------
// Алхам алхмаар, салаалсан (branching) асуулгын тохиргоо ба анхдагч асуултууд.
// Асуултуудыг админ хэсгээс засна. Эдгээр нь зөвхөн туршилтын/нөөц өгөгдөл.
//
// Сонголт бүрд:
//   label       — харагдах текст
//   disqualifies — true бол сонгосон үед төлбөрийн цонх гарахгүй
//   next        — дараа нь очих асуулт:
//                   undefined/null = дараалсан дараагийн асуулт
//                   асуултын id     = тухайн асуулт руу үсрэх (салаа)
//                   'end'           = асуулгыг дуусгах (холбоо барих → төлбөр)
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
      // Салаа: хосуудын массаж сонговол "хэдүүлээ" гэдгийг асууна.
      { label: 'Хосуудын массаж', disqualifies: false, next: 'q-people' },
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
      { label: 'Тийм, бэлэн', disqualifies: false, next: 'end' },
      { label: 'Үгүй', disqualifies: true, next: 'end' },
    ],
  },
  {
    // Зөвхөн "Хосуудын массаж" сонгосон үед энэ асуулт гарна, дараа нь q-when руу.
    id: 'q-people',
    sort_order: 5,
    active: true,
    question: 'Та хэдүүлээ ирэх вэ?',
    choices: [
      { label: '2 хүн', disqualifies: false, next: 'q-when' },
      { label: '3-аас дээш', disqualifies: false, next: 'q-when' },
    ],
  },
]
