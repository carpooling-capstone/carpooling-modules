/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// 호출어
const WAKE_WORD = '카풀링';

// 명령어 매핑
const COMMAND_KEYWORDS: Record<string, string> = {
  '다음': 'next_slide',
  '다음 슬라이드': 'next_slide',
  '이전': 'prev_slide',
  '이전 슬라이드': 'prev_slide',
  '일시정지': 'pause',
  '재개': 'resume',
  '다음 질문': 'next_question',
  '일대일 수락': 'accept_1on1',
  '세션 종료': 'end_session',
};

// 인텐트별 한국어 라벨
const INTENT_LABEL: Record<string, string> = {
  next_slide: '다음 슬라이드',
  prev_slide: '이전 슬라이드',
  pause: '일시정지',
  resume: '재개',
  next_question: '다음 질문',
  accept_1on1: '1:1 수락',
  end_session: '세션 종료',
};

interface CommandLog {
  timestamp: string;
  rawText: string;
  intent: string | null;
  confirmed: boolean | null;
}

export default function VoicePage() {
  const [isListening, setIsListening] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [logs, setLogs] = useState<CommandLog[]>([]);
  const [pendingIntent, setPendingIntent] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  // 음성 출력 (TTS)
  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  }, []);

  // 로그 추가
  const addLog = useCallback((rawText: string, intent: string | null, confirmed: boolean | null) => {
    setLogs((prev) => [
      { timestamp: new Date().toLocaleTimeString(), rawText, intent, confirmed },
      ...prev,
    ].slice(0, 20));
  }, []);

  // 명령어 처리
  const processCommand = useCallback((rawText: string) => {
    const text = rawText.trim();

    if (!text.includes(WAKE_WORD)) {
      addLog(text, null, null);
      return;
    }

    const afterWake = text.split(WAKE_WORD).slice(1).join(WAKE_WORD).trim();
    const cleaned = afterWake.replace(/^[,\s]+/, '').trim();

    let matchedIntent: string | null = null;
    for (const [keyword, intent] of Object.entries(COMMAND_KEYWORDS)) {
      if (cleaned.includes(keyword)) {
        matchedIntent = intent;
        break;
      }
    }

    if (matchedIntent) {
      setPendingIntent(matchedIntent);
      addLog(text, matchedIntent, null);
      speak(`${INTENT_LABEL[matchedIntent]}, 진행할까요?`);
    } else {
      addLog(text, null, null);
    }
  }, [addLog, speak]);

  // Web Speech API 초기화
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ko-KR';

    recognition.onresult = (event: any) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      setCurrentText(finalText || interimText);

      if (finalText) {
        processCommand(finalText);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('음성 인식 에러:', event.error);
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch {
          // 이미 시작된 경우 무시
        }
      }
    };

    recognitionRef.current = recognition;
  }, [processCommand]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      isListeningRef.current = false;
      recognitionRef.current.stop();
      setIsListening(false);
      setCurrentText('');
    } else {
      try {
        isListeningRef.current = true;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('인식 시작 실패', err);
      }
    }
  };

  const confirmCommand = () => {
    if (!pendingIntent) return;
    speak(`${INTENT_LABEL[pendingIntent]} 실행`);
    setLogs((prev) =>
      prev.map((log, idx) => (idx === 0 ? { ...log, confirmed: true } : log))
    );
    setPendingIntent(null);
  };

  const cancelCommand = () => {
    if (!pendingIntent) return;
    speak('취소');
    setLogs((prev) =>
      prev.map((log, idx) => (idx === 0 ? { ...log, confirmed: false } : log))
    );
    setPendingIntent(null);
  };

  if (!supported) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">브라우저 미지원</h2>
          <p className="text-gray-600">
            이 브라우저는 Web Speech API를 지원하지 않습니다. Chrome 또는 Edge에서 다시 시도해주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-700 text-white p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">🎙️ 음성 명령 인식 프로토타입</h1>
        <p className="text-purple-100 mt-1">호출어 &ldquo;카풀링&rdquo; 다음에 명령어를 말해보세요</p>
      </header>

      <div className="bg-white/10 backdrop-blur rounded-2xl p-8 mb-6 text-center">
        <button
          onClick={toggleListening}
          className={`w-32 h-32 rounded-full text-6xl transition-all ${
            isListening ? 'bg-red-500 animate-pulse' : 'bg-white text-purple-600 hover:scale-110'
          }`}
        >
          {isListening ? '⏹️' : '🎙️'}
        </button>
        <p className="mt-4 text-lg font-semibold">
          {isListening ? '듣고 있어요...' : '클릭해서 시작'}
        </p>
        {currentText && (
          <p className="mt-4 text-2xl font-mono bg-black/30 px-4 py-2 rounded-lg inline-block">
            &ldquo;{currentText}&rdquo;
          </p>
        )}
      </div>

      {pendingIntent && (
        <div className="bg-yellow-400 text-black rounded-2xl p-6 mb-6 text-center">
          <p className="text-xl font-bold mb-4">
            확인: {INTENT_LABEL[pendingIntent]}을(를) 실행할까요?
          </p>
          <div className="flex gap-4 justify-center">
            <button onClick={confirmCommand} className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg text-lg">
              ✓ 예
            </button>
            <button onClick={cancelCommand} className="px-8 py-3 bg-gray-700 text-white font-bold rounded-lg text-lg">
              ✗ 아니오
            </button>
          </div>
        </div>
      )}

      <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-bold mb-3">📋 사용 가능한 명령어</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {Object.keys(COMMAND_KEYWORDS).map((keyword) => (
            <div key={keyword} className="bg-white/10 px-3 py-2 rounded">
              &ldquo;카풀링, {keyword}&rdquo;
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
        <h3 className="text-lg font-bold mb-3">📜 인식 기록 ({logs.length})</h3>
        {logs.length === 0 ? (
          <p className="text-purple-100/70">아직 인식된 명령이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log, idx) => (
              <li
                key={idx}
                className={`p-3 rounded-lg ${
                  log.intent
                    ? log.confirmed === true
                      ? 'bg-green-500/30'
                      : log.confirmed === false
                      ? 'bg-gray-500/30'
                      : 'bg-yellow-500/30'
                    : 'bg-white/5'
                }`}
              >
                <div className="text-xs opacity-70">{log.timestamp}</div>
                <div className="text-base">&ldquo;{log.rawText}&rdquo;</div>
                {log.intent && (
                  <div className="text-sm mt-1">
                    → 인텐트: <span className="font-mono">{INTENT_LABEL[log.intent]}</span>
                    {log.confirmed === true && ' ✓ 실행됨'}
                    {log.confirmed === false && ' ✗ 취소됨'}
                  </div>
                )}
                {!log.intent && (
                  <div className="text-xs opacity-50 mt-1">
                    호출어/명령어 없음 (강의 흐름 보호)
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}