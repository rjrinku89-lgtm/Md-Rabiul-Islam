export interface CaptionWord {
  start: number; // offset in seconds relative to clip start
  end: number;
  text: string;
  emphasis?: boolean;
}

export interface ViralityBreakdown {
  hookScore: number;
  engagementScore: number;
  trendScore: number;
  pacingScore: number;
}

export interface SocialKit {
  youtubeTitle: string;
  instagramCaption: string;
  hashtags: string[];
  hookPinnedComment: string;
}

export interface ShortClip {
  id: string;
  title: string;
  hookTitle: string;
  headlineBanner: string;
  startTime: number;
  endTime: number;
  formattedTime: string;
  duration: number;
  viralityScore: number;
  viralityBreakdown: ViralityBreakdown;
  hookType: string;
  hookReason: string;
  transcript: string;
  captions: CaptionWord[];
  suggestedBroll: string[];
  socialKit: SocialKit;
  clipVideoUrl?: string;
}

export interface VideoChapter {
  timestamp: string;
  title: string;
  summary: string;
}

export interface VideoSummary {
  overview: string;
  keyTakeaways: string[];
  targetAudience: string;
  notableQuote: string;
  category: string;
  chapters: VideoChapter[];
}

export interface VideoProject {
  id: string;
  url: string;
  title: string;
  author: string;
  authorUrl?: string;
  thumbnailUrl: string;
  durationApprox?: string;
  summary: VideoSummary;
  clips: ShortClip[];
  createdAt: number;
  videoFileUrl?: string;
  videoFileName?: string;
}

export type CaptionStyle = 'hormozi' | 'mrbeast' | 'neon' | 'minimal' | 'karaoke';
export type LayoutStyle = 'fill_blur' | 'split_screen' | 'centered_card' | 'cinematic';
export type AspectRatio = '9:16' | '1:1' | '16:9';
export type ColorFilterStyle =
  | 'none'
  | 'cinematic_warm'
  | 'cyber_neon'
  | 'moody_noir'
  | 'vibrant_pop'
  | 'vintage_vhs';
export type BgMusicTrack =
  | 'none'
  | 'lofi_chill'
  | 'cinematic_pulse'
  | 'phonk_energy'
  | 'ambient_piano';
export type VoiceoverMode = 'none' | 'ai_intro_hook' | 'custom_voiceover';
export type VoiceoverVoice = 'Puck' | 'Charon' | 'Aoede' | 'Fenrir' | 'Kore';

export interface EditorSettings {
  aspectRatio: AspectRatio;
  captionStyle: CaptionStyle;
  layoutStyle: LayoutStyle;
  showHeadline: boolean;
  headlineText: string;
  captionPosition: 'center' | 'bottom' | 'top';
  captionFontSize: number;
  highlightColor: string;
  textColor: string;
  showProgressBar: boolean;
  showWatermark: boolean;
  watermarkHandle: string;
  exportQuality: '360p' | '720p' | '1080p';
  exportFormat: 'mp4' | 'webm';
  subtitleLanguage: 'bn' | 'en' | 'auto';
  // Creative Transformation & Anti-Copyright Protection
  colorFilter: ColorFilterStyle;
  enableVignette: boolean;
  enableDynamicZoom: boolean;
  enableHookFlash: boolean;
  bgMusicTrack: BgMusicTrack;
  bgMusicVolume: number; // 0.0 to 1.0 (default 0.25)
  enableAntiContentIdShield: boolean; // micro pitch + speed shift
  voiceoverMode: VoiceoverMode;
  voiceoverVoice: VoiceoverVoice;
  voiceoverScript: string;
  voiceoverAudioUrl?: string;
  voiceoverVolume: number; // 0.0 to 1.0 (default 0.9)
  enableAudioDucking: boolean;
}

