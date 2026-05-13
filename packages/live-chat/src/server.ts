import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

// Express 앱 생성
const app = express();
app.use(cors());
app.use(express.json());

// HTTP 서버 생성
const httpServer = createServer(app);

// Socket.io 서버를 HTTP 서버에 연결
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
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

// 세션별 메시지 저장 (실제 운영에서는 Redis로 대체)
const sessionMessages: Map<string, ChatMessage[]> = new Map();

// 운전자 친화적 메시지 큐레이션 함수
function shouldCurate(message: ChatMessage): boolean {
  // 1. 슈퍼챗은 무조건 큐레이션 통과
  if (message.type === 'super_chat') return true;

  // 2. 질문 형태(물음표 포함)는 통과
  if (message.content.includes('?') || message.content.includes('？')) return true;

  // 3. 너무 짧은 메시지는 제외 (3자 미만)
  if (message.content.trim().length < 3) return false;

  // 4. 그 외에는 일정 확률로 통과 (실제로는 좋아요 수, 가중치 등 사용 예정)
  return Math.random() > 0.5;
}

// 헬스 체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({ status: 'ok', module: 'live-chat' });
});

// 채팅 히스토리 조회
app.get('/api/chat/:sessionId/history', (req, res) => {
  const { sessionId } = req.params;
  const messages = sessionMessages.get(sessionId) || [];
  res.json({ sessionId, messages });
});

// Socket.io 이벤트 처리
io.on('connection', (socket: Socket) => {
  console.log(`[연결] 클라이언트 연결됨: ${socket.id}`);

  // 세션 입장
  socket.on('chat:join', (data: { sessionId: string; userId: string; nickname: string }) => {
    socket.join(data.sessionId);
    console.log(`[입장] ${data.nickname} → ${data.sessionId}`);

    // 입장 알림 브로드캐스트
    socket.to(data.sessionId).emit('chat:user_joined', {
      userId: data.userId,
      nickname: data.nickname
    });
  });

  // 메시지 전송
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
      slideContext: data.slideContext
    };

    // 세션 메시지 저장
    if (!sessionMessages.has(data.sessionId)) {
      sessionMessages.set(data.sessionId, []);
    }
    sessionMessages.get(data.sessionId)!.push(message);

    console.log(`[메시지] ${data.nickname}: ${data.content}`);

    // 모든 멘티에게 전체 메시지 전송
    io.to(data.sessionId).emit('chat:broadcast', message);

    // 멘토에게는 큐레이션된 메시지만 별도 전송
    if (shouldCurate(message)) {
      io.to(data.sessionId).emit('chat:curated', message);
      console.log(`[큐레이션] 통과: ${data.content}`);
    }
  });

  // 연결 종료
  socket.on('disconnect', () => {
    console.log(`[연결 종료] 클라이언트: ${socket.id}`);
  });
});

// 서버 시작
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`라이브 채팅 서버가 포트 ${PORT}에서 실행 중`);
  console.log(`헬스 체크: http://localhost:${PORT}/health`);
});