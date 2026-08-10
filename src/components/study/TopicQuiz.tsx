// 서버 컴포넌트. 주제에 맞는 문항만 골라 클라이언트로 넘긴다.
// 호출부(공개 페이지 14곳)는 그대로 <TopicQuiz topic="spelling" /> 로 쓴다.
import TopicQuizBoard from './TopicQuizBoard'
import { quizItemsFor } from './topicQuizBank'

export default function TopicQuiz({ topic, ctaHref }: { topic: string; ctaHref?: string }) {
  const items = quizItemsFor(topic)
  // 문항이 없는 주제는 아예 아무것도 내보내지 않는다(예전엔 빈 컴포넌트를 하이드레이트했다).
  if (items.length === 0) return null
  return <TopicQuizBoard topic={topic} items={items} ctaHref={ctaHref} />
}
