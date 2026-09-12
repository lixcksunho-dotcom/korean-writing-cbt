import assert from 'node:assert/strict'
import { gradeWrongNoteRetake, latestWrongNoteAnswers } from '../src/lib/wrongNoteRetake.ts'

const question = { program: 'silyong', type: 'multiple', options: ['a', 'b'], correct_answer: '2' }
assert.equal(gradeWrongNoteRetake(question, 'silyong', '2').is_correct, true)
assert.equal(gradeWrongNoteRetake(question, 'silyong', '1').is_correct, false)
assert.equal(gradeWrongNoteRetake(question, 'kbs', '2'), null)
assert.equal(gradeWrongNoteRetake({ ...question, type: 'essay' }, 'silyong', '2'), null)
for (const choice of ['0', '3', '02', '', '2.0']) assert.equal(gradeWrongNoteRetake(question, 'silyong', choice), null)
assert.equal(gradeWrongNoteRetake(null, 'silyong', '2'), null)

const sessions = [
  { id: 'retake-new', completed_at: '2026-09-12T03:00:00.000Z' },
  { id: 'exam', completed_at: '2026-09-12T02:00:00.000Z' },
  { id: 'retake-old', completed_at: '2026-09-12T01:00:00.000Z' },
  { id: 'unfinished', completed_at: null },
]
const answers = [
  { session_id: 'retake-new', question_id: 'a', is_correct: true },
  { session_id: 'exam', question_id: 'a', is_correct: false },
  { session_id: 'exam', question_id: 'b', is_correct: false },
  { session_id: 'retake-old', question_id: 'b', is_correct: true },
  { session_id: 'retake-old', question_id: 'a', is_correct: false },
  { session_id: 'unfinished', question_id: 'a', is_correct: false },
]
const latest = latestWrongNoteAnswers(sessions, answers)
assert.equal(latest.get('a'), true)
assert.equal(latest.get('b'), false)
assert.deepEqual(latestWrongNoteAnswers(sessions, answers.toReversed()), latest)
const tied = sessions.map(s => ({ ...s, completed_at: '2026-09-12T03:00:00.000Z' }))
assert.deepEqual(latestWrongNoteAnswers(tied, answers), latestWrongNoteAnswers(tied, answers.toReversed()))
console.log('PASS: grading, program/type/choice guards, latest retake, independent questions, incomplete sessions, stable ties')
