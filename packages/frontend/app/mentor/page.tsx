'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

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

export default function MentorPage() {
  const [connected, setConnected] = useState(false);
  const [curatedMessages, setCuratedMessages] = useState<ChatMessage[]>([]);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [driveMode, setDriveMode] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  const SESSION_ID = 'demo-session-001';
  const USER_ID = 'mentor-001';
  const NICKNAME = '김멘토';

  useEffect(() => {
    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('채팅 서버 연결됨');
      setConnected(true);
      socket.emit('chat:join', {
        sessionId: SESSION_ID,
        userId: USER_ID,
        nickname: NICKNAME,
      });
    });

    // 큐레이션 통과한 메시지만 받음
    socket.on('chat:curated', (message: ChatMessage) => {
      setCuratedMessages((prev) => [message, ...prev].slice(0, 10));
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const nextSlide = () => setCurrentSlide((s) => s + 1);
  const prevSlide = () => setCurrentSlide((s) => Math.max(1, s - 1));

  return (
    <div className={`min-h-screen ${driveMode ? 'bg-black text-white' : 'bg-gray-50'}`}>
      {/* 상단 헤더 */}
      <header className={`p-4 border-b ${driveMode ? 'border-gray-700' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">멘토 화면</h1>
            <p className="text-sm opacity-70">
              {connected ? '🟢 연결됨' : '🔴 연결 안됨'} | 슬라이드 {currentSlide}
            </p>
          </div>
          <button
            onClick={() => setDriveMode(!driveMode)}
            className={`px-4 py-2 rounded-lg font-semibold ${
              driveMode ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white'
            }`}
          >
            {driveMode ? '드라이브 모드 ON' : '드라이브 모드 OFF'}
          </button>
        </div>
      </header>

      {/* 메인 영역 */}
      <main className="p-6">
        {/* 슬라이드 영역 */}
        <div
          className={`mb-6 rounded-xl ${
            driveMode ? 'bg-gray-900' : 'bg-white shadow'
          } p-12 text-center`}
        >
          {driveMode ? (
            <div className="text-3xl font-bold opacity-50">
              ⚠️ 주행 중 화면 표시 차단됨
              <p className="text-base mt-4 opacity-70">슬라이드 {currentSlide}</p>
            </div>
          ) : (
            <div>
              <div className="text-7xl mb-4">📊</div>
              <h2 className="text-3xl font-bold">슬라이드 {currentSlide}</h2>
              <p className="text-gray-500 mt-2">멘토링 자료 미리보기</p>
            </div>
          )}
        </div>

        {/* 큰 버튼들 (운전자 친화적) */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={prevSlide}
            className={`py-8 text-2xl font-bold rounded-xl ${
              driveMode ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
          >
            ← 이전 슬라이드
          </button>
          <button
            onClick={nextSlide}
            className={`py-8 text-2xl font-bold rounded-xl ${
              driveMode ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
          >
            다음 슬라이드 →
          </button>
        </div>

        {/* 큐레이션된 채팅 영역 */}
        <div
          className={`rounded-xl ${
            driveMode ? 'bg-gray-900' : 'bg-white shadow'
          } p-6`}
        >
          <h3 className="text-xl font-bold mb-4">
            📬 중요 메시지 ({curatedMessages.length})
          </h3>
          {curatedMessages.length === 0 ? (
            <p className="opacity-50">아직 큐레이션된 메시지가 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {curatedMessages.map((msg) => (
                <li
                  key={msg.messageId}
                  className={`p-4 rounded-lg ${
                    msg.type === 'super_chat'
                      ? 'bg-yellow-500 text-black font-bold'
                      : driveMode
                      ? 'bg-gray-800'
                      : 'bg-gray-100'
                  }`}
                >
                  <div className="text-sm opacity-70 mb-1">
                    {msg.nickname} {msg.type === 'super_chat' && `💰 ${msg.superChatTier?.toUpperCase()}`}
                  </div>
                  <div className="text-lg">{msg.content}</div>
                  <div className="text-xs opacity-50 mt-1">
                    슬라이드 {msg.slideContext}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}