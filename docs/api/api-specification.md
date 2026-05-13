# 모듈 간 API 명세서

본 문서는 라이브 채팅, 질문 큐 매니저, 음성 명령 인식 모듈 간 주고받는 데이터 규격을 정의한다. OpenAPI 3.0 형식 기반으로 작성되었으며, 회사 내부 개발팀의 통합 시 참고 자료로 활용된다.

## 공통 데이터 타입

### Session

```typescript
interface Session {
  sessionId: string;       // UUID v4
  mentorId: string;        // 멘토 사용자 ID
  title: string;           // 세션 제목
  createdAt: string;       // ISO 8601
  status: 'waiting' | 'live' | 'ended';
  currentSlide: number;    // 현재 표시 중인 슬라이드 번호
}
```

### User

```typescript
interface User {
  userId: string;
  nickname: string;
  role: 'mentor' | 'mentee';
}
```

### ChatMessage

```typescript
interface ChatMessage {
  messageId: string;
  sessionId: string;
  userId: string;
  nickname: string;
  content: string;
  timestamp: string;
  type: 'normal' | 'super_chat';
  superChatTier?: 'bronze' | 'silver' | 'gold';
  slideContext: number;    // 메시지 등록 시점의 슬라이드 번호
}
```

### Question

```typescript
interface Question {
  questionId: string;
  sessionId: string;
  userId: string;
  content: string;
  tier: 'free' | 'bronze' | 'silver' | 'gold';
  amount: number;          // 결제 금액 (원)
  slideContext: number;
  createdAt: string;
  status: 'pending' | 'reading' | 'answered' | 'expired';
}
```

### VoiceCommand

```typescript
interface VoiceCommand {
  commandId: string;
  sessionId: string;
  rawText: string;         // STT 인식 원문
  intent: 'next_slide' | 'prev_slide' | 'pause' | 'resume' 
        | 'next_question' | 'accept_1on1' | 'end_session';
  confidence: number;      // 0.0 ~ 1.0
  timestamp: string;
}
```

## 라이브 채팅 모듈 API

### WebSocket 이벤트

| 이벤트 | 방향 | 페이로드 |
|--------|------|----------|
| `chat:join` | Client → Server | `{ sessionId, userId }` |
| `chat:message` | Client → Server | `{ content, slideContext }` |
| `chat:broadcast` | Server → Client | `ChatMessage` |
| `chat:curated` | Server → Mentor | `ChatMessage` (큐레이션 통과만) |
| `chat:leave` | Client → Server | `{ sessionId, userId }` |

### REST API

- `GET /api/chat/:sessionId/history` - 채팅 히스토리 조회
- `DELETE /api/chat/:sessionId/:messageId` - 메시지 삭제 (멘토 권한)

## 질문 큐 매니저 API

### REST API

- `POST /api/questions` - 질문 등록
  - Body: `{ sessionId, content, tier, slideContext, amount }`
  - Response: `Question`

- `GET /api/questions/:sessionId` - 세션 질문 큐 조회
  - Query: `?grouped=true` (슬라이드별 그룹핑 여부)
  - Response: `Question[]` 또는 `{ [slideNumber]: Question[] }`

- `PATCH /api/questions/:questionId/status` - 질문 상태 변경
  - Body: `{ status }`

- `GET /api/questions/:sessionId/next` - 다음 우선순위 질문 가져오기
  - Response: `Question`

## 음성 명령 인식 모듈 API

### WebSocket 이벤트

| 이벤트 | 방향 | 페이로드 |
|--------|------|----------|
| `voice:command` | Client → Server | `VoiceCommand` |
| `voice:confirm_request` | Server → Client | `{ intent, prompt }` |
| `voice:confirm_response` | Client → Server | `{ confirmed: boolean }` |

### 호출어

모든 명령은 호출어 `카풀링`으로 시작해야 한다.

예시:
- `카풀링, 다음` → `next_slide`
- `카풀링, 이전` → `prev_slide`
- `카풀링, 일시정지` → `pause`
- `카풀링, 다음 질문` → `next_question`
- `카풀링, 1:1 수락` → `accept_1on1`
- `카풀링, 세션 종료` → `end_session`

## 모듈 간 연계 흐름

### 슈퍼챗 응대 흐름 (시나리오 2)

```
[Mentee Client] --POST /api/questions--> [Question Queue]
[Question Queue] --질문 저장--> [Redis]
[Mentor Client] --voice:command (next_question)--> [Voice Server]
[Voice Server] --GET /api/questions/next--> [Question Queue]
[Question Queue] --Question 반환--> [Voice Server]
[Voice Server] --TTS 출력--> [Mentor Speaker]
[Mentor] --음성 응답--> [Mentee Client (broadcast)]
```