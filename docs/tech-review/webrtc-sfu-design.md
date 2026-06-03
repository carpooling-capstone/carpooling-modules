# WebRTC SFU 서버 설계 문서

본 문서는 카풀링 인터랙티브 멘토링 시스템의 실시간 미디어 전송을 담당하는 WebRTC SFU 서버의 아키텍처와 인터페이스를 정의한다. 학부 캡스톤 범위에서는 구현 외이며, 카풀링 내부 개발팀의 통합 작업 시 참고 자료로 작성되었다.

## 기술 선택 배경

### SFU vs MCU vs P2P 비교

| 방식 | 장점 | 단점 | 카풀링 적합성 |
|------|------|------|----------------|
| P2P (Mesh) | 서버 부하 없음, 저지연 | 참여자 수 증가 시 클라이언트 부담 큼 | 1:N 멘토링에 부적합 |
| MCU | 클라이언트 부담 최소 | 서버에서 재인코딩, 지연 증가 | 저지연 요구에 부적합 |
| SFU | 클라이언트별 선택 전송, 저지연 | 클라이언트 디코딩 부담 일부 존재 | **최적합** |

멘토 1명이 다수 멘티에게 송출하는 1:N 구조에서, P2P는 멘토의 업로드 부담이 참여자 수에 비례해 폭증하고, MCU는 서버 재인코딩으로 지연이 커진다. SFU는 멘토의 스트림을 서버가 받아 각 멘티에게 선택적으로 전달(forwarding)하므로, 저지연을 유지하면서 다수 참여자를 수용할 수 있다.

### Janus vs Mediasoup 비교

| 항목 | Janus | Mediasoup |
|------|-------|-----------|
| 언어 | C | C++ (Node.js 바인딩) |
| 아키텍처 | 모듈형 게이트웨이 | 라이브러리 형태 |
| 외부 프로토콜 통합 | SIP, RTSP 등 강력 | 제한적 |
| 미세 제어 | 플러그인 기반 | 코드 레벨 |
| 카풀링 적합성 | 레거시 통신망 연동 시 유리 | **저지연 멘토링에 최적** |

본 프로젝트는 다자간 저지연 미디어 전송이 핵심이므로 Mediasoup을 권장한다. Mediasoup은 C++ 코어로 처리 성능이 높고, Node.js 환경에서 코드 레벨의 세밀한 제어가 가능해 카풀링의 다른 백엔드 모듈(Node.js 기반)과 통합하기에 유리하다.

## 시스템 아키텍처

```
┌────────────────┐                  ┌────────────────┐
│ 멘토 클라이언트 │◀────WebRTC──────▶│                │
└────────────────┘                  │                │
                                    │   Mediasoup    │
┌────────────────┐                  │   SFU 서버     │
│ 멘티 클라이언트 1│◀────WebRTC──────▶│                │
└────────────────┘                  │  (Node.js)     │
                                    │                │
┌────────────────┐                  │                │
│ 멘티 클라이언트 N│◀────WebRTC──────▶│                │
└────────────────┘                  └────────┬───────┘
                                             │
                                    ┌────────▼───────┐
                                    │ 시그널링 서버   │
                                    │ (Socket.io)    │
                                    └────────────────┘
```

## 핵심 컴포넌트

### Worker
- Mediasoup의 미디어 처리 단위(별도 프로세스)
- CPU 코어당 1개의 Worker를 두는 것을 권장
- 다수의 Router를 관리

### Router
- 하나의 멘토링 세션이 하나의 Router에 대응
- 세션 내 모든 Producer와 Consumer를 관리

### Transport
- 클라이언트와 서버 사이의 미디어 전송 통로
- 송신용(send)과 수신용(recv) Transport를 분리해 생성

### Producer
- 미디어 송신 측 (멘토의 카메라·마이크 스트림)

### Consumer
- 미디어 수신 측 (각 멘티의 수신 스트림)
- 한 Producer에 대해 멘티 수만큼 Consumer가 생성됨

## 연결 수립 흐름

```
1. 멘토가 세션 생성 → Router 생성
2. 멘티가 입장 → 같은 Router에 연결
3. 클라이언트가 RTP Capabilities 조회
4. send/recv Transport 생성 및 DTLS 연결
5. 멘토가 Producer 생성 (스트림 송출 시작)
6. 각 멘티가 해당 Producer에 대한 Consumer 생성 (수신 시작)
```

## 인터페이스 정의

### 시그널링 이벤트 (Socket.io 기반)

| 이벤트 | 방향 | 페이로드 |
|--------|------|----------|
| `webrtc:create_room` | Client → Server | `{ sessionId }` |
| `webrtc:join_room` | Client → Server | `{ sessionId, userId, role }` |
| `webrtc:rtp_capabilities` | Server → Client | Router RTP 능력 정보 |
| `webrtc:create_transport` | Client → Server | `{ direction: 'send' \| 'recv' }` |
| `webrtc:connect_transport` | Client → Server | `{ transportId, dtlsParameters }` |
| `webrtc:produce` | Client → Server | `{ transportId, kind, rtpParameters }` |
| `webrtc:consume` | Client → Server | `{ producerId, rtpCapabilities }` |
| `webrtc:close_room` | Server → All | `{ sessionId, reason }` |

## 성능 요구사항

- **종단간 지연(End-to-End Latency)**: 200ms 이하
- **동시 멘토링 세션 수**: 단일 Worker 기준 50개 이상
- **세션당 동시 멘티 수**: 100명 이상
- **장애 복구 시간**: 연결 끊김 후 5초 이내 자동 재연결

## 카풀링 서비스 통합 시 고려사항

1. **드라이브 모드 연동**: 멘토 클라이언트가 드라이브 모드로 진입하면 영상 Producer 송출을 자동 중지하고 음성 Producer만 유지한다. 라이브 채팅 모듈의 드라이브 모드 상태와 동기화가 필요하다.
2. **오디오 라우터 연동**: Consumer 생성 시 선택적 오디오 라우터의 권한 검증을 거쳐, 골드챗 1:1 채널을 분리한다.
3. **DRM 모듈 연동**: Producer가 송출하는 스트림에 EME 기반 암호화 키를 적용한다.
4. **녹화 기능**: Mediasoup의 PlainTransport를 통해 FFmpeg로 스트림을 받아 VOD 콘텐츠를 생성할 수 있다.
5. **수평 확장**: 세션 수가 단일 서버 용량을 초과하면, 여러 Worker·서버로 분산하고 Redis로 세션 상태를 공유한다.

## 향후 학습 자원

- Mediasoup 공식 문서: https://mediasoup.org/documentation/v3/
- mediasoup-demo 저장소 (참고 구현)
- WebRTC 기초: https://webrtc.org
