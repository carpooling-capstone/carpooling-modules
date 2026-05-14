import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 text-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">카풀링 통합 데모</h1>
          <p className="text-xl text-blue-100">인터랙티브 멘토링 시스템 프로토타입</p>
        </div>

        <div className="grid gap-4">
          <Link
            href="/mentor"
            className="block bg-white/10 hover:bg-white/20 backdrop-blur rounded-2xl p-6 transition"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">🎤</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">멘토 화면</h2>
                <p className="text-blue-100 mt-1">
                  드라이브 모드 + 큐레이션된 메시지 + 음성 명령 지원
                </p>
              </div>
              <div className="text-2xl">→</div>
            </div>
          </Link>

          <Link
            href="/mentee"
            className="block bg-white/10 hover:bg-white/20 backdrop-blur rounded-2xl p-6 transition"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">👥</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">멘티 화면</h2>
                <p className="text-blue-100 mt-1">
                  실시간 채팅 + 슈퍼챗 + 슬라이드 컨텍스트 연동
                </p>
              </div>
              <div className="text-2xl">→</div>
            </div>
          </Link>

          <Link
            href="/voice"
            className="block bg-white/10 hover:bg-white/20 backdrop-blur rounded-2xl p-6 transition"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">🎙️</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">음성 명령 인식</h2>
                <p className="text-blue-100 mt-1">
                  호출어 기반 명령 인식 + 음성 확인 루프
                </p>
              </div>
              <div className="text-2xl">→</div>
            </div>
          </Link>
        </div>

        <p className="text-center text-blue-200/50 text-sm mt-8">
          캡스톤 디자인 프로토타입 · 카풀링 산학협력
        </p>
      </div>
    </div>
  );
}