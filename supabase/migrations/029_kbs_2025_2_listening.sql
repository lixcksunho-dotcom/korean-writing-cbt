-- =============================================
-- KBS 듣기·말하기 오리지널 연습세트 (program='kbs', year=2025, round=2)
-- 대본은 화면에 표시하지 않고(passage NULL) audio_url 음성으로만 제공 → 실제 듣기처럼.
-- 음성: edge-tts ko-KR-SunHiNeural(무료). scripts/gen_listening_audio.py 로 생성·업로드.
-- ⚠️ 선행: 026(program 컬럼), 028(audio_url 컬럼). Supabase SQL Editor에서 실행.
-- =============================================

DELETE FROM public.questions WHERE program = 'kbs' AND year = 2025 AND round = 2;

INSERT INTO public.questions
  (program, year, round, number, type, question, options, correct_answer, explanation, points, audio_url) VALUES

('kbs', 2025, 2, 1, 'multiple',
'[듣기] 강연을 잘 듣고, 강연자가 말하고자 하는 바로 가장 알맞은 것을 고르십시오.',
'["직업 이름은 예전 방식대로 불러야 한다.", "말의 변화에는 그 사회의 생각이 담겨 있다.", "성별을 드러내는 표현이 더 정확하다.", "말은 시대와 상관없이 늘 같아야 한다.", "새로운 표현은 혼란만 일으킨다."]'::jsonb,
'2',
'강연자는 직업 명칭의 변화를 예로 들어, 말을 다듬는 일이 곧 생각을 다듬는 일이며 말에는 사회의 생각이 반영된다고 말한다.', 10,
'https://itzhfbsbwuoedncnjhzt.supabase.co/storage/v1/object/public/question-assets/listening/kbs-2025-2-1.mp3'),

('kbs', 2025, 2, 2, 'multiple',
'[듣기] 이야기를 잘 듣고, 이 이야기가 주는 교훈으로 가장 알맞은 것을 고르십시오.',
'["부지런하면 복이 온다.", "친구는 많을수록 좋다.", "달콤한 칭찬에 넘어가면 손해를 본다.", "노래 실력을 길러야 한다.", "위험할 때는 도망쳐야 한다."]'::jsonb,
'3',
'여우의 아첨에 우쭐해진 까마귀가 입을 벌리다 치즈를 빼앗긴다. 근거 없는 칭찬에 흔들리면 손해를 본다는 교훈이다.', 10,
'https://itzhfbsbwuoedncnjhzt.supabase.co/storage/v1/object/public/question-assets/listening/kbs-2025-2-2.mp3'),

('kbs', 2025, 2, 3, 'multiple',
'[듣기] 시를 잘 듣고, 이 시의 분위기로 가장 알맞은 것을 고르십시오.',
'["시끄럽고 분주하다.", "맑고 고요하다.", "어둡고 무섭다.", "슬프고 절망적이다.", "우스꽝스럽다."]'::jsonb,
'2',
'밤새 내린 눈, 아무도 밟지 않은 마당, 조용히 내려앉는 햇살, 하얀 고요 등의 심상이 맑고 고요한 분위기를 자아낸다.', 10,
'https://itzhfbsbwuoedncnjhzt.supabase.co/storage/v1/object/public/question-assets/listening/kbs-2025-2-3.mp3'),

('kbs', 2025, 2, 4, 'multiple',
'[듣기] 안내 방송을 잘 듣고, 방송 내용과 일치하는 것을 고르십시오.',
'["도서관 전체가 문을 닫는다.", "삼 층 열람실을 오후에 이용할 수 없다.", "점검은 오전에 끝난다.", "일 층 열람실도 점검 중이다.", "자료 열람은 아예 불가능하다."]'::jsonb,
'2',
'오후 두 시부터 다섯 시까지 삼 층 열람실만 점검으로 이용할 수 없고, 일 층 일반 열람실은 이용할 수 있다고 안내한다.', 10,
'https://itzhfbsbwuoedncnjhzt.supabase.co/storage/v1/object/public/question-assets/listening/kbs-2025-2-4.mp3'),

('kbs', 2025, 2, 5, 'multiple',
'[듣기] 대화를 잘 듣고, 두 사람의 대화에 대한 설명으로 알맞은 것을 고르십시오.',
'["남자는 처음부터 부분 환불을 요구했다.", "여자는 남자의 요구를 그대로 받아들였다.", "남자는 여자의 제안을 조정해 다시 제안했다.", "여자는 배송 지연을 인정하지 않았다.", "두 사람은 합의하지 못하고 끝냈다."]'::jsonb,
'3',
'남자는 처음엔 전액 환불을 요구했으나, 여자의 절충안(배송비+할인권)을 듣고 ''할인권 대신 결제 금액 일부 환불''로 조정해 다시 제안했다.', 10,
'https://itzhfbsbwuoedncnjhzt.supabase.co/storage/v1/object/public/question-assets/listening/kbs-2025-2-5.mp3'),

('kbs', 2025, 2, 6, 'multiple',
'[듣기] 대화를 잘 듣고, 남자의 의도로 가장 알맞은 것을 고르십시오.',
'["등산을 취소하려 한다.", "비가 와도 토요일에 가려 한다.", "일요일에 일찍 출발하자고 제안한다.", "여자와 따로 가려 한다.", "등산 대신 다른 곳에 가려 한다."]'::jsonb,
'3',
'남자는 토요일 비 예보를 근거로 일요일로 미루는 데 동의하며, 사람이 많아지기 전에 아침 일찍 출발하자고 제안한다.', 10,
'https://itzhfbsbwuoedncnjhzt.supabase.co/storage/v1/object/public/question-assets/listening/kbs-2025-2-6.mp3');
