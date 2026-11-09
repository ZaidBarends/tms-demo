import type { Data, Course, Session, Enrolment, Learner, Certificate, Receipt, Invoice, Opportunity, Quote, Stage, Payer } from './types'
import { addDays, today, iso } from './format'

const T = () => today()

export function buildSeed(): Data {
  const now = T()
  const d = (n: number) => addDays(now, n)

  const orgs = [
    { id: 'o1', name: 'Cape Freight', sector: 'Freight forwarding', staff: 120, city: 'Cape Town' },
    { id: 'o2', name: 'Karoo Mining Services', sector: 'Mining services', staff: 340, city: 'Kimberley' },
    { id: 'o3', name: 'Swift Route Logistics', sector: 'Logistics', staff: 85, city: 'Durban' },
    { id: 'o4', name: 'Overberg Municipality', sector: 'Local government', staff: 600, city: 'Caledon' },
    { id: 'o5', name: 'Fynbos Retail Group', sector: 'Retail', staff: 210, city: 'Stellenbosch' },
  ]
  const staff = [
    { id: 's1', name: 'Thandi Mokoena', role: 'admin' as const, title: 'Training manager', email: 'thandi@example.test' },
    { id: 's2', name: 'Pieter van Wyk', role: 'finance' as const, title: 'Finance lead', email: 'pieter@example.test' },
    { id: 's3', name: 'Naledi Dlamini', role: 'instructor' as const, title: 'Trainer', email: 'naledi@example.test' },
    { id: 's4', name: 'Kagiso Mthembu', role: 'instructor' as const, title: 'Trainer', email: 'kagiso@example.test' },
    { id: 's5', name: 'Fatima Adams', role: 'instructor' as const, title: 'Trainer', email: 'fatima@example.test' },
    { id: 's6', name: 'Ruan Pretorius', role: 'admin' as const, title: 'Sales coordinator', email: 'ruan@example.test' },
  ]
  const contacts = [
    { id: 'c1', name: 'Ayesha Patel', orgId: 'o1', email: 'ayesha.patel@capefreight.example', title: 'Learning and development lead' },
    { id: 'c2', name: 'Gerhard Visser', orgId: 'o2', email: 'gerhard@karoomining.example', title: 'Safety manager' },
    { id: 'c3', name: 'Nandi Shabalala', orgId: 'o3', email: 'nandi@swiftroute.example', title: 'HR business partner' },
    { id: 'c4', name: 'Pieter Smit', orgId: 'o4', email: 'psmit@overberg.example', title: 'Skills development facilitator' },
    { id: 'c5', name: 'Rochelle Jacobs', orgId: 'o5', email: 'rochelle@fynbosretail.example', title: 'Store operations manager' },
  ]
  const recruiters = [
    { id: 'r1', name: 'Marcus Lee', company: 'Atlas Recruitment', email: 'marcus@atlasrecruit.example', approved: true },
    { id: 'r2', name: 'Chloe Naidoo', company: 'Bluegum Talent', email: 'chloe@bluegumtalent.example', approved: true },
    { id: 'r3', name: 'Dumisani Zulu', company: 'Harbour Search', email: 'dumisani@harboursearch.example', approved: false },
  ]

  // ---- learners (40: 14 employer-paid B2B, 8 internal, 18 B2C) ----
  const b2b: [string, string][] = [
    ['Johan Botha', 'o1'], ['Nomsa Dube', 'o1'], ['Riaan Steyn', 'o1'], ['Thabo Molefe', 'o1'], ['Carla Jacobs', 'o1'],
    ['Lwazi Ngcobo', 'o1'], ['Megan Fortuin', 'o1'], ['Sibusiso Cele', 'o1'], ['Anele Mkhize', 'o1'],
    ['Hendrik Louw', 'o2'], ['Palesa Sithole', 'o2'], ['Yusuf Ebrahim', 'o3'], ['Busisiwe Khoza', 'o4'], ['Tshepo Radebe', 'o5'],
  ]
  const internal = ['Sipho Khumalo', 'Zodwa Nkosi', 'Marius Kruger', 'Priya Reddy', 'Lerato Maseko', 'Cameron Wells', 'Ntombi Zwane', 'Gareth Petersen']
  const b2c = ['Zanele Ndlovu', 'Lindiwe Mahlangu', 'Kabelo Mokoena', 'Amahle Zulu', 'Jaco van der Merwe', 'Refilwe Tau', 'Sandile Mbatha', 'Naomi Fisher',
    'Bongani Mthethwa', 'Tanya Olivier', 'Vusi Ndaba', 'Charmaine Daniels', 'Itumeleng Phiri', 'Aiden Govender', 'Lebo Sebola', 'Fiona Mackenzie', 'Mpho Ledwaba', 'Daniel Abrahams']
  const cities = ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria', 'Gqeberha', 'Bloemfontein', 'Stellenbosch', 'Polokwane']
  const slug = (n: string) => n.toLowerCase().replace(/[^a-z ]/g, '').replace(/ /g, '.')
  const learners: Learner[] = []
  b2b.forEach(([n, o], i) => learners.push({ id: `l${learners.length + 1}`, name: n, type: 'b2b', orgId: o, email: `${slug(n)}@${orgs.find(x => x.id === o)!.name.split(' ')[0].toLowerCase()}.example`, phone: `082 555 ${String(1100 + i)}`, city: cities[i % 8] }))
  internal.forEach((n, i) => learners.push({ id: `l${learners.length + 1}`, name: n, type: 'internal', email: `${slug(n)}@zimele.example`, phone: `083 555 ${String(2200 + i)}`, city: 'Cape Town' }))
  b2c.forEach((n, i) => learners.push({ id: `l${learners.length + 1}`, name: n, type: 'b2c', email: `${slug(n)}@mail.example`, phone: `071 555 ${String(3300 + i)}`, city: cities[(i + 2) % 8] }))
  const L = (name: string) => learners.find(l => l.name === name)!.id

  // ---- courses (16) ----
  const mk = (n: number, code: string, title: string, category: string, soft: boolean, price: number, hours: number, skills: string[], description: string): Course =>
    ({ id: `k${n}`, code, title, category, soft, price, hours, status: 'Active', skills, description })
  const courses: Course[] = [
    mk(1, 'HSE-101', 'Workplace Health & Safety Essentials', 'Health & Safety', false, 2400, 8, ['Hazard identification', 'OHS compliance'], 'Core duties under occupational health and safety legislation, risk assessment and incident reporting.'),
    mk(2, 'HSE-210', 'Working at Heights', 'Health & Safety', false, 3950, 16, ['Fall protection', 'Hazard identification'], 'Practical fall-protection training, harness inspection and rescue planning for site teams.'),
    mk(3, 'HSE-220', 'First Aid Level 1', 'Health & Safety', false, 1500, 16, ['First aid', 'Emergency response'], 'Accredited-style first aid basics: CPR, wounds, burns, and managing a scene.'),
    mk(4, 'LDR-301', 'Leading High-Performing Teams', 'Leadership', false, 8900, 24, ['Team leadership', 'Coaching'], 'Set direction, delegate, give feedback and build accountability in your team.'),
    mk(5, 'LDR-310', 'Supervisor Foundations', 'Leadership', false, 6500, 16, ['Supervision', 'Team leadership'], 'The first-line supervisor toolkit: planning, shift handover, performance conversations.'),
    mk(6, 'PM-401', 'Project Management Fundamentals', 'Project Management', false, 9800, 24, ['Project planning', 'Stakeholder management'], 'Scope, schedule, budget and risk, using a practical project lifecycle.'),
    mk(7, 'PM-420', 'Agile Delivery Practitioner', 'Project Management', false, 12500, 32, ['Agile delivery', 'Project planning'], 'Run iterative delivery with backlogs, sprints, reviews and continuous improvement.'),
    mk(8, 'FIN-201', 'Finance for Non-Finance Managers', 'Finance Skills', false, 7200, 16, ['Financial literacy', 'Budgeting'], 'Read financial statements, understand margins and make better commercial decisions.'),
    mk(9, 'FIN-230', 'Budgeting and Cost Control', 'Finance Skills', false, 5800, 16, ['Budgeting', 'Cost control'], 'Build, monitor and defend a departmental budget with variance analysis.'),
    mk(10, 'CYB-110', 'Cybersecurity Awareness', 'Cybersecurity', false, 1800, 4, ['Cyber hygiene', 'Phishing awareness'], 'Spot phishing, protect passwords and handle data safely on any device.'),
    mk(11, 'POP-120', 'POPIA Awareness', 'Compliance', false, 2100, 6, ['Data protection', 'Compliance'], 'What the Protection of Personal Information Act means for everyday work.'),
    mk(12, 'SFT-101', 'Effective Communication', 'Soft Skills', true, 2950, 8, ['Communication', 'Active listening'], 'Clear writing, active listening and adapting your message to your audience.'),
    mk(13, 'SFT-120', 'Conflict Resolution', 'Soft Skills', true, 3400, 8, ['Conflict resolution', 'Negotiation'], 'De-escalate disagreements and reach outcomes that last.'),
    mk(14, 'SFT-130', 'Emotional Intelligence at Work', 'Soft Skills', true, 3800, 8, ['Emotional intelligence', 'Self-awareness'], 'Understand your triggers, read others and respond with intent.'),
    mk(15, 'SFT-140', 'Time Management', 'Soft Skills', true, 1950, 4, ['Time management', 'Prioritisation'], 'Prioritise, plan your week and protect deep-work time.'),
    mk(16, 'SFT-150', 'Presentation Skills', 'Soft Skills', true, 4200, 8, ['Presentation skills', 'Communication'], 'Structure a talk, handle nerves and engage any room.'),
  ]
  const C = (code: string) => courses.find(c => c.code === code)!.id

  // ---- sessions (30) ----
  const venues = ['Cape Town Training Centre – Room A', 'Cape Town Training Centre – Room B', 'Bellville Boardroom', 'Stellenbosch Hub', 'Online (video call)']
  const equip = [['Projector'], ['Projector', 'Laptop trolley'], ['Laptop trolley'], [], ['First aid manikins'], ['Harness kit']]
  const instr = ['s3', 's4', 's5']
  const offs = [-3, 2, 6, 6, 9, 12, 16, 19, 23, 26, 30, 33, 37, 41, 44, 48, 52, 56, 60, 64, 68, 72, 77, 82, 87, 92, 98, 104, 110, 116]
  const sessions: Session[] = offs.map((o, i) => ({
    id: `x${i + 1}`, courseId: courses[i % 16].id, start: d(o), venue: venues[i % 5], instructorId: instr[i % 3],
    capacity: 8 + (i % 5) * 3, equipment: courses[i % 16].code.startsWith('HSE') ? (i % 2 ? equip[4] : equip[5]) : equip[i % 4],
    status: o < 0 ? 'Completed' : 'Scheduled',
  }))
  // deliberate clash: two sessions in Room A on the same day
  sessions[2].venue = venues[0]; sessions[3].venue = venues[0]; sessions[2].instructorId = 's3'; sessions[3].instructorId = 's4'

  // ---- enrolments ----
  const enrolments: Enrolment[] = []
  const certificates: Certificate[] = []
  const receipts: Receipt[] = []
  let en = 1, ce = 1, rc = 1
  const nextSessionFor = (courseId: string) => sessions.find(s => s.courseId === courseId && s.start >= now)
  const add = (learnerId: string, courseCode: string, payer: Payer, state: 'done' | 'prog' | 'booked', opts: { orgId?: string; progress?: number; deadline?: string; daysAgo?: number } = {}) => {
    const courseId = C(courseCode); const course = courses.find(c => c.id === courseId)!
    const id = `e${en++}`
    const e: Enrolment = { id, learnerId, courseId, payer, orgId: opts.orgId, progress: 0, status: 'Booked', deadline: opts.deadline }
    if (state === 'done') {
      const ago = opts.daysAgo ?? 40
      e.progress = 100; e.status = 'Completed'; e.attended = true; e.result = 72 + (en * 7) % 24
      const cid = `CERT-${String(1000 + ce++)}`
      const expires = ['Health & Safety', 'Compliance'].includes(course.category) ? addDays(now, 365 * 2 - ago) : undefined
      certificates.push({ id: cid, learnerId, courseId, issued: addDays(now, -ago), expires })
      e.certificateId = cid
    } else if (state === 'prog') { e.progress = opts.progress ?? 40; e.status = 'In progress'; e.step = 1 }
    else { const s = nextSessionFor(courseId); if (s) e.sessionId = s.id }
    enrolments.push(e)
    if (payer === 'self') receipts.push({ id: `RCT-${String(5000 + rc++)}`, learnerId, courseId, amount: course.price * 1.15, date: addDays(now, -(opts.daysAgo ?? 3)), method: rc % 2 ? 'Card' : 'EFT', enrolmentId: id })
    return e
  }

  // Cape Freight (9 learners, employer-paid)
  const cf = b2b.filter(x => x[1] === 'o1').map(x => L(x[0]))
  cf.forEach((lid, i) => {
    add(lid, ['HSE-101', 'HSE-210', 'LDR-310', 'POP-120', 'CYB-110'][i % 5], 'employer', i % 3 === 0 ? 'done' : i % 3 === 1 ? 'prog' : 'booked', { orgId: 'o1', progress: 25 + i * 8, deadline: d(10 + i * 4), daysAgo: 20 + i })
    if (i % 2 === 0) add(lid, 'SFT-140', 'employer', 'booked', { orgId: 'o1', deadline: d(30 + i) })
  })
  add(L('Hendrik Louw'), 'HSE-210', 'employer', 'booked', { orgId: 'o2' })
  add(L('Hendrik Louw'), 'HSE-101', 'employer', 'done', { orgId: 'o2', daysAgo: 60 })
  add(L('Palesa Sithole'), 'HSE-220', 'employer', 'booked', { orgId: 'o2' })
  add(L('Yusuf Ebrahim'), 'LDR-301', 'employer', 'prog', { orgId: 'o3', progress: 55, deadline: d(21) })
  add(L('Busisiwe Khoza'), 'POP-120', 'employer', 'done', { orgId: 'o4', daysAgo: 15 })
  add(L('Tshepo Radebe'), 'SFT-120', 'employer', 'booked', { orgId: 'o5' })

  // Internal staff
  internal.forEach((n, i) => {
    const lid = L(n)
    add(lid, ['POP-120', 'CYB-110', 'LDR-301', 'SFT-130'][i % 4], 'internal', i % 3 === 0 ? 'prog' : i % 3 === 1 ? 'done' : 'booked', { progress: 30 + i * 6, deadline: d(14 + i * 3), daysAgo: 25 + i })
    if (i < 4) add(lid, 'SFT-101', 'internal', 'prog', { progress: 20 + i * 15, deadline: d(40) })
  })

  // B2C: Zanele (key persona)
  const zan = L('Zanele Ndlovu')
  add(zan, 'SFT-101', 'self', 'done', { daysAgo: 45 })
  add(zan, 'CYB-110', 'self', 'prog', { progress: 40, daysAgo: 6 })
  add(zan, 'PM-401', 'self', 'booked', { daysAgo: 2 })

  // Mixed-history learner: two self-paid + one employer-paid
  const lin = L('Lindiwe Mahlangu')
  add(lin, 'PM-401', 'self', 'done', { daysAgo: 90 })
  add(lin, 'SFT-130', 'self', 'done', { daysAgo: 55 })
  add(lin, 'HSE-101', 'employer', 'done', { orgId: 'o3', daysAgo: 200 })

  const others: [string, string[]][] = [
    ['Kabelo Mokoena', ['FIN-201', 'FIN-230']], ['Amahle Zulu', ['SFT-150', 'SFT-101']], ['Jaco van der Merwe', ['PM-420', 'PM-401']],
    ['Refilwe Tau', ['SFT-140', 'SFT-120']], ['Sandile Mbatha', ['CYB-110', 'POP-120']], ['Naomi Fisher', ['LDR-310', 'SFT-130']],
    ['Bongani Mthethwa', ['HSE-220', 'HSE-101']], ['Tanya Olivier', ['SFT-150', 'LDR-301']], ['Vusi Ndaba', ['FIN-230', 'CYB-110']],
    ['Charmaine Daniels', ['SFT-101', 'SFT-130']], ['Itumeleng Phiri', ['PM-401', 'FIN-201']],
    ['Aiden Govender', ['CYB-110']], ['Lebo Sebola', ['SFT-140']], ['Fiona Mackenzie', ['POP-120']], ['Mpho Ledwaba', ['HSE-220']], ['Daniel Abrahams', ['SFT-120']],
  ]
  others.forEach(([n, codes], i) => codes.forEach((code, j) => add(L(n), code, 'self', j === 0 ? 'done' : (i % 2 ? 'prog' : 'done'), { progress: 35 + i * 4, daysAgo: 30 + i * 5 + j * 12 })))

  // Attach upcoming (booked) enrolments to sessions where none yet, spread for class lists
  enrolments.filter(e => e.status === 'Booked' && !e.sessionId).forEach(e => { const s = nextSessionFor(e.courseId); if (s) e.sessionId = s.id })
  // A completed session with a class list (for attendance and results)
  const doneSess = sessions[0]
  ;['Nomsa Dube', 'Riaan Steyn', 'Sipho Khumalo', 'Priya Reddy'].forEach(n => {
    enrolments.push({ id: `e${en++}`, learnerId: L(n), courseId: doneSess.courseId, sessionId: doneSess.id, payer: learners.find(l => l.id === L(n))!.type === 'internal' ? 'internal' : 'employer', orgId: learners.find(l => l.id === L(n))!.orgId, progress: 0, status: 'Booked' })
  })
  // The soonest session: add class list too
  ;['Thabo Molefe', 'Carla Jacobs', 'Zodwa Nkosi', 'Marius Kruger', 'Lwazi Ngcobo'].forEach(n => {
    const lr = learners.find(l => l.id === L(n))!
    enrolments.push({ id: `e${en++}`, learnerId: lr.id, courseId: sessions[1].courseId, sessionId: sessions[1].id, payer: lr.type === 'internal' ? 'internal' : 'employer', orgId: lr.orgId, progress: 0, status: 'Booked' })
  })

  // ---- opportunities (12) ----
  const opp = (n: number, orgId: string, title: string, value: number, stage: Stage, contact: string, closeIn: number, notes: string): Opportunity =>
    ({ id: `p${n}`, orgId, title, value, stage, contact, notes, expectedClose: d(closeIn) })
  const opportunities: Opportunity[] = [
    opp(1, 'o1', 'Annual safety refresher – depot staff', 185000, 'quoted', 'Ayesha Patel', 14, 'Four cohorts across two depots; client wants a single invoice.'),
    opp(2, 'o1', 'Supervisor development programme', 120000, 'needs', 'Ayesha Patel', 30, 'Needs analysis workshop booked with the operations head.'),
    opp(3, 'o2', 'Working at Heights – shaft teams', 400000, 'won', 'Gerhard Visser', -5, 'Signed. Delivered on site in three blocks.'),
    opp(4, 'o2', 'First aid recertification', 78000, 'enquiry', 'Gerhard Visser', 45, 'Inbound call; wants prices for 60 people.'),
    opp(5, 'o3', 'Leadership essentials for team leads', 96000, 'quoted', 'Nandi Shabalala', 21, 'Comparing against one other provider.'),
    opp(6, 'o3', 'POPIA awareness – all staff', 30000, 'won', 'Nandi Shabalala', -12, 'Online delivery, completed last month.'),
    opp(7, 'o4', 'Skills programme: finance for managers', 210000, 'needs', 'Pieter Smit', 50, 'Municipal budget cycle; needs council sign-off.'),
    opp(8, 'o4', 'Cybersecurity awareness campaign', 54000, 'enquiry', 'Pieter Smit', 60, 'Early conversation.'),
    opp(9, 'o5', 'Store manager conflict resolution', 64000, 'lost', 'Rochelle Jacobs', -20, 'Went with an in-house option.'),
    opp(10, 'o5', 'Soft skills bundle – head office', 142000, 'quoted', 'Rochelle Jacobs', 18, 'Communication, EI and time management.'),
    opp(11, 'o1', 'Project management fundamentals', 98000, 'enquiry', 'Ayesha Patel', 40, 'Two intakes requested.'),
    opp(12, 'o2', 'Agile delivery for engineering office', 250000, 'needs', 'Gerhard Visser', 35, 'Wants a pilot cohort first.'),
  ]
  const tnas = [
    { id: 't1', orgId: 'o1', date: d(-10), needs: [
      { need: 'Depot staff must hold current safety certificates', courseId: C('HSE-101'), priority: 'High' as const },
      { need: 'New team leaders need supervision basics', courseId: C('LDR-310'), priority: 'Medium' as const },
      { need: 'Customer-facing staff handle personal data', courseId: C('POP-120'), priority: 'High' as const }] },
    { id: 't2', orgId: 'o4', date: d(-4), needs: [{ need: 'Budget holders struggle with variance reports', courseId: C('FIN-201'), priority: 'High' as const }] },
  ]

  // ---- quotes (8) ----
  const q = (n: number, orgId: string, lines: [string, number, number][], disc: number, status: Quote['status'], issuedAgo: number, venue: string, ins: string): Quote =>
    ({ id: `q${n}`, number: `Q-2026-${String(10 + n).padStart(3, '0')}`, orgId, lines: lines.map(([code, qty, unit]) => ({ courseId: C(code), qty, unit })), discountPct: disc, venue, instructorId: ins, status, issued: d(-issuedAgo), validUntil: d(30 - issuedAgo) })
  const quotes: Quote[] = [
    q(1, 'o1', [['HSE-101', 40, 2400], ['HSE-210', 12, 3950]], 10, 'Sent', 5, 'Client site – Cape Freight depot', 's3'),
    q(2, 'o1', [['LDR-310', 10, 6500]], 5, 'Accepted', 40, 'Cape Town Training Centre – Room A', 's4'),
    q(3, 'o1', [['SFT-140', 20, 1950], ['SFT-101', 20, 2950]], 8, 'Draft', 1, 'Online (video call)', 's5'),
    q(4, 'o2', [['HSE-210', 60, 3950]], 12, 'Accepted', 55, 'Client site – Karoo shaft', 's3'),
    q(5, 'o3', [['LDR-301', 8, 8900]], 0, 'Sent', 9, 'Bellville Boardroom', 's4'),
    q(6, 'o5', [['SFT-101', 15, 2950], ['SFT-130', 15, 3800], ['SFT-140', 15, 1950]], 10, 'Sent', 12, 'Stellenbosch Hub', 's5'),
    q(7, 'o4', [['FIN-201', 25, 7200]], 5, 'Draft', 2, 'Client site – Overberg offices', 's4'),
    q(8, 'o5', [['SFT-120', 12, 3400]], 0, 'Expired', 50, 'Stellenbosch Hub', 's5'),
  ]

  // ---- invoices (18): INV-0030 .. INV-0047 ----
  const inv = (n: number, orgId: string | undefined, learnerId: string | undefined, description: string, amount: number, status: Invoice['status'], issuedAgo: number, wb: Invoice['wb'] = 'Synced'): Invoice => {
    const issued = d(-issuedAgo); const due = addDays(issued, 30)
    return { number: `INV-${String(n).padStart(4, '0')}`, orgId, learnerId, description, amount, status, issued, due, paidOn: status === 'Paid' ? addDays(issued, 18) : undefined, wb }
  }
  const invoices: Invoice[] = [
    inv(30, 'o2', undefined, 'Working at Heights – block 1', 118000, 'Paid', 110),
    inv(31, 'o2', undefined, 'Working at Heights – block 2', 118000, 'Paid', 85),
    inv(32, 'o3', undefined, 'POPIA awareness – all staff', 30000, 'Paid', 70),
    inv(33, 'o1', undefined, 'Supervisor Foundations – cohort 1', 61750, 'Paid', 62),
    inv(34, 'o1', undefined, 'POPIA awareness – customer service', 21000, 'Paid', 55),
    inv(35, 'o5', undefined, 'Store manager workshop deposit', 32000, 'Paid', 48),
    inv(36, 'o2', undefined, 'Working at Heights – block 3', 118000, 'Overdue', 52),
    inv(37, 'o4', undefined, 'Cybersecurity awareness pilot', 22000, 'Paid', 40),
    inv(38, 'o1', undefined, 'Workplace H&S Essentials – depot A', 48000, 'Sent', 14),
    inv(39, 'o3', undefined, 'Leadership essentials – deposit', 48000, 'Sent', 9),
    inv(40, 'o5', undefined, 'Soft skills bundle – deposit', 71000, 'Sent', 7),
    inv(41, 'o1', undefined, 'Workplace H&S Essentials – depot B', 48000, 'Overdue', 41),
    inv(42, 'o4', undefined, 'Finance for managers – deposit', 105000, 'Overdue', 38, 'Failed'),
    inv(43, undefined, zan, 'Project Management Fundamentals', 9800, 'Paid', 2),
    inv(44, undefined, lin, 'Emotional Intelligence at Work', 3800, 'Paid', 55),
    inv(45, 'o2', undefined, 'First aid – pilot cohort', 26000, 'Paid', 24, 'Pending'),
    inv(46, 'o1', undefined, 'Time management workshops', 39000, 'Sent', 3, 'Pending'),
    inv(47, 'o3', undefined, 'Leadership essentials – balance', 48000, 'Sent', 1, 'Pending'),
  ]
  invoices[12].wbError = 'Customer not found in Workbook'
  invoices[4].creditNote = 3500
  invoices[8].creditNote = 2400

  // ---- talent (12 opted in + Zanele opted out) ----
  const sumry = [
    'Finance-minded analyst building budgeting and cost-control skills; looking for a junior finance partner role.',
    'Creative communicator with presentation experience, moving into account management.',
    'Delivery-focused project coordinator with agile practice, open to project officer roles.',
    'Organised, calm under pressure; time and conflict skills, seeking a team lead step.',
    'Security-conscious administrator with POPIA and cyber awareness, aiming for a compliance assistant role.',
    'People-first supervisor candidate with EI and leadership training.',
    'Site safety enthusiast with first aid and H&S essentials; seeking a safety officer trainee role.',
    'Confident presenter heading into sales enablement.',
    'Cost-aware operations junior, strong on budgeting and cyber hygiene.',
    'Communicator and mediator suited to client-facing roles.',
    'Project and finance blend, targeting a project accountant pathway.',
  ]
  const regions = ['Western Cape', 'Gauteng', 'KwaZulu-Natal', 'Gauteng', 'Eastern Cape', 'Free State', 'Western Cape', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Western Cape']
  const talent = [
    { learnerId: lin, optedIn: true, code: 'TL-4821', region: 'Gauteng', summary: 'Project manager in the making with strong emotional intelligence; interested in programme coordination roles.' },
    ...others.slice(0, 11).map(([n], i) => ({ learnerId: L(n), optedIn: true, code: `TL-${4830 + i * 7}`, region: regions[i], summary: sumry[i] })),
    { learnerId: zan, optedIn: false, code: 'TL-5107', region: 'Western Cape', summary: '' },
  ]
  const intros = [
    { id: 'i1', recruiterId: 'r1', learnerId: L('Kabelo Mokoena'), status: 'Approved' as const, message: 'We have a junior finance partner role that fits your profile.', created: d(-8), placed: true },
    { id: 'i2', recruiterId: 'r1', learnerId: L('Amahle Zulu'), status: 'Pending' as const, message: 'Interested in your presentation skills for an account role.', created: d(-2) },
    { id: 'i3', recruiterId: 'r2', learnerId: L('Jaco van der Merwe'), status: 'Declined' as const, message: 'Project officer opening in Johannesburg.', created: d(-6) },
    { id: 'i4', recruiterId: 'r2', learnerId: L('Naomi Fisher'), status: 'Approved' as const, message: 'Team lead trainee programme.', created: d(-12) },
  ]
  const audit = [
    { id: 'a1', at: new Date(Date.now() - 9 * 864e5).toISOString(), actor: 'Marcus Lee (Atlas Recruitment)', action: 'View' as const, target: 'TL-4830', detail: 'Opened profile' },
    { id: 'a2', at: new Date(Date.now() - 8 * 864e5).toISOString(), actor: 'Marcus Lee (Atlas Recruitment)', action: 'Request' as const, target: 'TL-4830', detail: 'Requested introduction' },
    { id: 'a3', at: new Date(Date.now() - 7 * 864e5).toISOString(), actor: 'Kabelo Mokoena', action: 'Approve' as const, target: 'Atlas Recruitment', detail: 'Approved introduction' },
    { id: 'a4', at: new Date(Date.now() - 6 * 864e5).toISOString(), actor: 'Chloe Naidoo (Bluegum Talent)', action: 'Request' as const, target: 'TL-4844', detail: 'Requested introduction' },
    { id: 'a5', at: new Date(Date.now() - 6 * 864e5 + 3e6).toISOString(), actor: 'Jaco van der Merwe', action: 'Decline' as const, target: 'Bluegum Talent', detail: 'Declined introduction' },
  ]

  const templates = [
    { id: 'm1', name: 'Booking confirmation', subject: 'Your booking is confirmed', body: 'Hi {{name}},\n\nYour place on {{course}} is confirmed. We look forward to seeing you.\n\nKind regards,\nThe training team' },
    { id: 'm2', name: 'Session reminder', subject: 'Reminder: your course starts soon', body: 'Hi {{name}},\n\nA reminder that {{course}} starts on {{date}}. Please arrive 15 minutes early.\n\nKind regards,\nThe training team' },
    { id: 'm3', name: 'Joining instructions', subject: 'Joining instructions for your course', body: 'Hi {{name}},\n\nHere is everything you need for {{course}}: venue, parking, what to bring and the day plan.\n\nKind regards,\nThe training team' },
    { id: 'm4', name: 'Certificate issued', subject: 'Congratulations – your certificate is ready', body: 'Hi {{name}},\n\nWell done on completing {{course}}. Your certificate is available in your account.\n\nKind regards,\nThe training team' },
  ]
  const sent = [
    { id: 'n1', at: new Date(Date.now() - 2 * 864e5).toISOString(), templateId: 'm1', to: 'ayesha.patel@capefreight.example', subject: 'Your booking is confirmed' },
    { id: 'n2', at: new Date(Date.now() - 1 * 864e5).toISOString(), templateId: 'm2', to: 'thabo.molefe@cape.example', subject: 'Reminder: your course starts soon' },
    { id: 'n3', at: new Date(Date.now() - 5 * 864e5).toISOString(), templateId: 'm4', to: 'zanele.ndlovu@mail.example', subject: 'Congratulations – your certificate is ready' },
  ]
  const mentors = [
    { id: 'mn1', name: 'Dr Nokuthula Sibiya', focus: 'Leadership and career transitions', bio: 'Former operations executive; coaches first-time managers.' },
    { id: 'mn2', name: 'Andre Joubert', focus: 'Project and delivery management', bio: 'Twenty years delivering infrastructure programmes.' },
    { id: 'mn3', name: 'Mariam Hassan', focus: 'Finance and commercial skills', bio: 'Chartered accountant and finance mentor.' },
    { id: 'mn4', name: 'Sizwe Mabuza', focus: 'Communication and presenting', bio: 'Facilitator and public-speaking coach.' },
  ]
  const mentorSessions = [{ id: 'ms1', learnerId: zan, mentorId: 'mn4', date: d(-14), status: 'Completed' as const, notes: 'Worked on structuring a five-minute talk.' }]
  const academies = [
    { id: 'ac1', title: 'Emerging Leader Academy', start: d(21), courseIds: [C('LDR-310'), C('SFT-130'), C('SFT-120'), C('SFT-150')], blurb: 'A 10-week cohort for first-time managers.', interested: [] },
    { id: 'ac2', title: 'Project Delivery Academy', start: d(35), courseIds: [C('PM-401'), C('PM-420'), C('FIN-230')], blurb: 'From fundamentals to agile delivery, with a capstone.', interested: [] },
    { id: 'ac3', title: 'Digital Trust Academy', start: d(49), courseIds: [C('CYB-110'), C('POP-120'), C('SFT-101')], blurb: 'Cyber, privacy and communication for everyday professionals.', interested: [] },
  ]
  const journeys = [
    { id: 'j1', goal: 'Become a team leader', courseIds: [C('SFT-101'), C('SFT-130'), C('LDR-310'), C('LDR-301')] },
    { id: 'j2', goal: 'Become a project professional', courseIds: [C('SFT-140'), C('PM-401'), C('FIN-230'), C('PM-420')] },
    { id: 'j3', goal: 'Safe and compliant workplace', courseIds: [C('HSE-101'), C('HSE-220'), C('POP-120'), C('CYB-110')] },
  ]
  const activity = [
    { id: 'ac-1', at: new Date(Date.now() - 3600e3).toISOString(), text: 'Quote Q-2026-011 sent to Cape Freight' },
    { id: 'ac-2', at: new Date(Date.now() - 5 * 3600e3).toISOString(), text: 'Zanele Ndlovu booked Project Management Fundamentals' },
    { id: 'ac-3', at: new Date(Date.now() - 26 * 3600e3).toISOString(), text: 'Invoice INV-0042 failed to sync to Workbook' },
    { id: 'ac-4', at: new Date(Date.now() - 30 * 3600e3).toISOString(), text: 'Karoo Mining Services opportunity moved to Won' },
    { id: 'ac-5', at: new Date(Date.now() - 50 * 3600e3).toISOString(), text: 'Chloe Naidoo (Bluegum Talent) requested an introduction' },
  ]

  return {
    orgs, staff, contacts, learners, recruiters, courses, sessions, enrolments, certificates, receipts,
    opportunities, tnas, quotes, invoices, talent, intros, audit, templates, sent, mentors, mentorSessions, academies, journeys, activity,
  }
}

export const _iso = iso
