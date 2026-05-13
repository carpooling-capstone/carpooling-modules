# 기술 스택 종합 검토 문서

본 문서는 카풀링 인터랙티브 멘토링 시스템 구축을 위한 기술 스택 전반에 대한 검토 결과를 정리한다.

## 실시간 통신 계층

### WebRTC + Mediasoup (권장)

- **선정 이유:** 저지연 다자간 미디어 전송에 최적
- **대안:** Janus (레거시 통합 강점), LiveKit (서비스형, 유료)
- **참고:** 상세 설계는 `webrtc-sfu-design.md` 참조

## 백엔드 계층

### Node.js + TypeScript

- **선정 이유:** Socket.io와의 자연스러운 통합, 풍부한 생태계
- **대안 검토:**
  - Go: 성능 우수하나 WebRTC 라이브러리 제한적
  - Python (FastAPI): AI/ML 연동 유리하나 Socket.io 성숙도 낮음
- **TypeScript 채택 사유:** 모듈 간 인터페이스 정의 명확화, IDE 지원 우수

### Express vs Fastify vs Koa

| 항목 | Express | Fastify | Koa |
|------|---------|---------|-----|
| 성숙도 | 매우 높음 | 높음 | 중간 |
| 성능 | 보통 | 우수 | 우수 |
| 학습 자료 | 풍부 | 보통 | 적음 |
| 채택 | **본 프로젝트 채택** | 추후 검토 | - |

## 메시징 및 캐시 계층

### Socket.io

- **선정 이유:** 양방향 통신, 자동 재연결, 룸 기능 내장
- **대안:** 순수 WebSocket(ws), uWebSockets.js(고성능)
- **확장성:** Redis Adapter 연동으로 다중 서버 확장 가능

### Redis

- **선정 이유:** Pub/Sub, Sorted Set(우선순위 큐), 빠른 읽기/쓰기
- **본 프로젝트 용도:**
  - 슈퍼챗 우선순위 큐 (Sorted Set)
  - Socket.io 다중 서버 동기화 (Pub/Sub)
  - 세션 상태 캐싱

## AI/음성 계층

### OpenAI Whisper

- **선정 이유:** 다국어 지원, 노이즈 환경 강인성
- **버전 선택:**
  - Whisper-Large: 정확도 최고, 서버 자원 큼
  - Whisper-Tiny + Quantization: 모바일 온디바이스 가능
- **대안 검토:**
  - Google Speech-to-Text: 클라우드 비용 발생
  - Azure Speech: 한국어 정확도 양호하나 비용
  - 클로바 CLOVA Speech: 한국어 특화

본 프로젝트 학부 캡스톤 범위에서는 Web Speech API 우선 적용, 추후 Whisper로 교체 가능한 구조로 설계.

### TTS

- 단기: 브라우저 내장 `speechSynthesis` API 활용
- 중장기: OpenAI TTS API, ElevenLabs, 또는 자체 모델 검토

## 프론트엔드 계층

### React + Next.js

- **선정 이유:** SSR 지원, 라우팅 내장, 산학협력 권장 스택과 일치
- **대안:** Vue (Nuxt), Svelte (SvelteKit)
- **상태 관리:** Zustand 또는 Redux Toolkit 권장

### UI 라이브러리

- 권장: TailwindCSS + shadcn/ui
- 차량 환경 고려: 대형 버튼, 고대비, 다크 모드 우선

## DRM 및 보안 계층

상세는 `drm-design.md` 참조. 학부 캡스톤 범위에서는 동적 워터마크 및 화면 녹화 감지 수준으로 구현.

## 배포 및 인프라 (참고)

본 프로젝트의 직접 범위는 아니나, 카풀링 측 통합 시 다음을 권장한다.

- **컨테이너:** Docker
- **오케스트레이션:** Kubernetes (모듈별 독립 스케일링)
- **CDN:** CloudFront 또는 CloudFlare (스트리밍 영상 전송)
- **모니터링:** Datadog 또는 Grafana + Prometheus

## 결론

본 캡스톤에서 직접 구현한 라이브 채팅, 질문 큐, 음성 명령 인식 세 모듈은 위 기술 스택 중 백엔드 계층과 메시징 계층에 해당한다. 나머지 계층은 카풀링 내부 개발팀의 통합 작업 시 본 문서의 권장 기술을 참고하여 구축할 수 있다.