import type { Course } from '../shared/types'

/** Invented, deterministic course content: lessons, quiz and resources are generated from the course record. */
export interface Slide { title: string; body?: string; bullets?: string[]; callout?: string }
export interface Chapter { t: number; title: string }
export interface Lesson {
  id: string; title: string; kind: 'slides' | 'video' | 'quiz'; mins: number; module: string
  slides?: Slide[]; duration?: number; chapters?: Chapter[]; captions?: string[]
}
export interface Question { id: string; q: string; type: 'single' | 'multi' | 'tf'; options: string[]; answer: number[]; why: string }
export interface Resource { name: string; kind: 'PDF' | 'Checklist' | 'Template' | 'Link'; size: string; text: string }

const TIPS: Record<string, string[]> = {
  'Health & Safety': ['Stop and assess the hazard before you start the task.', 'Report every incident and near miss on the same shift.', 'Use the right equipment and check it before each use.'],
  Leadership: ['Set clear expectations and agree how success is measured.', 'Give feedback that is specific, timely and about behaviour.', 'Delegate the outcome, not every step, and check in on a schedule.'],
  'Project Management': ['Write down scope, assumptions and what is out of scope.', 'Track risks weekly and name an owner for each one.', 'Report status in plain language: done, next, blocked.'],
  'Finance Skills': ['Always compare actuals to budget and explain the variance.', 'Separate one-off costs from recurring costs.', 'Know the margin on what you sell before you discount it.'],
  Cybersecurity: ['Pause on urgent requests that ask for money or passwords.', 'Use a password manager and switch on two-step verification.', 'Report suspicious messages instead of deleting them.'],
  Compliance: ['Collect only the personal information you need.', 'Tell people why you are collecting it and how long you keep it.', 'Report a suspected data breach to your information officer at once.'],
  'Soft Skills': ['Listen to understand before you reply.', 'Name the outcome you want, then choose your words.', 'Ask one more question before you decide you are right.'],
}
const tips = (c: Course) => TIPS[c.category] ?? TIPS['Soft Skills']

const BANK: Record<string, Omit<Question, 'id'>[]> = {
  'Health & Safety': [
    { q: 'Who is responsible for health and safety at work?', type: 'single', options: ['Only the safety officer', 'The employer and every employee', 'Only visitors', 'Only the employer'], answer: [1], why: 'Duties are shared: employers provide a safe workplace, employees must follow procedure and report hazards.' },
    { q: 'What should you do with a near miss?', type: 'single', options: ['Report and record it', 'Mention it at the end of the month', 'Ignore it, nobody was hurt', 'Wait to see if it happens again'], answer: [0], why: 'Near misses are early warnings. Reporting them lets the team fix the cause before someone is hurt.' },
    { q: 'You can skip the pre-use equipment check if the task is routine.', type: 'tf', options: ['True', 'False'], answer: [1], why: 'Routine tasks are where complacency causes injuries. Check before each use.' },
  ],
  Leadership: [
    { q: 'Which feedback is most useful?', type: 'single', options: ['"You are always late."', 'Specific, timely and about observed behaviour', 'Saved for the annual review', 'Shared with the whole team'], answer: [1], why: 'Specific and timely feedback about behaviour is easy to act on and feels fair.' },
    { q: 'What does good delegation involve?', type: 'single', options: ['Handing over the task and disappearing', 'Agreeing the outcome, support and check-in points', 'Doing it yourself, faster', 'Delegating only easy work'], answer: [1], why: 'Delegation transfers ownership of an outcome, with support and agreed checkpoints.' },
    { q: 'A leader should avoid giving feedback until it can be written into a formal review.', type: 'tf', options: ['True', 'False'], answer: [1], why: 'Feedback loses value with delay. Give it close to the event.' },
  ],
  'Project Management': [
    { q: 'What is scope creep?', type: 'single', options: ['Work that grows without agreed change control', 'A project that finishes early', 'A type of risk register', 'A budget surplus'], answer: [0], why: 'Unmanaged additions to scope drain time and budget. Use a change request process.' },
    { q: 'The critical path is…', type: 'single', options: ['The most expensive tasks', 'The longest chain of dependent tasks that sets the end date', 'The tasks the sponsor likes', 'Tasks with the most people'], answer: [1], why: 'Any delay on the critical path delays the whole project.' },
    { q: 'A risk register should be reviewed only at project close.', type: 'tf', options: ['True', 'False'], answer: [1], why: 'Risks change weekly. Review them regularly and assign owners.' },
  ],
  'Finance Skills': [
    { q: 'What is a budget variance?', type: 'single', options: ['The difference between actual and budgeted amounts', 'The total budget', 'A type of tax', 'Next year’s forecast'], answer: [0], why: 'Variance analysis shows where results differ from plan, and why.' },
    { q: 'Gross margin is calculated as…', type: 'single', options: ['Revenue minus direct costs, as a share of revenue', 'Profit after tax', 'Cash at bank', 'Revenue minus all overheads'], answer: [0], why: 'Gross margin looks at what is left after direct costs of delivery.' },
    { q: 'A one-off cost should be treated the same as a recurring cost when forecasting.', type: 'tf', options: ['True', 'False'], answer: [1], why: 'Separating one-offs prevents over- or under-stating next year’s run rate.' },
  ],
  Cybersecurity: [
    { q: 'Which is a common sign of a phishing email?', type: 'single', options: ['Urgent request to click a link or pay', 'Sent by a colleague you chat to daily', 'No attachments', 'Correct spelling'], answer: [0], why: 'Pressure and urgency are the attacker’s main tools.' },
    { q: 'What is the safest way to manage many passwords?', type: 'single', options: ['Reuse one strong password', 'Write them on a sticky note', 'Use a password manager', 'Share them with the team'], answer: [2], why: 'A password manager lets you use long unique passwords everywhere.' },
    { q: 'Two-step verification makes stolen passwords far less useful.', type: 'tf', options: ['True', 'False'], answer: [0], why: 'A second factor blocks most account takeovers even when a password leaks.' },
  ],
  Compliance: [
    { q: 'Under POPIA, personal information should be…', type: 'single', options: ['Collected for a specific purpose and kept only as long as needed', 'Kept forever, just in case', 'Shared freely inside the company', 'Stored on personal phones'], answer: [0], why: 'Purpose limitation and retention limits are core conditions of lawful processing.' },
    { q: 'You suspect a data breach. What first?', type: 'single', options: ['Wait and see', 'Tell your information officer immediately', 'Delete the files', 'Post about it online'], answer: [1], why: 'Quick reporting allows the organisation to contain the breach and notify when required.' },
    { q: 'Consent is the only lawful reason to process personal information.', type: 'tf', options: ['True', 'False'], answer: [1], why: 'There are other lawful grounds, such as contract or legal obligation.' },
  ],
  'Soft Skills': [
    { q: 'Active listening includes…', type: 'single', options: ['Planning your reply while they talk', 'Paraphrasing what you heard to check understanding', 'Finishing their sentences', 'Checking your phone'], answer: [1], why: 'Paraphrasing shows you listened and catches misunderstandings early.' },
    { q: 'In a disagreement, the best opening move is to…', type: 'single', options: ['State who is right', 'Agree on the shared goal first', 'Escalate immediately', 'Stay silent'], answer: [1], why: 'A shared goal turns the conversation from winning to solving.' },
    { q: 'Interrupting shows you are engaged.', type: 'tf', options: ['True', 'False'], answer: [1], why: 'Interrupting signals that your point matters more. Let people finish.' },
  ],
}
const DECOYS = ['Underwater welding', 'Typewriter repair', 'Medieval history', 'Mechanical watch repair', 'Stage lighting']

export function buildQuiz(c: Course): Question[] {
  const bank = BANK[c.category] ?? BANK['Soft Skills']
  const k = Number(c.id.replace(/\D/g, '')) || 1
  const skillOpts = [DECOYS[k % 5], c.skills[0], DECOYS[(k + 2) % 5], DECOYS[(k + 3) % 5]]
  const at = k % 4
  const opts = [...skillOpts]; opts.splice(1, 1); opts.splice(at, 0, c.skills[0])
  return [
    { id: 'q1', q: `Which of these is a key skill covered in ${c.title}?`, type: 'single', options: opts, answer: [at], why: `${c.skills[0]} is one of the core skills this course builds.` },
    ...bank.map((b, i) => ({ ...b, id: `q${i + 2}` })),
    { id: 'q5', q: 'Which actions help you apply what you have learnt? Select all that apply.', type: 'multi',
      options: ['Plan one practice task this week', 'Discuss it with your manager', 'Ignore feedback', 'Review your notes after a few days'], answer: [0, 1, 3],
      why: 'Planned practice, conversation and spaced review make learning stick. Ignoring feedback does the opposite.' },
  ]
}

export const PASS_MARK = 70
export const MAX_ATTEMPTS = 3
export const QUIZ_SECONDS = 360

export interface QuizScore { correct: number; total: number; pct: number; passed: boolean; perQuestion: Record<string, boolean> }
export function scoreQuiz(qs: Question[], answers: Record<string, number[]>): QuizScore {
  const perQuestion: Record<string, boolean> = {}
  qs.forEach(q => {
    const a = [...(answers[q.id] ?? [])].sort().join(','); const k = [...q.answer].sort().join(',')
    perQuestion[q.id] = a !== '' && a === k
  })
  const correct = Object.values(perQuestion).filter(Boolean).length
  const pct = qs.length ? Math.round((correct / qs.length) * 100) : 0
  return { correct, total: qs.length, pct, passed: pct >= PASS_MARK, perQuestion }
}

export function buildLessons(c: Course): Lesson[] {
  const t = tips(c); const s0 = c.skills[0]; const s1 = c.skills[1] ?? c.skills[0]
  const dur = 150 + c.hours * 12
  return [
    { id: 'l1', title: 'Welcome and outcomes', kind: 'slides', mins: 6, module: 'Getting started', slides: [
      { title: `Welcome to ${c.title}`, body: c.description, callout: `${c.code} · about ${c.hours} hours` },
      { title: 'What you will be able to do', bullets: [...c.skills.map(s => `Apply ${s.toLowerCase()} in your daily work`), 'Pass the knowledge check with 70% or more'] },
      { title: 'How this course works', bullets: ['Short lessons you can pause and resume', 'Notes and bookmarks are saved for you', 'A timed knowledge check at the end', 'A certificate when you pass'] },
    ] },
    { id: 'l2', title: `Core idea: ${s0}`, kind: 'slides', mins: 10, module: 'Core skills', slides: [
      { title: `What is ${s0.toLowerCase()}?`, body: `In practice, ${s0.toLowerCase()} is about making a repeatable habit out of good judgement. This lesson gives you a simple frame you can use on the job.` },
      { title: 'Why it matters', bullets: [t[0], t[1], 'Small habits compound: do them every time, not only when someone is watching.'] },
      { title: 'Common pitfalls', bullets: ['Rushing the first step', 'Assuming others already know', 'Not writing down what was agreed'], callout: 'Tip: if you are unsure, ask before you act.' },
    ] },
    { id: 'l3', title: `Expert walkthrough`, kind: 'video', mins: Math.round(dur / 60) + 1, module: 'Core skills', duration: dur,
      chapters: [{ t: 0, title: 'Introduction' }, { t: Math.round(dur * 0.25), title: 'A worked example' }, { t: Math.round(dur * 0.55), title: 'What good looks like' }, { t: Math.round(dur * 0.8), title: 'Your turn' }],
      captions: [`In this walkthrough we look at ${s0.toLowerCase()} on a real site.`, 'Start with the outcome you want.', t[0], 'Notice what the expert does first.', t[1], 'Now compare that with a rushed approach.', `Here is how ${s1.toLowerCase()} fits in.`, t[2], 'Pause here and write down one thing you will do differently.'] },
    { id: 'l4', title: `Going further: ${s1}`, kind: 'slides', mins: 10, module: 'Core skills', slides: [
      { title: `${s1} in context`, body: `${s1} works best alongside ${s0.toLowerCase()}. Together they help you make decisions that others can follow and trust.` },
      { title: 'A short scenario', body: 'A colleague brings you a problem late on a Friday. What do you do first, and what do you write down?', callout: 'Pause and think before you scroll on.' },
      { title: 'Good practice', bullets: [t[2], t[0], 'Review the outcome after a week and adjust.'] },
    ] },
    { id: 'l5', title: 'Putting it into practice', kind: 'slides', mins: 8, module: 'Apply and assess', slides: [
      { title: 'Your practice plan', body: `Pick one situation this week where you can use ${s0.toLowerCase()}. Write it down, do it, then review it with someone you trust.` },
      { title: 'Checklist', bullets: ['What is the situation?', 'What will I do differently?', 'Who will I ask for feedback?', 'When will I review?'] },
    ] },
    { id: 'l6', title: 'Knowledge check', kind: 'quiz', mins: 6, module: 'Apply and assess' },
  ]
}

export function buildResources(c: Course): Resource[] {
  return [
    { name: `${c.code} learner workbook.pdf`, kind: 'PDF', size: '1.4 MB', text: `${c.title}\n\nLearner workbook\n\n${c.description}\n\nSkills: ${c.skills.join(', ')}\n` },
    { name: `${c.code} quick-reference checklist.txt`, kind: 'Checklist', size: '48 KB', text: `Quick reference: ${c.title}\n\n${tips(c).map((t, i) => `${i + 1}. ${t}`).join('\n')}\n` },
    { name: `${c.code} action plan template.txt`, kind: 'Template', size: '22 KB', text: `Action plan\n\nSituation:\nWhat I will do differently:\nWho will give me feedback:\nReview date:\n` },
    { name: 'Further reading and links.txt', kind: 'Link', size: '6 KB', text: 'Further reading (demo)\n\nhttps://library.zimele.example/guides\nhttps://library.zimele.example/case-studies\n' },
  ]
}

export const fmtClock = (secs: number) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`
