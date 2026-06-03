# 모듈 간 API 명세서

본 문서는 라이브 채팅, 질문 큐 매니저, 음성 명령 인식 모듈 간 주고받는 데이터 규격을 정의한다. 카풀링 측이 제시한 표준 API 스펙을 따른다.

## 표준 API 규약

### URL 구조

/api/<feature>/<version>/<path>

예시: 질문 등록 → `POST /api/questions/v1/items`

### 사용 메소드

GET, POST, PUT, PATCH, DELETE

### 표준 응답 형식

모든 응답은 다음 형식으로 감싼다.

```json
{
  "requestId": "88097a77-c204-4c4e-a286-15dc9d30b6c1",
  "responseInfo": {
    "status": 200,
    "returnCode": "0",
    "message": "Request Success"
  },
  "data": {}
}
```

- **requestId**: 요청 구분 ID, UUID 사용
- **responseInfo.status**: HTTP 상태 코드
- **responseInfo.returnCode**: 성공 시 "0", 문제 발생 시 13자리 에러 추적 코드
- **responseInfo.message**: 시스템 메시지
- **data**: 실제 응답 데이터

## 공통 데이터 타입

### ChatMessage

```typescript
interface ChatMessage {
  messageId: string;
  sessionId: string;
  userId: string;
  nickname: string;
  content: string;
  timestamp: string;       // ISO 8601
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
  nickname: string;
  content: string;
  tier: 'free' | 'bronze' | 'silver' | 'gold';
  amount: number;
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
  rawText: string;
  intent: 'next_slide' | 'prev_slide' | 'pause' | 'resume'
        | 'next_question' | 'accept_1on1' | 'end_session';
  confidence: number;
  timestamp: string;
}
```

## 라이브 채팅 모듈 API

### REST API

| 메소드 | URL | 설명 |
|--------|-----|------|
| GET | `/api/chat/v1/sessions/:sessionId/history` | 채팅 히스토리 조회 |

### WebSocket 이벤트 (Socket.io)

WebSocket 이벤트는 요청-응답 구조가 아니므로 표준 응답 형식 적용 대상에서 제외된다.

| 이벤트 | 방향 | 페이로드 |
|--------|------|----------|
| `chat:join` | Client → Server | `{ sessionId, userId, nickname }` |
| `chat:message` | Client → Server | `{ content, type, slideContext, ... }` |
| `chat:broadcast` | Server → Client | `ChatMessage` |
| `chat:curated` | Server → Mentor | `ChatMessage` (큐레이션 통과만) |

## 질문 큐 매니저 API

| 메소드 | URL | 설명 |
|--------|-----|------|
| POST | `/api/questions/v1/items` | 질문 등록 |
| GET | `/api/questions/v1/sessions/:sessionId` | 세션 질문 목록 조회 (`?grouped=true` 그룹핑) |
| GET | `/api/questions/v1/sessions/:sessionId/next` | 다음 우선순위 질문 조회 |
| PATCH | `/api/questions/v1/items/:questionId/status` | 질문 상태 변경 |

### 질문 등록 요청 예시

POST /api/questions/v1/items
Content-Type: application/json
{
"sessionId": "demo-session-001",
"userId": "mentee-abc123",
"nickname": "테스터",
"content": "이 슬라이드 핵심 개념이 뭔가요?",
"tier": "gold",
"amount": 50000,
"slideContext": 3
}

### 응답 예시

```json
{
  "requestId": "88097a77-c204-4c4e-a286-15dc9d30b6c1",
  "responseInfo": {
    "status": 200,
    "returnCode": "0",
    "message": "Question Created"
  },
  "data": {
    "questionId": "...",
    "sessionId": "demo-session-001",
    "content": "이 슬라이드 핵심 개념이 뭔가요?",
    "tier": "gold",
    "slideContext": 3,
    "status": "pending"
  }
}
```

## 음성 명령 인식 모듈 API

### WebSocket 이벤트

| 이벤트 | 방향 | 페이로드 |
|--------|------|----------|
| `voice:command` | Client → Server | `VoiceCommand` |
| `voice:confirm_request` | Server → Client | `{ intent, prompt }` |
| `voice:confirm_response` | Client → Server | `{ confirmed: boolean }` |

### 호출어

모든 명령은 호출어 `오케이 드라이브`로 시작해야 한다.

- `오케이 드라이브, 다음` → next_slide
- `오케이 드라이브, 다음 질문` → next_question
- `오케이 드라이브, 일대일 수락` → accept_1on1
- `오케이 드라이브, 세션 종료` → end_session