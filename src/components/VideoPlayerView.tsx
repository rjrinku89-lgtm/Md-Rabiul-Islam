import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Smartphone,
  Sparkles,
  Check,
  Upload,
  Video,
  Monitor,
  Flame,
  Download,
} from 'lucide-react';
import { ShortClip, EditorSettings } from '../types';

interface VideoPlayerViewProps {
  clip: ShortClip;
  settings: EditorSettings;
  videoId: string;
  videoTitle: string;
  thumbnailUrl: string;
  videoFileUrl?: string;
  videoFileName?: string;
  onAttachVideoFile: (file: File) => void;
  onAttachStream: (stream: MediaStream) => void;
  onUpdateHeadline: (newHeadline: string) => void;
  onOneClickExport: (videoElement: HTMLVideoElement | null) => void;
  isExporting: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onDownloadOriginal?: () => void;
  onDownloadClip?: (clip: ShortClip) => void;
  isDownloadingClip?: boolean;
}

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  clip,
  settings,
  videoId,
  videoTitle,
  thumbnailUrl,
  videoFileUrl,
  videoFileName,
  onAttachVideoFile,
  onAttachStream,
  onUpdateHeadline,
  onOneClickExport,
  isExporting,
  videoRef,
  onDownloadOriginal,
  onDownloadClip,
  isDownloadingClip,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isEditingHeadline, setIsEditingHeadline] = useState(false);
  const [headlineDraft, setHeadlineDraft] = useState(settings.headlineText || clip.headlineBanner);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  const playerRef = useRef<any>(null);
  const isPlayerReadyRef = useRef(false);
  const pendingPlayRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize draft when clip changes, and seek player smoothly
  useEffect(() => {
    setHeadlineDraft(settings.headlineText || clip.headlineBanner);
    setCurrentTimeSec(0);
    setIsPlaying(false);
    pendingPlayRef.current = false;

    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      try {
        playerRef.current.seekTo(clip.startTime, true);
        if (typeof playerRef.current.pauseVideo === 'function') {
          playerRef.current.pauseVideo();
        }
      } catch (e) {
        // ignore
      }
    }

    if (videoRef.current) {
      try {
        videoRef.current.currentTime = clip.startTime;
        videoRef.current.pause();
      } catch (e) {
        // ignore
      }
    }
  }, [clip.id, clip.startTime, settings.headlineText]);

  // Initialize YouTube Iframe Player
  useEffect(() => {
    let checkInterval: any = null;
    let isCancelled = false;

    const initPlayer = () => {
      if (isCancelled) return;
      const YT = (window as any).YT;
      if (!YT || !YT.Player) return;

      if (ytContainerRef.current) {
        let targetEl = ytContainerRef.current.querySelector('#yt-embed-player');
        if (!targetEl) {
          targetEl = document.createElement('div');
          targetEl.id = 'yt-embed-player';
          targetEl.className = 'w-full h-full pointer-events-none';
          ytContainerRef.current.innerHTML = '';
          ytContainerRef.current.appendChild(targetEl);
        }
      }

      const el = document.getElementById('yt-embed-player');
      if (!el) return;

      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
          playerRef.current = null;
        } catch (e) {
          // ignore
        }
      }

      try {
        const ytInstance = new YT.Player('yt-embed-player', {
          videoId: videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            start: Math.floor(clip.startTime),
            end: Math.ceil(clip.endTime),
            playsinline: 1,
          },
          events: {
            onReady: (event: any) => {
              if (isCancelled) return;
              playerRef.current = event.target || ytInstance;
              isPlayerReadyRef.current = true;
              setIsPlayerReady(true);

              try {
                if (typeof event.target.seekTo === 'function') {
                  event.target.seekTo(clip.startTime, true);
                }
                if (isMuted) {
                  if (typeof event.target.mute === 'function') event.target.mute();
                } else {
                  if (typeof event.target.unMute === 'function') event.target.unMute();
                }
                if (pendingPlayRef.current) {
                  pendingPlayRef.current = false;
                  if (typeof event.target.playVideo === 'function') {
                    event.target.playVideo();
                  }
                }
              } catch (e) {
                // ignore
              }
            },
            onStateChange: (event: any) => {
              if (isCancelled) return;
              try {
                if (event.data === 1) {
                  setIsPlaying(true);
                } else if (event.data === 2 || event.data === 0) {
                  setIsPlaying(false);
                  if (event.data === 0 && typeof event.target.seekTo === 'function') {
                    event.target.seekTo(clip.startTime, true);
                  }
                }
              } catch (e) {
                // ignore
              }
            },
          },
        });
      } catch (err) {
        console.warn('Failed to initialize YouTube Player:', err);
      }
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    } else {
      checkInterval = setInterval(() => {
        if ((window as any).YT && (window as any).YT.Player) {
          clearInterval(checkInterval);
          initPlayer();
        }
      }, 200);
    }

    return () => {
      isCancelled = true;
      if (checkInterval) clearInterval(checkInterval);
      isPlayerReadyRef.current = false;
      setIsPlayerReady(false);
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
          playerRef.current = null;
        } catch (e) {
          // ignore
        }
      }
    };
  }, [videoId]);

  // High-performance playback time synchronization loop throttled to ~25fps (40ms)
  useEffect(() => {
    let lastTimestamp = performance.now();
    let lastRenderUpdate = 0;

    const loop = (timestamp: number) => {
      if (isPlaying) {
        const timeSinceLastUpdate = timestamp - lastRenderUpdate;
        // Throttle React state update to avoid saturating UI thread with 60-120 renders/sec
        if (timeSinceLastUpdate >= 40) {
          lastRenderUpdate = timestamp;
          if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
            try {
              const ytTime = playerRef.current.getCurrentTime();
              if (typeof ytTime === 'number' && !isNaN(ytTime)) {
                const offset = Math.max(0, ytTime - clip.startTime);
                setCurrentTimeSec(offset);

                if (ytTime >= clip.endTime && typeof playerRef.current.seekTo === 'function') {
                  playerRef.current.seekTo(clip.startTime, true);
                  setCurrentTimeSec(0);
                }
              }
            } catch (e) {
              // ignore
            }
          } else if (videoRef.current) {
            try {
              const vTime = videoRef.current.currentTime;
              const offset = Math.max(0, vTime - clip.startTime);
              setCurrentTimeSec(offset);

              if (vTime >= clip.endTime) {
                videoRef.current.currentTime = clip.startTime;
                setCurrentTimeSec(0);
              }
            } catch (e) {
              // ignore
            }
          } else {
            const delta = (timestamp - lastTimestamp) / 1000;
            setCurrentTimeSec((prev) => {
              const next = prev + delta;
              if (next >= clip.duration) {
                return 0;
              }
              return next;
            });
          }
        }
      }
      lastTimestamp = timestamp;
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, clip.startTime, clip.endTime, clip.duration]);

  const togglePlay = () => {
    const nextPlayState = !isPlaying;
    setIsPlaying(nextPlayState);

    if (playerRef.current && typeof playerRef.current.playVideo === 'function' && typeof playerRef.current.pauseVideo === 'function') {
      try {
        if (nextPlayState) {
          playerRef.current.playVideo();
        } else {
          playerRef.current.pauseVideo();
        }
      } catch (err) {
        console.warn('YouTube togglePlay error:', err);
      }
    } else {
      pendingPlayRef.current = nextPlayState;
    }

    if (videoRef.current) {
      try {
        if (nextPlayState) {
          videoRef.current.play().catch(() => {});
        } else {
          videoRef.current.pause();
        }
      } catch (err) {
        console.warn('HTML video togglePlay error:', err);
      }
    }
  };

  const restartClip = () => {
    setCurrentTimeSec(0);
    setIsPlaying(true);

    if (playerRef.current && isPlayerReadyRef.current) {
      try {
        if (typeof playerRef.current.seekTo === 'function') {
          playerRef.current.seekTo(clip.startTime, true);
        }
        if (typeof playerRef.current.playVideo === 'function') {
          playerRef.current.playVideo();
        } else {
          pendingPlayRef.current = true;
        }
      } catch (err) {
        console.warn('YouTube restartClip error:', err);
      }
    } else {
      pendingPlayRef.current = true;
    }

    if (videoRef.current) {
      try {
        videoRef.current.currentTime = clip.startTime;
        videoRef.current.play().catch(() => {});
      } catch (err) {
        console.warn('HTML video restart error:', err);
      }
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (playerRef.current && isPlayerReadyRef.current) {
      try {
        if (nextMuted) {
          if (typeof playerRef.current.mute === 'function') {
            playerRef.current.mute();
          }
        } else {
          if (typeof playerRef.current.unMute === 'function') {
            playerRef.current.unMute();
          }
        }
      } catch (err) {
        console.warn('YouTube toggleMute error:', err);
      }
    }

    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTimeSec(val);

    if (playerRef.current && isPlayerReadyRef.current && typeof playerRef.current.seekTo === 'function') {
      try {
        playerRef.current.seekTo(clip.startTime + val, true);
      } catch (err) {
        console.warn('YouTube seek error:', err);
      }
    }

    if (videoRef.current) {
      try {
        videoRef.current.currentTime = clip.startTime + val;
      } catch (err) {
        console.warn('HTML video seek error:', err);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAttachVideoFile(file);
    }
  };

  const handleCaptureTab = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      if (stream) {
        onAttachStream(stream);
      }
    } catch (err) {
      console.warn('Tab capture cancelled:', err);
    }
  };

  const activeCaption =
    clip.captions.find(
      (c) => currentTimeSec >= c.start && currentTimeSec <= c.end + 0.35
    ) ||
    clip.captions[Math.min(clip.captions.length - 1, Math.floor((currentTimeSec / clip.duration) * clip.captions.length))] ||
    clip.captions[0];

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSaveHeadline = () => {
    onUpdateHeadline(headlineDraft);
    setIsEditingHeadline(false);
  };

  // Check if caption contains Bengali / Bangla characters
  const isBanglaCaption =
    /[\u0980-\u09FF]/.test(activeCaption?.text || '') || settings.subtitleLanguage === 'bn';
  const isBanglaHeadline =
    /[\u0980-\u09FF]/.test(headlineDraft || clip.headlineBanner || '');

  const captionFontFamily = isBanglaCaption
    ? "'Hind Siliguri', 'Noto Sans Bengali', sans-serif"
    : undefined;

  const headlineFontFamily = isBanglaHeadline
    ? "'Hind Siliguri', 'Noto Sans Bengali', sans-serif"
    : undefined;

  // Detect if video is already a complete 9:16 vertical render (e.g. Cartoon Video or AI Short)
  const isVerticalFullVideo = Boolean(
    videoFileUrl?.includes('cartoon_') ||
    videoFileUrl?.includes('ani_') ||
    videoFileUrl?.includes('ai_') ||
    clip.clipVideoUrl?.includes('cartoon_') ||
    clip.clipVideoUrl?.includes('ani_') ||
    videoFileName?.includes('cartoon_')
  );

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      {/* Hidden file input for MP4 attachment */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/mov"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Header Badge */}
      <div className="w-full flex items-center justify-between mb-3 px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 font-bold flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isVerticalFullVideo ? 'AI Cartoon 9:16 Player' : 'YouTube Shorts Player'}</span>
          </span>
          {isBanglaCaption && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[10px]">
              🇧🇩 বাংলা
            </span>
          )}
        </div>

        <div className="text-zinc-400 text-xs flex items-center gap-1.5 font-medium">
          <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
          <span>9:16 Shorts (1080×1920)</span>
        </div>
      </div>

      {/* 9:16 Vertical Video Frame Phone Mockup */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[9/16] max-h-[640px] bg-black rounded-3xl overflow-hidden border-2 border-zinc-700/80 shadow-2xl shadow-indigo-950/60 select-none group"
      >
        {/* Unified Video Presentation Layer */}
        <div className="absolute inset-0 overflow-hidden flex items-center justify-center">
          {/* Blurred background ambience (only needed for 16:9 videos) */}
          {!isVerticalFullVideo && (
            <div
              className="absolute inset-0 bg-cover bg-center blur-2xl opacity-60 scale-125"
              style={{
                backgroundImage: `url(${thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`})`,
              }}
            />
          )}

          {/* Full frame for 9:16 cartoon videos, or centered letterbox for 16:9 source clips */}
          <div
            className={`relative z-10 w-full overflow-hidden flex items-center justify-center ${
              isVerticalFullVideo
                ? 'h-full w-full'
                : settings.layoutStyle === 'split_screen'
                ? 'h-[50%] -translate-y-16 border-y border-white/20'
                : 'h-[56%] rounded-2xl shadow-2xl border border-white/10'
            }`}
          >
            {videoFileUrl ? (
              <video
                ref={videoRef}
                src={videoFileUrl}
                playsInline
                crossOrigin="anonymous"
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                ref={ytContainerRef}
                className="w-[116%] h-[122%] -mx-[8%] -my-[11%] pointer-events-none flex items-center justify-center overflow-hidden"
              >
                <div id="yt-embed-player" className="w-full h-full" />
              </div>
            )}
            {!isVerticalFullVideo && (
              <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-inset ring-white/15" />
            )}
          </div>
        </div>

        {/* OVERLAY 1: Top Hook Headline Banner (Hidden if already burned into vertical video) */}
        {settings.showHeadline && !isVerticalFullVideo && (
          <div className="absolute top-6 inset-x-4 z-20 flex justify-center">
            {isEditingHeadline ? (
              <div className="flex items-center gap-1 bg-black/90 p-1.5 rounded-xl border border-indigo-500 shadow-xl w-full max-w-xs">
                <input
                  type="text"
                  value={headlineDraft}
                  onChange={(e) => setHeadlineDraft(e.target.value)}
                  style={{ fontFamily: headlineFontFamily }}
                  className="w-full bg-transparent text-white text-xs font-bold px-2 py-1 focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveHeadline}
                  className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingHeadline(true)}
                title="Click to edit headline"
                style={{
                  backgroundColor: settings.highlightColor || '#facc15',
                  fontFamily: headlineFontFamily,
                }}
                className="cursor-pointer group/headline px-4 py-2 rounded-xl font-black text-xs sm:text-sm tracking-wide text-zinc-950 shadow-2xl flex items-center gap-1.5 hover:scale-105 transition active:scale-95"
              >
                <span>{headlineDraft || clip.headlineBanner}</span>
                <span className="opacity-0 group-hover/headline:opacity-100 text-[10px] text-zinc-800 ml-1">
                  ✏️
                </span>
              </div>
            )}
          </div>
        )}

        {/* OVERLAY 2: Animated Dynamic Subtitle Captions (Bangla / English, hidden if burned in) */}
        {activeCaption && !isVerticalFullVideo && (
          <div
            className={`absolute inset-x-4 z-20 pointer-events-none px-2 flex justify-center ${
              settings.captionPosition === 'top'
                ? 'top-24'
                : settings.captionPosition === 'bottom'
                ? 'bottom-20'
                : 'top-[68%]'
            }`}
          >
            <div
              style={{ fontFamily: captionFontFamily }}
              className="text-center font-extrabold"
            >
              {settings.captionStyle === 'minimal' ? (
                <span className="inline-block px-4 py-2 rounded-full bg-black/85 backdrop-blur-md text-white text-base sm:text-lg border border-white/20">
                  {activeCaption.text}
                </span>
              ) : settings.captionStyle === 'hormozi' ? (
                <span
                  className="text-xl sm:text-2xl font-black leading-tight inline-block px-2"
                  style={{
                    color: activeCaption.emphasis ? settings.highlightColor || '#facc15' : '#ffffff',
                    WebkitTextStroke: '2px black',
                    fontFamily: captionFontFamily,
                  }}
                >
                  {isBanglaCaption ? activeCaption.text : activeCaption.text.toUpperCase()}
                </span>
              ) : settings.captionStyle === 'mrbeast' ? (
                <span
                  className="text-2xl sm:text-3xl font-black leading-none inline-block px-2 rotate-[-1deg]"
                  style={{
                    color: activeCaption.emphasis ? '#ef4444' : '#facc15',
                    WebkitTextStroke: '3px black',
                    fontFamily: captionFontFamily,
                  }}
                >
                  {isBanglaCaption ? activeCaption.text : activeCaption.text.toUpperCase()}
                </span>
              ) : settings.captionStyle === 'neon' ? (
                <span
                  className="text-xl sm:text-2xl font-extrabold text-white text-shadow-cyan"
                  style={{ fontFamily: captionFontFamily }}
                >
                  {activeCaption.text}
                </span>
              ) : (
                <span
                  className="text-xl sm:text-2xl font-black text-cyan-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
                  style={{ color: settings.highlightColor || '#38bdf8', fontFamily: captionFontFamily }}
                >
                  {activeCaption.text}
                </span>
              )}
            </div>
          </div>
        )}

        {/* OVERLAY 3: Bottom Animated Progress Bar */}
        {settings.showProgressBar && (
          <div className="absolute bottom-0 inset-x-0 h-1.5 bg-white/20 z-20">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-400 transition-all duration-100"
              style={{
                width: `${Math.min(100, (currentTimeSec / clip.duration) * 100)}%`,
              }}
            />
          </div>
        )}

        {/* Centered Play / Pause Click Target */}
        <div
          onClick={togglePlay}
          className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer"
        >
          {!isPlaying && (
            <div className="w-16 h-16 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition active:scale-95 backdrop-blur-md">
              <Play className="w-7 h-7 fill-white ml-1" />
            </div>
          )}
        </div>
      </div>

      {/* Scrub & Playback Controls Toolbar */}
      <div className="w-full mt-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>{formatSeconds(currentTimeSec)}</span>
            <span>{formatSeconds(clip.duration)}</span>
          </div>
          <input
            type="range"
            min="0"
            max={clip.duration}
            step="0.1"
            value={currentTimeSec}
            onChange={handleSeek}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow transition"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            <button
              type="button"
              onClick={restartClip}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
              title="Restart from beginning"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Download & Export Action Buttons */}
          <div className="flex items-center gap-2">
            {onDownloadClip && (
              <button
                type="button"
                onClick={() => onDownloadClip(clip)}
                disabled={isDownloadingClip}
                className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95"
                title={`Download ${clip.duration}s moving video clip segment (MP4)`}
              >
                {isDownloadingClip ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-white" />
                )}
                <span>Clip (MP4)</span>
              </button>
            )}

            {/* 1-Click Export HQ Video Button */}
            <button
              type="button"
              onClick={() => onOneClickExport(videoRef.current)}
              disabled={isExporting}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>
                Export {settings.exportQuality === '1080p' ? '1080p HP' : settings.exportQuality} {settings.exportFormat?.toUpperCase() || 'MP4'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Video Footage Capture & Download Toolbar */}
      <div className="w-full mt-2.5 p-2.5 bg-zinc-900/70 border border-zinc-800/80 rounded-xl flex items-center justify-between gap-2 text-xs">
        {onDownloadOriginal && (
          <button
            type="button"
            onClick={onDownloadOriginal}
            className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white font-semibold flex items-center justify-center gap-1.5 transition border border-emerald-600/60 shadow"
            title="Download full original moving video (MP4)"
          >
            <Download className="w-3.5 h-3.5 text-emerald-200" />
            <span>Download Original MP4</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleCaptureTab}
          className="flex-1 py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-semibold flex items-center justify-center gap-1.5 transition border border-zinc-700/60"
        >
          <Monitor className="w-3.5 h-3.5 text-cyan-400" />
          <span>Record Tab</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-semibold flex items-center justify-center gap-1.5 transition border border-zinc-700/60"
        >
          <Upload className="w-3.5 h-3.5 text-indigo-400" />
          <span>Attach MP4</span>
        </button>
      </div>
    </div>
  );
};
