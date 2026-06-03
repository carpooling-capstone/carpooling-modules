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

// ===== 카풀링 표준 응답 형식 헬퍼 =====
// 모든 API 응답을 회사 표준 스펙에 맞춰 감싼다.
function successResponse(data: any, message = 'Request Success') {
  return {
    requestId: uuidv4(),
    responseInfo: {
      status: 200,
      returnCode: '0',
      message,
    },
    data,
  };
}

function errorResponse(status: number, returnCode: string, message: string) {
  return {
    requestId: uuidv4(),
    responseInfo: {
      status,
      returnCode, // 13자리 에러 추적 코드
      message,
    },
    data: {},
  };
}

// 인메모리 저장 (실제 운영에서는 Redis Sorted Set으로 대체)
const questionStore: Map<string, Question[]> = new Map();

// 등급별 우선순위 점수
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
  res.json(successResponse({ status: 'ok', module: 'question-queue' }));
});

// 질문 등록: POST /api/questions/v1/items
app.post('/api/questions/v1/items', (req: any, res: any) => {
  const { sessionId, userId, nickname, content, tier, slideContext, amount } = req.body;

  if (!sessionId || !content) {
    return res
      .status(400)
      .json(errorResponse(400, '4000000000001', 'sessionId와 content는 필수입니다'));
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
    status: 'pending',
  };

  if (!questionStore.has(sessionId)) {
    questionStore.set(sessionId, []);
  }
  questionStore.get(sessionId)!.push(question);

  console.log(`[질문 등록] [${question.tier}] ${question.nickname}: ${question.content} (슬라이드 ${question.slideContext})`);

  return res.status(201).json(successResponse(question, 'Question Created'));
});

// 세션 질문 목록 조회: GET /api/questions/v1/sessions/:sessionId
app.get('/api/questions/v1/sessions/:sessionId', (req: any, res: any) => {
  const sessionId = req.params.sessionId;
  const grouped = req.query.grouped === 'true';

  const questions = questionStore.get(sessionId) || [];

  if (grouped) {
    const groupedQuestions: Record<number, Question[]> = {};
    for (const q of questions) {
      if (!groupedQuestions[q.slideContext]) {
        groupedQuestions[q.slideContext] = [];
      }
      groupedQuestions[q.slideContext].push(q);
    }
    return res.json(successResponse({ sessionId, grouped: groupedQuestions }));
  }

  return res.json(successResponse({ sessionId, questions }));
});

// 다음 우선순위 질문: GET /api/questions/v1/sessions/:sessionId/next
app.get('/api/questions/v1/sessions/:sessionId/next', (req: any, res: any) => {
  const sessionId = req.params.sessionId;
  const questions = questionStore.get(sessionId) || [];

  const pending = questions
    .filter(q => q.status === 'pending')
    .sort((a, b) => {
      const priorityDiff = getTierPriority(b.tier) - getTierPriority(a.tier);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  if (pending.length === 0) {
    return res
      .status(404)
      .json(errorResponse(404, '4040000000001', '대기 중인 질문이 없습니다'));
  }

  const nextQuestion = pending[0];
  nextQuestion.status = 'reading';

  console.log(`[다음 질문] [${nextQuestion.tier}] ${nextQuestion.content}`);

  return res.json(successResponse(nextQuestion));
});

// 질문 상태 변경: PATCH /api/questions/v1/items/:questionId/status
app.patch('/api/questions/v1/items/:questionId/status', (req: any, res: any) => {
  const questionId = req.params.questionId;
  const { status } = req.body;

  if (!['pending', 'reading', 'answered', 'expired'].includes(status)) {
    return res
      .status(400)
      .json(errorResponse(400, '4000000000002', '잘못된 status 값입니다'));
  }

  for (const questions of questionStore.values()) {
    const target = questions.find(q => q.questionId === questionId);
    if (target) {
      target.status = status;
      console.log(`[상태 변경] ${questionId} → ${status}`);
      return res.json(successResponse(target, 'Status Updated'));
    }
  }

  return res
    .status(404)
    .json(errorResponse(404, '4040000000002', '질문을 찾을 수 없습니다'));
});

// 서버 시작
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`질문 큐 매니저가 포트 ${PORT}에서 실행 중`);
  console.log(`헬스 체크: http://localhost:${PORT}/health`);
});