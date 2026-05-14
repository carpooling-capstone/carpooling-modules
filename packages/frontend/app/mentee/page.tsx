/* eslint-disable react-hooks/set-state-in-effect */
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

type SuperChatTier = 'bronze' | 'silver' | 'gold';

const SESSION_ID = 'demo-session-001';

export default function MenteePage() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [nickname, setNickname] = useState('');
  const [userId, setUserId] = useState('');
  const [currentSlide, setCurrentSlide] = useState(1);
  const [showSuperChat, setShowSuperChat] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SuperChatTier>('bronze');
  const socketRef = useRef<Socket | null>(null);

  // 닉네임과 사용자 ID 초기화 (브라우저에서만 실행)
  useEffect(() => {
    const savedNickname = localStorage.getItem('mentee-nickname');
    if (savedNickname) {
      setNickname(savedNickname);
    } else {
      const name = window.prompt('닉네임을 입력하세요') || '익명멘티';
      localStorage.setItem('mentee-nickname', name);
      setNickname(name);
    }

    const newUserId = `mentee-${Math.random().toString(36).slice(2, 8)}`;
    setUserId(newUserId);
  }, []);

  // Socket 연결
  useEffect(() => {
    if (!nickname || !userId) return;

    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('채팅 서버 연결됨');
      setConnected(true);
      socket.emit('chat:join', {
        sessionId: SESSION_ID,
        userId,
        nickname,
      });
    });

    socket.on('chat:broadcast', (message: ChatMessage) => {
      setMessages((prev) => [...prev, message].slice(-50));
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [nickname, userId]);

  // 일반 메시지 전송
  const sendMessage = () => {
    if (!input.trim() || !socketRef.current) return;

    socketRef.current.emit('chat:message', {
      sessionId: SESSION_ID,
      userId,
      nickname,
      content: input,
      type: 'normal',
      slideContext: currentSlide,
    });

    setInput('');
  };

  // 슈퍼챗 전송
  const sendSuperChat = async () => {
    if (!input.trim() || !socketRef.current) return;

    const amounts: Record<SuperChatTier, number> = {
      bronze: 5000,
      silver: 20000,
      gold: 50000,
    };

    socketRef.current.emit('chat:message', {
      sessionId: SESSION_ID,
      userId,
      nickname,
      content: input,
      type: 'super_chat',
      superChatTier: selectedTier,
      slideContext: currentSlide,
    });

    try {
      await fetch('http://localhost:3002/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: SESSION_ID,
          userId,
          nickname,
          content: input,
          tier: selectedTier,
          amount: amounts[selectedTier],
          slideContext: currentSlide,
        }),
      });
    } catch (e) {
      console.error('질문 큐 등록 실패', e);
    }

    setInput('');
    setShowSuperChat(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="p-4 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">멘티 화면</h1>
            <p className="text-sm text-gray-600">
              {connected ? '🟢 연결됨' : '🔴 연결 안됨'} | {nickname} | 슬라이드 {currentSlide}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentSlide((s) => Math.max(1, s - 1))}
              className="px-3 py-1 bg-gray-200 rounded text-sm"
            >
              슬라이드 -
            </button>
            <button
              onClick={() => setCurrentSlide((s) => s + 1)}
              className="px-3 py-1 bg-gray-200 rounded text-sm"
            >
              슬라이드 +
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white p-8 m-4 rounded-xl shadow text-center">
        <div className="text-5xl mb-2">📊</div>
        <h2 className="text-xl font-bold">슬라이드 {currentSlide}</h2>
        <p className="text-gray-500 text-sm">멘토 발표 자료</p>
      </div>

      <main className="flex-1 px-4 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-2">
          {messages.length === 0 ? (
            <p className="text-center text-gray-400 mt-8">
              아직 메시지가 없습니다. 첫 메시지를 보내보세요!
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.messageId}
                className={`p-3 rounded-lg ${
                  msg.type === 'super_chat'
                    ? msg.superChatTier === 'gold'
                      ? 'bg-yellow-400 text-black'
                      : msg.superChatTier === 'silver'
                      ? 'bg-gray-300 text-black'
                      : 'bg-orange-300 text-black'
                    : msg.userId === userId
                    ? 'bg-blue-100 ml-12'
                    : 'bg-white mr-12'
                } shadow-sm`}
              >
                <div className="text-xs font-semibold mb-1">
                  {msg.nickname}
                  {msg.type === 'super_chat' && (
                    <span className="ml-2 px-2 py-0.5 bg-black/20 rounded text-xs">
                      {msg.superChatTier?.toUpperCase()} 챗
                    </span>
                  )}
                  <span className="ml-2 text-xs opacity-60">슬라이드 {msg.slideContext}</span>
                </div>
                <div>{msg.content}</div>
              </div>
            ))
          )}
        </div>
      </main>

      <footer className="p-4 bg-white border-t">
        {showSuperChat && (
          <div className="mb-3 p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm font-semibold mb-2">슈퍼챗 등급 선택</p>
            <div className="flex gap-2">
              {(['bronze', 'silver', 'gold'] as SuperChatTier[]).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className={`flex-1 py-2 rounded font-semibold ${
                    selectedTier === tier
                      ? tier === 'gold'
                        ? 'bg-yellow-500 text-black'
                        : tier === 'silver'
                        ? 'bg-gray-400 text-black'
                        : 'bg-orange-500 text-white'
                      : 'bg-gray-100'
                  }`}
                >
                  {tier === 'bronze' && '브론즈 (5천원)'}
                  {tier === 'silver' && '실버 (2만원)'}
                  {tier === 'gold' && '골드 (5만원)'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={showSuperChat ? '슈퍼챗 내용 입력...' : '메시지 입력...'}
            className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={() => setShowSuperChat(!showSuperChat)}
            className="px-4 py-3 bg-yellow-500 text-black font-semibold rounded-lg"
          >
            💰
          </button>
          <button
            onClick={showSuperChat ? sendSuperChat : sendMessage}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg"
          >
            {showSuperChat ? '슈퍼챗 전송' : '전송'}
          </button>
        </div>
      </footer>
    </div>
  );
}