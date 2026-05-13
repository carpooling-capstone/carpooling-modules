import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

// 질문 타입 정의
interface Question {
  questionId: string;
  sessionId: string;
  userId: string;
  nickname: string;
  content: string;
  tier: 'free' | 'bronze' | 'silver' | 'gold';
  amount: number;
  slideContext: number;
  createdAt: string;
  status: 'pending' | 'reading' | 'answered' | 'expired';
}

// 인메모리 저장 (실제 운영에서는 Redis Sorted Set으로 대체)
// 추후 Redis 연동 시 다음 키 구조 사용:
//   - questions:{sessionId} (Sorted Set, score = priority)
//   - question:{questionId} (Hash, 상세 데이터)
const questionStore: Map<string, Question[]> = new Map();

// 등급별 우선순위 점수 (높을수록 먼저 처리)
function getTierPriority(tier: Question['tier']): number {
  switch (tier) {
    case 'gold': return 1000;
    case 'silver': return 500;
    case 'bronze': return 100;
    case 'free': return 1;
    default: return 0;
  }
}

// 헬스 체크
app.get('/health', (req: any, res: any) => {
  res.json({ status: 'ok', module: 'question-queue' });
});

// 질문 등록
app.post('/api/questions', (req: any, res: any) => {
  const { sessionId, userId, nickname, content, tier, slideContext, amount } = req.body;

  if (!sessionId || !content) {
    return res.status(400).json({ error: 'sessionId와 content는 필수입니다' });
  }

  const question: Question = {
    questionId: uuidv4(),
    sessionId,
    userId: userId || 'anonymous',
    nickname: nickname || '익명',
    content,
    tier: tier || 'free',
    amount: amount || 0,
    slideContext: slideContext || 0,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };

  if (!questionStore.has(sessionId)) {
    questionStore.set(sessionId, []);
  }
  questionStore.get(sessionId)!.push(question);

  console.log(`[질문 등록] [${question.tier}] ${question.nickname}: ${question.content} (슬라이드 ${question.slideContext})`);

  return res.status(201).json(question);
});

// 세션 질문 목록 조회 (그룹핑 옵션)
app.get('/api/questions/:sessionId', (req: any, res: any) => {
  const sessionId = req.params.sessionId;
  const grouped = req.query.grouped === 'true';

  const questions = questionStore.get(sessionId) || [];

  if (grouped) {
    // 슬라이드 컨텍스트별로 그룹핑
    const groupedQuestions: Record<number, Question[]> = {};
    for (const q of questions) {
      if (!groupedQuestions[q.slideContext]) {
        groupedQuestions[q.slideContext] = [];
      }
      groupedQuestions[q.slideContext].push(q);
    }
    return res.json({ sessionId, grouped: groupedQuestions });
  }

  return res.json({ sessionId, questions });
});

// 다음 우선순위 질문 가져오기 (음성 명령 "다음 질문" 호출 시 사용)
app.get('/api/questions/:sessionId/next', (req: any, res: any) => {
  const sessionId = req.params.sessionId;
  const questions = questionStore.get(sessionId) || [];

  // pending 상태의 질문 중 우선순위 + 시간순 정렬
  const pending = questions
    .filter(q => q.status === 'pending')
    .sort((a, b) => {
      const priorityDiff = getTierPriority(b.tier) - getTierPriority(a.tier);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  if (pending.length === 0) {
    return res.status(404).json({ error: '대기 중인 질문이 없습니다' });
  }

  // 가장 우선순위 높은 질문을 reading 상태로 변경
  const nextQuestion = pending[0];
  nextQuestion.status = 'reading';

  console.log(`[다음 질문] [${nextQuestion.tier}] ${nextQuestion.content}`);

  return res.json(nextQuestion);
});

// 질문 상태 변경
app.patch('/api/questions/:questionId/status', (req: any, res: any) => {
  const questionId = req.params.questionId;
  const { status } = req.body;

  if (!['pending', 'reading', 'answered', 'expired'].includes(status)) {
    return res.status(400).json({ error: '잘못된 status 값입니다' });
  }

  // 모든 세션 순회하면서 질문 찾기 (실제는 Redis에서 O(1)로 조회 가능)
  for (const questions of questionStore.values()) {
    const target = questions.find(q => q.questionId === questionId);
    if (target) {
      target.status = status;
      console.log(`[상태 변경] ${questionId} → ${status}`);
      return res.json(target);
    }
  }

  return res.status(404).json({ error: '질문을 찾을 수 없습니다' });
});

// 서버 시작
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`질문 큐 매니저가 포트 ${PORT}에서 실행 중`);
  console.log(`헬스 체크: http://localhost:${PORT}/health`);
});