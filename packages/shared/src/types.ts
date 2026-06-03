// 카풀링 멘토링 시스템 공통 타입 정의
// 백엔드 모듈과 프론트엔드 데모가 모두 참조

// 세션
export interface Session {
  sessionId: string;
  mentorId: string;
  title: string;
  createdAt: string;
  status: 'waiting' | 'live' | 'ended';
  currentSlide: number;
}

// 사용자
export interface User {
  userId: string;
  nickname: string;
  role: 'mentor' | 'mentee';
}

// 슈퍼챗 등급
export type SuperChatTier = 'bronze' | 'silver' | 'gold';

// 채팅 메시지
export interface ChatMessage {
  messageId: string;
  sessionId: string;
  userId: string;
  nickname: string;
  content: string;
  timestamp: string;
  type: 'normal' | 'super_chat';
  superChatTier?: SuperChatTier;
  slideContext: number;
}

// 질문
export interface Question {
  questionId: string;
  sessionId: string;
  userId: string;
  nickname: string;
  content: string;
  tier: 'free' | SuperChatTier;
  amount: number;
  slideContext: number;
  createdAt: string;
  status: 'pending' | 'reading' | 'answered' | 'expired';
}

// 음성 명령 인텐트
export type VoiceCommandIntent =
  | 'next_slide'
  | 'prev_slide'
  | 'pause'
  | 'resume'
  | 'next_question'
  | 'accept_1on1'
  | 'end_session';

// 음성 명령
export interface VoiceCommand {
  commandId: string;
  sessionId: string;
  rawText: string;
  intent: VoiceCommandIntent;
  confidence: number;
  timestamp: string;
}

// 호출어
export const WAKE_WORD = '오케이 드라이브';

// 명령어 매핑 (호출어 다음에 오는 단어)
export const COMMAND_KEYWORDS: Record<string, VoiceCommandIntent> = {
  '다음': 'next_slide',
  '다음 슬라이드': 'next_slide',
  '이전': 'prev_slide',
  '이전 슬라이드': 'prev_slide',
  '일시정지': 'pause',
  '재개': 'resume',
  '다음 질문': 'next_question',
  '일대일 수락': 'accept_1on1',
  '1:1 수락': 'accept_1on1',
  '세션 종료': 'end_session',
};