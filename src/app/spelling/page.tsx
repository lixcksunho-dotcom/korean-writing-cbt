import type { Metadata } from "next";
import Link from "next/link";
import LogoGlyph from "@/components/layout/LogoGlyph";
import SiteFooter from "@/components/layout/SiteFooter";
import BreadcrumbLd from "@/components/seo/BreadcrumbLd";
import StickyMobileCTA from "@/components/landing/StickyMobileCTA";
import RelatedBlogPosts from '@/components/blog/RelatedBlogPosts'
import TopicQuiz from '@/components/study/TopicQuiz'

export const metadata: Metadata = {
  title: "자주 틀리는 맞춤법·띄어쓰기 모음 — 헷갈리는 표기 총정리",
  description:
    "되/돼, 안/않, 왠/웬, 며칠, 오랜만에, 금세… 자주 틀리는 맞춤법과 띄어쓰기를 틀림→바름으로 한눈에 정리했어요. 한국실용글쓰기·자소서·보고서 글쓰기에 바로 쓰는 맞춤법 총정리.",
  keywords: [
    "맞춤법", "띄어쓰기", "자주 틀리는 맞춤법", "헷갈리는 맞춤법", "맞춤법 정리",
    "되 돼 구분", "안 않 구분", "왠 웬", "며칠 몇일", "맞춤법 검사",
  ],
  alternates: { canonical: "/spelling" },
  openGraph: {
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
    title: "자주 틀리는 맞춤법·띄어쓰기 모음",
    description: "되/돼, 안/않, 왠/웬, 며칠… 헷갈리는 표기를 틀림→바름으로 정리.",
    url: "/spelling",
    type: "website",
  },
};

// 표준어·한글맞춤법 기준으로 '확실한' 항목만 엄선(모호한 규칙 제외).
type Rule = { topic: string; correct: string; tip: string };
const RULES: Rule[] = [
  { topic: "되 / 돼", correct: "'돼'는 '되어'의 준말", tip: "'되어'로 바꿔 말이 되면 '돼'. 예: 안 돼(O)/안 되(X), 됐다(=되었다)." },
  { topic: "안 / 않", correct: "'안'은 부사, '않'은 '아니하'의 준말", tip: "'안 먹어'(O), '먹지 않아'(O). '먹지 안아'(X)." },
  { topic: "-로서 / -로써", correct: "자격은 '로서', 수단은 '로써'", tip: "학생으로서(자격), 대화로써(수단·도구)." },
  { topic: "왠 / 웬", correct: "'왠지'만 '왠', 나머지는 '웬'", tip: "왠지(=왜인지)(O), 웬일·웬만하면·웬 떡(O). 왠일(X)." },
  { topic: "-던 / -든", correct: "과거 회상은 '던', 선택은 '든'", tip: "가던 길(회상), 가든 말든(선택)." },
  { topic: "-예요 / -이에요", correct: "받침 없으면 '예요', 있으면 '이에요'", tip: "뭐예요(O), 책이에요(O), 거예요(O)." },
  { topic: "-ㄹ게 / -ㄹ께", correct: "소리는 [께]라도 '게'로 적음", tip: "할게(O)/할께(X), 갈게(O)/갈께(X)." },
  { topic: "하려고 / 할려고", correct: "'하려고'가 표준", tip: "먹으려고(O)/먹을려고(X), 가려고(O)/갈려고(X)." },
  { topic: "봬요 / 뵈요", correct: "'봬요'(=뵈어요)가 맞음", tip: "내일 봬요(O), 봤다→'뵀다'. '뵈요'(X)." },
  { topic: "맞히다 / 맞추다", correct: "정답은 '맞히다', 서로 대는 건 '맞추다'", tip: "정답을 맞히다(O), 답을 맞춰 보다(서로 대조)(O)." },
  { topic: "부치다 / 붙이다", correct: "보내는 건 '부치다', 붙게 하는 건 '붙이다'", tip: "편지를 부치다·힘에 부치다(O), 우표를 붙이다(O)." },
  { topic: "늘리다 / 늘이다", correct: "수·양은 '늘리다', 길이는 '늘이다'", tip: "인원을 늘리다(O), 고무줄을 늘이다(O)." },
  { topic: "반드시 / 반듯이", correct: "'꼭'은 '반드시', '반듯하게'는 '반듯이'", tip: "반드시 이긴다(꼭)(O), 반듯이 앉다(자세)(O)." },
  { topic: "-이따가 / 있다가", correct: "시간은 '이따가', 존재는 '있다가'", tip: "이따가 만나(조금 뒤)(O), 집에 있다가 나왔다(O)." },
  { topic: "다르다 / 틀리다", correct: "'같지 않다'는 '다르다', '옳지 않다'는 '틀리다'", tip: "생각이 다르다(O), 답이 틀리다(O). '나와 틀리다'(X)→다르다." },
  { topic: "-데 / -대", correct: "내 경험은 '-데', 남의 말 전달은 '-대'", tip: "어제 가 보니 좋데(내가 겪음), 그 집 좋대(남이 그렇다더라)." },
  { topic: "결재 / 결제", correct: "승인은 '결재', 대금 지불은 '결제'", tip: "서류를 결재하다(승인), 카드로 결제하다(지불)." },
  { topic: "지그시 / 지긋이", correct: "살며시 힘주는 건 '지그시', 나이가 많은 건 '지긋이'", tip: "눈을 지그시 감다(O), 나이가 지긋이 든 분(O)." },
  { topic: "갈음 / 가름 / 가늠", correct: "대신함=갈음, 나눔=가름, 짐작=가늠", tip: "인사말로 갈음하다, 편을 가름하다, 깊이를 가늠하다." },
  { topic: "매다 / 메다", correct: "끈을 묶는 건 '매다', 어깨에 지는 건 '메다'", tip: "신발끈을 매다(O), 가방을 메다(O). 목이 메다(O)." },
  { topic: "썩이다 / 썩히다", correct: "마음은 '썩이다', 물건·재능은 '썩히다'", tip: "속을 썩이다(마음), 음식을 썩히다·재능을 썩히다(O)." },
  { topic: "채 / 체 / 째", correct: "그대로=채, 척=체, 통째로=째", tip: "산 채로(그대로), 아는 체(척), 껍질째·통째(그대로 전부)." },
  { topic: "-러 / -려", correct: "목적은 '-러', 의도는 '-려'", tip: "밥 먹으러 가다(목적), 밥 먹으려 한다(의도). '먹을려고'(X)→먹으려고." },
  { topic: "-음 / -슴", correct: "명사형 어미는 '-음'", tip: "있음·없음·많음(O). '있슴·없슴'(X). '-습니다'와 헷갈리지 않기." },
  { topic: "-로 / -으로", correct: "받침 없거나 'ㄹ'받침이면 '-로', 그 외 받침은 '-으로'", tip: "차로·칼로(O), 손으로·붓으로(O)." },
  { topic: "어떡해 / 어떻게", correct: "'어떡해'=어떻게 해(서술어), '어떻게'=방법을 묻는 부사", tip: "이제 어떡해(O), 어떻게 할까(O). '어떻해'(X)." },
  { topic: "알맞은 / 알맞는", correct: "'알맞다·걸맞다'는 형용사라 '-은'을 쓴다", tip: "알맞은 답(O), 걸맞은 상대(O). '알맞는'(X)." },
  { topic: "바라 / 바래", correct: "'바라다'의 활용은 '바라', 색이 변하는 건 '바래다'", tip: "합격하길 바라(O)/바래(X), 색이 바래다(O). 명사는 '바람'(X 바램)." },
  { topic: "웬만하다 / 왠만하다", correct: "'웬만하다'가 표준", tip: "웬만하면 참아(O). '왠만하면'(X). '왠'은 '왠지'에만." },
];

type Fix = { wrong: string; right: string };
const FIXES: Fix[] = [
  { wrong: "몇일", right: "며칠" },
  { wrong: "오랫만에", right: "오랜만에" },
  { wrong: "어의없다", right: "어이없다" },
  { wrong: "금새", right: "금세" },
  { wrong: "왠만하면", right: "웬만하면" },
  { wrong: "설레임 / 설레이다", right: "설렘 / 설레다" },
  { wrong: "바램(소망)", right: "바람" },
  { wrong: "역활", right: "역할" },
  { wrong: "궂이 / 구지", right: "굳이" },
  { wrong: "희안하다", right: "희한하다" },
  { wrong: "안절부절하다", right: "안절부절못하다" },
  { wrong: "쉽상", right: "십상" },
  { wrong: "서슴치 않다", right: "서슴지 않다" },
  { wrong: "갯수", right: "개수" },
  { wrong: "내노라하다", right: "내로라하다" },
  { wrong: "곱배기", right: "곱빼기" },
  { wrong: "뒤쳐지다(뒤떨어지다 뜻)", right: "뒤처지다" },
  { wrong: "담궜다 / 잠궜다", right: "담갔다 / 잠갔다" },
  { wrong: "치뤘다", right: "치렀다" },
  { wrong: "설겆이", right: "설거지" },
  { wrong: "김치찌게", right: "김치찌개" },
  { wrong: "육계장", right: "육개장" },
  { wrong: "돌맹이", right: "돌멩이" },
  { wrong: "요세", right: "요새" },
  { wrong: "문안하다(무난 뜻)", right: "무난하다" },
  { wrong: "어떻해", right: "어떡해" },
  { wrong: "병이 낳다", right: "병이 낫다" },
  { wrong: "들어나다(겉으로)", right: "드러나다" },
  { wrong: "일일히", right: "일일이" },
  { wrong: "깨끗히", right: "깨끗이" },
  { wrong: "곰곰히", right: "곰곰이" },
  { wrong: "삼가하다", right: "삼가다" },
  { wrong: "널판지", right: "널빤지" },
  { wrong: "챙피하다", right: "창피하다" },
  { wrong: "폭팔", right: "폭발" },
  { wrong: "발자욱", right: "발자국" },
  { wrong: "뭉개구름", right: "뭉게구름" },
  { wrong: "널부러지다", right: "널브러지다" },
  { wrong: "오뚜기", right: "오뚝이" },
  { wrong: "웬지", right: "왠지" },
  { wrong: "됬다", right: "됐다" },
  { wrong: "통채로", right: "통째로" },
  { wrong: "눈꼽", right: "눈곱" },
  { wrong: "넉두리", right: "넋두리" },
  { wrong: "움추리다", right: "움츠리다" },
  { wrong: "부시시", right: "부스스" },
  { wrong: "구렛나루", right: "구레나룻" },
  { wrong: "핼쓱하다", right: "핼쑥하다" },
  { wrong: "조취(를 취하다)", right: "조치" },
  { wrong: "왠일", right: "웬일" },
  { wrong: "방방곳곳", right: "방방곡곡" },
  { wrong: "홧병", right: "화병" },
  { wrong: "눈쌀", right: "눈살" },
  { wrong: "통털어", right: "통틀어" },
  { wrong: "뇌졸증", right: "뇌졸중" },
  { wrong: "갈치졸임", right: "갈치조림" },
  { wrong: "째째하다", right: "쩨쩨하다" },
  { wrong: "재털이", right: "재떨이" },
  { wrong: "낱낱히", right: "낱낱이" },
  { wrong: "오랜동안", right: "오랫동안" },
  { wrong: "절대절명", right: "절체절명" },
  { wrong: "홀홀단신", right: "혈혈단신" },
  { wrong: "풍지박산", right: "풍비박산" },
  { wrong: "야밤도주", right: "야반도주" },
  { wrong: "성대묘사", right: "성대모사" },
  { wrong: "일사분란", right: "일사불란" },
  { wrong: "동거동락", right: "동고동락" },
  { wrong: "승락", right: "승낙" },
  { wrong: "촛점", right: "초점" },
  { wrong: "넉넉치 않다", right: "넉넉지 않다" },
  { wrong: "생각컨대", right: "생각건대" },
  { wrong: "익숙치", right: "익숙지" },
  { wrong: "요컨데", right: "요컨대" },
  { wrong: "우뢰", right: "우레" },
  { wrong: "껍질채", right: "껍질째" },
  { wrong: "틈틈히", right: "틈틈이" },
  { wrong: "번번히", right: "번번이" },
  { wrong: "숫가락", right: "숟가락" },
  { wrong: "젖갈", right: "젓갈" },
  { wrong: "무릎쓰다", right: "무릅쓰다" },
  { wrong: "하마트면", right: "하마터면" },
  { wrong: "어짜피", right: "어차피" },
  { wrong: "왠종일", right: "온종일" },
  { wrong: "되뇌이다", right: "되뇌다" },
  { wrong: "굼뱅이", right: "굼벵이" },
  { wrong: "우겨넣다", right: "욱여넣다" },
  { wrong: "개구장이", right: "개구쟁이" },
  { wrong: "멋장이", right: "멋쟁이" },
  { wrong: "뒤치닥거리", right: "뒤치다꺼리" },
  { wrong: "어리버리", right: "어리바리" },
  { wrong: "흐리멍텅하다", right: "흐리멍덩하다" },
  { wrong: "넓직하다", right: "널찍하다" },
  { wrong: "실증(나다)", right: "싫증" },
  { wrong: "도데체", right: "도대체" },
  { wrong: "아니예요", right: "아니에요" },
  { wrong: "등살(성가심)", right: "등쌀" },
  { wrong: "만듬", right: "만듦" },
  { wrong: "베게", right: "베개" },
  { wrong: "얼만큼", right: "얼마큼" },
  { wrong: "서슴치 않다", right: "서슴지 않다" },
  { wrong: "되물림", right: "대물림" },
  { wrong: "궁시렁거리다", right: "구시렁거리다" },
];

type Pair = { a: string; b: string; how: string };
const PAIRS: Pair[] = [
  { a: "낫다", b: "낳다 / 났다", how: "낫다=병이 회복·더 좋다, 낳다=출산, 났다=생겨나다." },
  { a: "가르치다", b: "가리키다", how: "가르치다=교육하다, 가리키다=방향·대상을 지시하다." },
  { a: "다르다", b: "틀리다", how: "다르다=같지 않다(different), 틀리다=맞지 않다(wrong)." },
  { a: "잊어버리다", b: "잃어버리다", how: "잊다=기억에서 사라짐, 잃다=물건 등을 분실함." },
  { a: "맞히다", b: "맞추다", how: "맞히다=정답을 맞게 하다, 맞추다=서로 비교·조립·대다." },
  { a: "붙이다", b: "부치다", how: "붙이다=달라붙게 하다, 부치다=편지를 보내다·힘이 부치다." },
  { a: "반드시", b: "반듯이", how: "반드시=꼭(必), 반듯이=곧고 바르게." },
  { a: "-장이", b: "-쟁이", how: "기술자는 '-장이'(미장이), 성질·특징은 '-쟁이'(겁쟁이)." },
  { a: "두껍다", b: "두텁다", how: "두껍다=두께가 크다(물리적), 두텁다=정·믿음이 깊다(관계). 두꺼운 책, 두터운 우정." },
  { a: "앉히다", b: "안치다", how: "앉히다=앉게 하다(자리에 앉히다), 안치다=끓일 것을 솥에 넣다(밥을 안치다)." },
  { a: "조리다", b: "졸이다", how: "조리다=양념이 배게 바짝(생선을 조리다), 졸이다=국물을 줄이거나 마음을 졸이다." },
  { a: "벌리다", b: "벌이다", how: "벌리다=사이를 넓히다(간격을 벌리다), 벌이다=일·잔치를 시작·펼치다(사업을 벌이다)." },
  { a: "띠다", b: "띄다", how: "띠다=빛깔·성질·감정을 가지다(미소를 띠다), 띄다='뜨이다'의 준말(눈에 띄다)." },
  { a: "받치다", b: "받히다", how: "받치다=밑을 괴다·우산을 받치다, 받히다='받다'의 피동(소에게 받히다)." },
  { a: "저리다", b: "절이다", how: "저리다=피가 안 통해 감각이 무디다, 절이다=소금·양념에 담가 절게 하다." },
  { a: "걷잡다", b: "겉잡다", how: "걷잡다=마구 나아가는 것을 붙들다(걷잡을 수 없다), 겉잡다=겉으로 대강 어림잡다." },
  { a: "삭이다", b: "삭히다", how: "삭이다=분·감정을 가라앉히다(화를 삭이다), 삭히다=발효시키다(김치를 삭히다)." },
  { a: "홑몸", b: "홀몸", how: "홑몸=딸린 사람이 없거나 임신하지 않은 몸, 홀몸=배우자·형제가 없는 사람." },
  { a: "다리다", b: "달이다", how: "다리다=다리미로 옷의 주름을 펴다, 달이다=액체를 끓여 우려내다(약·간장)." },
  { a: "다치다", b: "닫히다", how: "다치다=몸에 상처가 나다, 닫히다='닫다'의 피동(문이 닫히다)." },
  { a: "짓다", b: "짖다", how: "짓다=만들다·이름을 붙이다(집을 짓다), 짖다=개 등이 소리를 내다." },
  { a: "시키다", b: "식히다", how: "시키다=하게 하다(일을 시키다), 식히다=뜨거운 것을 차게 하다(국을 식히다)." },
  { a: "바치다", b: "받치다", how: "바치다=정성·물건을 드리다(정성을 바치다), 받치다=밑을 괴거나 우산을 펴 들다." },
];

type Space = { ex: string; note: string };
const SPACES: Space[] = [
  { ex: "할 수 있다 (O)", note: "'수'는 의존명사라 띄어 써요. '할수있다'(X)." },
  { ex: "그러면 안 돼요 (O)", note: "부정의 '안'은 띄어 써요. '안돼요'(X)." },
  { ex: "한 번 / 한번", note: "횟수는 '한 번'(한 번 더), 시도·기회는 '한번'(한번 해 봐)." },
  { ex: "너밖에 없다 (O)", note: "'밖에'는 조사라 붙여 써요. '너 밖에'(X)." },
  { ex: "이 외에 / 그 외에", note: "'외'는 명사라 앞말과 띄어요." },
  { ex: "좀 더 (O)", note: "'좀'과 '더'는 각각 부사라 띄어 써요." },
  { ex: "너뿐이야 / 웃을 뿐", note: "명사 뒤 '뿐'은 조사라 붙이고(너뿐), 어미 뒤 '뿐'은 의존명사라 띄워요(웃을 뿐)." },
  { ex: "너만큼 / 먹을 만큼", note: "명사 뒤 '만큼'은 조사라 붙이고, 어미 뒤 '만큼'은 의존명사라 띄워요." },
  { ex: "법대로 / 아는 대로", note: "명사 뒤 '대로'는 조사라 붙이고, 어미 뒤 '대로'는 의존명사라 띄워요." },
  { ex: "집에 간 지 3년 (O)", note: "시간이 지남을 뜻하는 '지'는 의존명사라 띄워요. '먹는지 궁금하다'의 '-는지'(어미)는 붙여요." },
  { ex: "갈 데가 없다 (O)", note: "곳·경우를 뜻하는 '데'는 의존명사라 띄워요. '먹는데 방해된다'의 '-는데'(어미)는 붙여요." },
  { ex: "사과 서너 개 (O)", note: "수 뒤의 단위 명사(개·명·살 등)는 앞말과 띄워요. '열 살', '세 명'." },
  { ex: "이번 주 / 다음 주", note: "'주·달·해'는 명사라 띄워요. 다만 '지난주·지난달·지난해'는 한 단어라 붙여 써요." },
  { ex: "며칠 동안 (O)", note: "'동안'은 명사라 앞말과 띄워요. '한 달 동안', '방학 동안'." },
  { ex: "그럴 만하다 (O)", note: "'만하다'의 '만'은 의존명사라 띄워요. '먹을 만하다', '가 볼 만하다'." },
  { ex: "못지않다 (O)", note: "'못지않다'는 한 단어라 붙여 써요. '못지 않다'(X)." },
  { ex: "안 되다 / 안되다", note: "부정은 '안 되다'(공부가 안 된다), 잘못되거나 딱하면 '안되다'(사업이 안된다·형편이 안됐다)." },
  { ex: "잘하다 / 잘 하다", note: "익숙하게 하면 '잘하다'(붙임), 잘 처리하란 뜻이면 '잘 하다'(띄움)." },
  { ex: "이때·그때 (O)", note: "'이때·그때·접때'는 한 단어라 붙여 써요." },
];

const FAQ = [
  { q: "'되'와 '돼'는 어떻게 구분하나요?", a: "'돼'는 '되어'의 준말이에요. 자리에 '되어'를 넣어 말이 되면 '돼', 안 되면 '되'입니다. 예: '안 돼'(='안 되어'), '됐다'(='되었다'), 문장 끝은 대부분 '돼'." },
  { q: "'왠지'와 '웬지' 중 뭐가 맞나요?", a: "'왠지'가 맞아요('왜인지'의 준말). 그 외에는 모두 '웬'을 씁니다. 웬일, 웬만하면, 웬 떡이야." },
  { q: "맞춤법이 시험에도 나오나요?", a: "네. 한국실용글쓰기의 객관식(선택형)에 어휘·어법·맞춤법이 자주 나오고, 서술형에서도 표기 정확성이 채점에 반영돼요. 실글패스에서 유형별로 맞춤법 문제를 골라 연습하고, 서술형은 AI 첨삭으로 표기 오류까지 짚어볼 수 있어요." },
  { q: "'-이에요'와 '-예요'는 어떻게 구분하나요?", a: "앞말에 받침이 있으면 '-이에요'(책이에요, 학생이에요), 받침이 없으면 '-예요'(거예요, 뭐예요)를 씁니다. '아니에요'는 '아니-'에 '-에요'가 붙은 예외예요." },
  { q: "띄어쓰기가 너무 헷갈려요. 원칙이 있나요?", a: "핵심은 두 가지예요. ① 조사는 앞말에 붙여 씁니다(너밖에, 학교에서, 너마저). ② 의존명사는 띄어 씁니다(할 수 있다, 아는 것, 먹을 만큼). 단위 명사도 띄우되(사과 한 개), 순서·숫자와 함께 쓸 땐 붙일 수 있어요(제1장, 2개)." },
  { q: "부사를 만들 때 '-이'와 '-히'는 어떻게 구분하나요?", a: "끝소리가 분명히 '이'로만 나면 '-이'(깨끗이, 틈틈이, 일일이), '히'로 나거나 '이·히' 둘 다 나면 대체로 '-히'(꼼꼼히, 조용히, 급히)를 씁니다. 헷갈릴 땐 '-하다'가 붙는 말인지 보면 도움이 돼요(‘조용하다→조용히’)." },
  { q: "금액이나 숫자를 한글로 쓸 때 띄어쓰기는요?", a: "수를 한글로 적을 때는 '만·억·조' 단위로 띄어 씁니다. 예: '12억 3456만'. 아라비아 숫자와 단위가 섞이면 붙여 쓸 수 있어요(‘1억 2천만 원’)." },
];

export default function SpellingPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-[#e2e8f0] bg-white">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoGlyph className="h-7 w-7" />
            <span className="font-black text-[#1e3a5f]">실글패스</span>
          </Link>
          <Link href="/cbt" className="text-sm font-semibold text-[#64748b] hover:text-[#1e3a5f] transition-colors">
            무료 CBT 모의고사 →
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
          <h1 className="text-3xl sm:text-4xl font-black text-[#0f172a] tracking-tight mb-2">
            자주 틀리는 맞춤법·띄어쓰기
          </h1>
          <p className="text-[#64748b] mb-7 leading-relaxed">
            되/돼, 안/않, 왠/웬, 며칠, 오랜만에… <strong className="text-[#334155]">헷갈리는 표기를 틀림→바름</strong>으로 정리했어요.
            자소서·보고서·한국실용글쓰기 서술형까지, 맞춤법 하나로 글의 인상이 달라집니다.
          </p>

          {/* 헷갈리는 규칙 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">헷갈리는 맞춤법 규칙</h2>
            <div className="space-y-2.5">
              {RULES.map((r) => (
                <div key={r.topic} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-black text-[#1e3a5f]">{r.topic}</span>
                    <span className="text-sm font-semibold text-[#334155]">{r.correct}</span>
                  </div>
                  <p className="mt-1 text-sm text-[#64748b] leading-relaxed">{r.tip}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 읽고 끝나지 않게 — 읽은 자리에서 바로 풀어보고 실전으로 잇는다 */}
          <TopicQuiz topic="spelling" />

          {/* 틀림 → 바름 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">자주 틀리는 표기 (틀림 → 바름)</h2>
            <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] text-[#475569]">
                    <th className="px-3 py-2.5 text-left font-bold">틀린 표기</th>
                    <th className="px-3 py-2.5 text-left font-bold">바른 표기</th>
                  </tr>
                </thead>
                <tbody>
                  {FIXES.map((f) => (
                    <tr key={f.wrong} className="border-t border-[#e2e8f0]">
                      <td className="px-3 py-2.5 text-[#64748b] line-through">{f.wrong}</td>
                      <td className="px-3 py-2.5 font-bold text-[#1e3a5f]">{f.right}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 뜻이 다른 헷갈리는 단어 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">뜻이 다른 헷갈리는 단어</h2>
            <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
              <table className="w-full text-sm">
                <tbody>
                  {PAIRS.map((p) => (
                    <tr key={p.a} className="border-t border-[#e2e8f0] first:border-t-0">
                      <td className="px-3 py-2.5 font-bold text-[#0f172a] whitespace-nowrap align-top">{p.a} · {p.b}</td>
                      <td className="px-3 py-2.5 text-[#64748b] leading-relaxed">{p.how}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 띄어쓰기 */}
          <section className="mb-10">
            <h2 className="text-2xl font-black text-[#0f172a] mb-3">헷갈리는 띄어쓰기</h2>
            <div className="space-y-2.5">
              {SPACES.map((s) => (
                <div key={s.ex} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                  <p className="font-bold text-[#1e3a5f]">{s.ex}</p>
                  <p className="mt-1 text-sm text-[#64748b] leading-relaxed">{s.note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="mb-10">
            <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-6 text-center text-white">
              <p className="text-lg font-black mb-1">맞춤법, 문제로 풀어야 진짜 는다</p>
              <p className="text-white/70 text-sm mb-5">한국실용글쓰기 CBT에서 맞춤법·어법을 유형별로 연습하고, 서술형은 AI 첨삭으로 표기 오류까지 짚어보세요. 무료로 시작할 수 있어요.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/cbt" className="btn-gold inline-flex items-center justify-center gap-1.5 font-bold py-3 px-6 rounded-xl text-sm">
                  무료 CBT 모의고사 풀어보기
                </Link>
                <Link href="/signup" className="inline-flex items-center justify-center gap-1.5 font-bold py-3 px-6 rounded-xl text-sm bg-white/10 text-white border border-white/20 hover:bg-white/15 transition-colors">
                  무료로 시작하기
                </Link>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="mt-12">
            <h2 className="text-2xl font-black text-[#0f172a] mb-4">자주 묻는 질문</h2>
            <div className="space-y-3">
              {FAQ.map((f) => (
                <details key={f.q} className="group bg-[#f8fafc] rounded-xl border border-[#e2e8f0] px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex items-center justify-between cursor-pointer list-none font-bold text-[#0f172a] text-base">
                    <span>{f.q}</span>
                    <span className="ml-3 text-[#64748b] text-2xl leading-none transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-[#475569] text-sm leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* 관련 — 맞춤법은 KBS한국어능력시험에서도 핵심이라 그 정보 페이지도 함께 안내(검색 유입 교차) */}
          <section className="mt-10 text-sm text-[#64748b]">
            관련:{" "}
            <Link href="/exam-info" className="underline hover:text-[#1e3a5f]">한국실용글쓰기 시험정보</Link>
            {" · "}
            <Link href="/manuscript-guide" className="underline hover:text-[#1e3a5f]">원고지 작성법</Link>
            {" · "}
            <Link href="/kbs-korean" className="underline hover:text-[#1e3a5f]">KBS한국어능력시험 정보</Link>
            {" · "}
            <Link href="/word-counter" className="underline hover:text-[#1e3a5f]">글자수 세기</Link>
          </section>
          <RelatedBlogPosts category="grammar" seed="spelling" />
        </div>
      </main>

      <StickyMobileCTA />
      <BreadcrumbLd name="자주 틀리는 맞춤법" path="/spelling" />
      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </div>
  );
}
