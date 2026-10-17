export const WRONG_NOTE_RETAKE_YEAR = 9002

type RetakeQuestion = {
  program: string
  type: string
  options: unknown
  correct_answer: string
}

export function gradeWrongNoteRetake(question: RetakeQuestion | null, program: string, choice: string) {
  if (!question || question.program !== program || question.type !== 'multiple'
    || !Array.isArray(question.options) || !/^[1-9]\d*$/.test(choice)
    || Number(choice) > question.options.length) return null
  return { user_answer: choice, is_correct: choice === question.correct_answer }
}

type CompletedSession = { id: string; completed_at: string | null }
type Answer = { session_id: string; question_id: string; is_correct: boolean | null }

export function latestWrongNoteAnswers(sessions: CompletedSession[], answers: Answer[]) {
  const dates = new Map(sessions.filter(s => s.completed_at).map(s => [s.id, Date.parse(s.completed_at!)]))
  const sorted = answers.filter(a => dates.has(a.session_id) && a.is_correct !== null).slice().sort((a, b) =>
    dates.get(a.session_id)! - dates.get(b.session_id)!
    || a.session_id.localeCompare(b.session_id))
  const latest = new Map<string, boolean>()
  for (const answer of sorted) latest.set(answer.question_id, answer.is_correct!)
  return latest
}
