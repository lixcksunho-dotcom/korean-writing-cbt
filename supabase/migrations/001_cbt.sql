-- =============================================
-- Phase 2: CBT 문제풀기 테이블
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 문제 테이블
CREATE TABLE IF NOT EXISTS public.questions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  year int NOT NULL,
  round int NOT NULL,
  number int NOT NULL,
  type text NOT NULL CHECK (type IN ('multiple', 'short')),
  question text NOT NULL,
  options jsonb,
  correct_answer text NOT NULL,
  explanation text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(year, round, number)
);

-- 시험 세션 테이블
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year int NOT NULL,
  round int NOT NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  score int,
  total int
);

-- 답변 테이블
CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES quiz_sessions(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  user_answer text,
  is_correct boolean
);

-- RLS 활성화
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

-- questions: 인증된 사용자 누구나 읽기 가능
CREATE POLICY "questions_select" ON public.questions
  FOR SELECT USING (true);

-- quiz_sessions: 본인 세션만 접근
CREATE POLICY "sessions_select" ON public.quiz_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert" ON public.quiz_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update" ON public.quiz_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- quiz_answers: 본인 세션의 답변만 접근
CREATE POLICY "answers_select" ON public.quiz_answers
  FOR SELECT USING (
    session_id IN (SELECT id FROM quiz_sessions WHERE user_id = auth.uid())
  );
CREATE POLICY "answers_insert" ON public.quiz_answers
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM quiz_sessions WHERE user_id = auth.uid())
  );

-- =============================================
-- 샘플 문제 데이터 (2024년 1회, 10문제)
-- =============================================
INSERT INTO public.questions (year, round, number, type, question, options, correct_answer, explanation) VALUES

(2024, 1, 1, 'multiple',
'다음 중 맞춤법이 올바른 것은?',
'["왠일인지 모르겠다", "익숙치 않다", "오랫동안 기다렸다", "어떻해야 할까요", "어의없는 행동이다"]'::jsonb,
'3',
'"오랫동안"은 올바른 표기입니다. ①웬일인지, ②익숙지 않다, ④어떡해야, ⑤어이없는이 맞습니다.'),

(2024, 1, 2, 'multiple',
'다음 중 외래어 표기법에 맞는 것은?',
'["케잌(cake)", "써비스(service)", "리더쉽(leadership)", "프라이팬(frying pan)", "후라이드치킨(fried chicken)"]'::jsonb,
'4',
'"프라이팬"은 외래어 표기법에 맞는 표기입니다. ①케이크, ②서비스, ③리더십, ⑤프라이드치킨이 올바른 표기입니다.'),

(2024, 1, 3, 'multiple',
'다음 중 "안"과 "않"의 사용이 올바른 것은?',
'["그는 아직 밥을 않 먹었다", "이 길은 올바르지 않다", "나는 오늘 학교에 않 간다", "그것은 사실이 않다", "않 먹어도 배가 부르다"]'::jsonb,
'2',
'"않다"는 "아니하다"의 준말로 용언 뒤에 옵니다. ②"올바르지 않다"는 "올바르지 아니하다"의 올바른 준말입니다. 나머지는 모두 "안"을 써야 합니다.'),

(2024, 1, 4, 'multiple',
'다음 중 띄어쓰기가 올바른 것은?',
'["먹을만하다", "갈수있다", "이것은 내것이다", "오늘따라 유난히 춥다", "세살버릇 여든까지"]'::jsonb,
'4',
'"오늘따라"는 합성어로 붙여 쓰고 "유난히"와 띄어 씁니다. ①먹을 만하다(의존명사 띄어씀), ②갈 수 있다, ③내 것이다, ⑤세 살 버릇(수관형사+단위명사 띄어씀)이 맞습니다.'),

(2024, 1, 5, 'multiple',
'공문서 작성에 관한 설명으로 옳은 것은?',
'["공문서에는 반드시 경어를 풍부하게 사용해야 한다", "날짜는 한글로만 표기하는 것이 원칙이다", "공문서는 간결하고 명확하게 작성하는 것이 원칙이다", "문장은 길수록 신뢰감을 주어 바람직하다", "첨부 서류는 본문 시작 전에 기술한다"]'::jsonb,
'3',
'공문서는 읽는 사람이 쉽게 이해할 수 있도록 간결하고 명확하게 작성하는 것이 원칙입니다. 불필요한 수식어나 복잡한 표현을 피하고 핵심 내용을 직접 전달해야 합니다.'),

(2024, 1, 6, 'multiple',
'다음 중 논리적 글쓰기의 원칙으로 가장 적절한 것은?',
'["다양한 관점만 나열하고 자신의 주장은 숨긴다", "독자의 감정에 주로 호소하여 동의를 이끌어낸다", "주장을 먼저 제시하고 충분한 근거로 뒷받침한다", "반론은 글의 신뢰도를 낮추므로 다루지 않는다", "출처를 밝히지 않아도 주장의 설득력은 충분하다"]'::jsonb,
'3',
'논리적 글쓰기는 명확한 주장을 제시하고 신뢰할 수 있는 근거로 뒷받침하는 것이 핵심입니다. 예상되는 반론을 검토하고 대응하는 것도 중요한 요소입니다.'),

(2024, 1, 7, 'multiple',
'다음 설명에 해당하는 글의 구성 방식은?\n\n"핵심 주제나 결론을 글의 첫 부분에 제시한 뒤, 근거와 세부 내용을 이어서 설명하는 방식"',
'["미괄식", "두괄식", "양괄식", "점층식", "열거식"]'::jsonb,
'2',
'"두괄식"은 결론이나 주제를 글의 앞부분(두부)에 배치하는 구성 방식입니다. "미괄식"은 결론을 끝에, "양괄식"은 처음과 끝 모두에 제시합니다.'),

(2024, 1, 8, 'multiple',
'다음 중 보고서 작성 시 유의사항으로 옳지 않은 것은?',
'["사실과 의견을 명확히 구분하여 서술한다", "객관적인 자료와 수치를 근거로 활용한다", "복잡한 데이터는 표나 그래프로 정리한다", "개인적인 감상과 주관적 표현을 풍부하게 사용한다", "육하원칙에 따라 내용을 체계적으로 정리한다"]'::jsonb,
'4',
'보고서는 객관성과 사실을 기반으로 작성해야 합니다. 개인적인 감상이나 주관적 표현보다 객관적 사실과 데이터를 중심으로 작성하는 것이 원칙입니다.'),

(2024, 1, 9, 'multiple',
'다음 중 "바라다"의 활용이 올바른 것은?',
'["제 바램대로 이루어졌습니다", "그렇게 되기를 바래요", "평화를 간절히 바랍니다", "그가 성공하기를 바랬다", "내 바램이 이루어졌다"]'::jsonb,
'3',
'"바라다"의 올바른 활용은 "바랍니다, 바라요, 바라서"입니다. "바래요, 바랬다"는 잘못된 활용이며, 명사형은 "바람"이 올바른 표기입니다.'),

(2024, 1, 10, 'multiple',
'다음 중 어법상 가장 올바른 문장은?',
'["그는 목이 메어 말을 잇지 못했다", "그녀는 일을 하던중에 부상을 당했다", "나는 그 책을 읽었음으로 내용을 안다", "회의에서 토의를 가졌습니다", "우리는 이 문제를 적극 대처해야 한다"]'::jsonb,
'1',
'"목이 메다"는 감격이나 슬픔으로 목이 막히는 것을 뜻하며 "메어"로 올바르게 활용합니다. ②하던 중에(띄어씀), ③읽었으므로, ④토의를 했습니다/토의하였습니다, ⑤대처해야→대응해야/대처해야(대처하다+에)가 자연스럽습니다.');
