# Carpooling 캡스톤 - 인터랙티브 멘토링 모듈

카풀링 산학협력 캡스톤 디자인 프로젝트의 모듈 저장소입니다.

## 프로젝트 개요

카풀링 플랫폼의 실시간 스트리밍 기반 인터랙티브 멘토링 시스템 고도화를 위한 독립 모듈을 개발합니다. 각 모듈은 독립적으로 동작하며, 추후 카풀링 내부 개발팀의 서비스 통합에 사용됩니다.

## 모듈 구성

### 완전 구현 대상

- **라이브 채팅 모듈** (`packages/live-chat`): Socket.io + Redis Pub/Sub 기반의 실시간 채팅. 운전자 친화적 메시지 큐레이션 적용.
- **질문 큐 매니저** (`packages/question-queue`): Node.js + Redis 기반의 슈퍼챗 우선순위 큐. 슬라이드 컨텍스트 연동 구조.
- **음성 명령 인식 모듈** (`packages/voice-command`): Web Speech API 기반 음성 명령. 호출어 및 음성 확인 루프 적용.

### 설계 문서 대체 모듈

- WebRTC SFU 서버
- 선택적 오디오 라우터
- DRM/캡처 방지 모듈

## 폴더 구조

carpooling-modules/
├── packages/          # 모듈별 소스 코드
│   ├── live-chat/
│   ├── question-queue/
│   ├── voice-command/
│   └── shared/        # 공통 타입 정의
├── docs/              # 프로젝트 문서
│   ├── diagrams/      # 의존성 다이어그램
│   ├── scenarios/     # 사용 시나리오
│   ├── api/           # API 명세서
│   └── tech-review/   # 기술 검토 문서
└── README.md

## 팀 구성

- 이승률 (조장 / PM): 일정 관리, 인터페이스 설계, 협업 환경 구축
- 박재우 (프론트엔드): React/Next.js 데모, 채팅 클라이언트, 음성 인식 UI
- 윤민식 (백엔드): Node.js 서버, Socket.io, Redis, 질문 큐 매니저

## 기술 스택

- Backend: Node.js, TypeScript, Socket.io, Redis
- Frontend: React, Next.js, TypeScript
- Voice: Web Speech API, OpenAI Whisper (예정)
- Real-time: WebRTC, mediasoup (예정)

## 진행 기간

2026년 1학기 캡스톤 디자인 (15주)
