import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// 메시지 타입 정의
interface ChatMessage {
  messageId: string;
  sessionId: string;
  userId: string;
  nickname: string;
  content: string;
  timestamp: string;
  type: 'normal' | 'super_chat';
  superChatTier?: 'bronze' | 'silver' | 'gold';
  slideContext: number;
}

// ===== 카풀링 표준 응답 형식 헬퍼 =====
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

// 세션별 메시지 저장 (실제 운영에서는 Redis로 대체)
const sessionMessages: Map<string, ChatMessage[]> = new Map();

// 운전자 친화적 메시지 큐레이션 함수
function shouldCurate(message: ChatMessage): boolean {
  if (message.type === 'super_chat') return true;
  if (message.content.includes('?') || message.content.includes('？')) return true;
  if (message.content.trim().length < 3) return false;
  return Math.random() > 0.5;
}

// 헬스 체크
app.get('/health', (req: any, res: any) => {
  res.json(successResponse({ status: 'ok', module: 'live-chat' }));
});

// 채팅 히스토리 조회: GET /api/chat/v1/sessions/:sessionId/history
app.get('/api/chat/v1/sessions/:sessionId/history', (req: any, res: any) => {
  const sessionId = req.params.sessionId;
  const messages = sessionMessages.get(sessionId) || [];
  res.json(successResponse({ sessionId, messages }));
});

// Socket.io 이벤트 처리 (WebSocket은 별도 응답 스펙 대상 아님)
io.on('connection', (socket: Socket) => {
  console.log(`[연결] 클라이언트 연결됨: ${socket.id}`);

  socket.on('chat:join', (data: { sessionId: string; userId: string; nickname: string }) => {
    socket.join(data.sessionId);
    console.log(`[입장] ${data.nickname} → ${data.sessionId}`);
    socket.to(data.sessionId).emit('chat:user_joined', {
      userId: data.userId,
      nickname: data.nickname,
    });
  });

  socket.on('chat:message', (data: {
    sessionId: string;
    userId: string;
    nickname: string;
    content: string;
    type: 'normal' | 'super_chat';
    superChatTier?: 'bronze' | 'silver' | 'gold';
    slideContext: number;
  }) => {
    const message: ChatMessage = {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sessionId: data.sessionId,
      userId: data.userId,
      nickname: data.nickname,
      content: data.content,
      timestamp: new Date().toISOString(),
      type: data.type,
      superChatTier: data.superChatTier,
      slideContext: data.slideContext,
    };

    if (!sessionMessages.has(data.sessionId)) {
      sessionMessages.set(data.sessionId, []);
    }
    sessionMessages.get(data.sessionId)!.push(message);

    console.log(`[메시지] ${data.nickname}: ${data.content}`);

    io.to(data.sessionId).emit('chat:broadcast', message);

    if (shouldCurate(message)) {
      io.to(data.sessionId).emit('chat:curated', message);
      console.log(`[큐레이션] 통과: ${data.content}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[연결 종료] 클라이언트: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`라이브 채팅 서버가 포트 ${PORT}에서 실행 중`);
  console.log(`헬스 체크: http://localhost:${PORT}/health`);
});