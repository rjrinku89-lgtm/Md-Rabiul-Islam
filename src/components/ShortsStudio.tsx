import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Flame,
  Clock,
  Play,
  Download,
  Share2,
  Sliders,
  Type,
  Languages,
  Check,
  Copy,
  Layers,
  ChevronRight,
  Palette,
  Wand2,
  FileText,
  Smartphone,
  ExternalLink,
  Cookie,
  Film,
} from 'lucide-react';
import { VideoProject, ShortClip, EditorSettings, CaptionStyle, LayoutStyle } from '../types';
import { VideoPlayerView } from './VideoPlayerView';
import { VideoSummaryTab } from './VideoSummaryTab';
import { ExportModal } from './ExportModal';
import { CookieModal } from './CookieModal';
import { renderAndExportVideo, ExportResult } from '../utils/exportEngine';

interface ShortsStudioProps {
  project: VideoProject;
  onUpdateProject: (updated: VideoProject) => void;
}

export const ShortsStudio: React.FC<ShortsStudioProps> = ({
  project,
  onUpdateProject,
}) => {
  const [activeTab, setActiveTab] = useState<'clips' | 'summary'>('clips');
  const [selectedClipId, setSelectedClipId] = useState<string>(
    project.clips[0]?.id || ''
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Editor styling settings
  const [settings, setSettings] = useState<EditorSettings>({
    aspectRatio: '9:16',
    captionStyle: 'hormozi',
    layoutStyle: 'fill_blur',
    showHeadline: true,
    headlineText: '',
    captionPosition: 'center',
    captionFontSize: 32,
    highlightColor: '#facc15',
    textColor: '#ffffff',
    showProgressBar: true,
    showWatermark: false,
    watermarkHandle: '',
    exportQuality: '1080p',
    exportFormat: 'mp4',
    subtitleLanguage: 'auto',
    colorFilter: 'none',
    enableVignette: false,
    enableDynamicZoom: true,
    enableHookFlash: false,
    bgMusicTrack: 'lofi_chill',
    bgMusicVolume: 0.22,
    enableAntiContentIdShield: true,
    voiceoverMode: 'none',
    voiceoverVoice: 'Puck',
    voiceoverScript: '',
    voiceoverVolume: 0.9,
    enableAudioDucking: true,
  });

  const [inspectorTab, setInspectorTab] = useState<'style' | 'ai' | 'social'>('style');

  // Export modal states (Capture-2)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [isDownloadingOriginal, setIsDownloadingOriginal] = useState(false);
  const [downloadingClipId, setDownloadingClipId] = useState<string | null>(null);

  // Translation / AI refine states
  const [isRefining, setIsRefining] = useState(false);
  const [refineSuccess, setRefineSuccess] = useState(false);

  const selectedClip =
    project.clips.find((c) => c.id === selectedClipId) || project.clips[0];

  const handleSelectClip = (clip: ShortClip) => {
    setSelectedClipId(clip.id);
    setSettings((prev) => ({
      ...prev,
      headlineText: clip.headlineBanner,
    }));

    // Warm up the video cache immediately in the background
    if (project.id && project.id.length === 11) {
      fetch('/api/precache-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: project.id,
          startTime: clip.startTime,
          endTime: clip.endTime,
          quality: settings.exportQuality || '720p',
        }),
      }).catch(() => {});
    }
  };

  const handleUpdateHeadline = (newHeadline: string) => {
    setSettings((prev) => ({ ...prev, headlineText: newHeadline }));
    const updatedClips = project.clips.map((c) =>
      c.id === selectedClip.id ? { ...c, headlineBanner: newHeadline } : c
    );
    onUpdateProject({ ...project, clips: updatedClips });
  };

  const handleAttachVideoFile = (file: File) => {
    const url = URL.createObjectURL(file);
    onUpdateProject({
      ...project,
      videoFileUrl: url,
      videoFileName: file.name,
    });
  };

  const handleAttachStream = (stream: MediaStream) => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
      onUpdateProject({
        ...project,
        videoFileName: 'Captured YouTube Tab Video',
      });
    }
  };

  const handleStartExport = async (
    clipToExport: ShortClip = selectedClip,
    overrideQuality?: '360p' | '720p' | '1080p'
  ) => {
    const quality = overrideQuality || settings.exportQuality || '1080p';
    try {
      setIsExportModalOpen(true);
      setIsExporting(true);
      setExportProgress(10);
      setExportStatus('Connecting to high-speed video rendering engine...');
      setExportResult(null);

      // 1. Try server-side ultra-fast real running video export (real video footage + burned subtitles + clean 16:9 moving foreground)
      setExportProgress(25);
      setExportStatus('Preparing source video stream & audio...');

      let currentProgress = 25;
      const progressInterval = setInterval(() => {
        currentProgress = Math.min(88, currentProgress + Math.floor(Math.random() * 8) + 4);
        setExportProgress(currentProgress);
        if (currentProgress < 50) {
          setExportStatus('Extracting video section and audio...');
        } else if (currentProgress < 75) {
          setExportStatus('Generating 9:16 vertical short layout & ambient background...');
        } else {
          setExportStatus('Burning in Bangla subtitles & top hook headline...');
        }
      }, 500);

      try {
        const res = await fetch('/api/render-server-short', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: project.id,
            localFileName: project.videoFileName || project.videoFileUrl || '',
            startTime: clipToExport.startTime,
            endTime: clipToExport.endTime,
            quality: quality,
            layoutStyle: settings.layoutStyle || 'fill_blur',
            captions: clipToExport.captions || [],
            headlineText: settings.headlineText || clipToExport.headlineBanner || '',
            captionStyle: settings.captionStyle || 'hormozi',
            highlightColor: settings.highlightColor || '#facc15',
            subtitleLanguage: settings.subtitleLanguage || 'auto',
          }),
        });

          clearInterval(progressInterval);

          if (res.ok) {
            const data = await res.json();
            if (data.downloadUrl) {
              const outW = quality === '1080p' ? 1080 : quality === '360p' ? 360 : 720;
              const outH = quality === '1080p' ? 1920 : quality === '360p' ? 640 : 1280;

              const cleanTitle = (clipToExport.title || 'short')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
              const filename = `${cleanTitle}-${quality}-short.mp4`;

              setExportProgress(100);
              setExportStatus('HQ Video generated successfully!');
              setExportResult({
                blob: new Blob([]),
                format: 'mp4',
                filename,
                url: data.downloadUrl,
                width: outW,
                height: outH,
              });
              setIsExporting(false);
              return;
            }
            const errData = await res.json().catch(() => ({}));
            setIsExporting(false);
            setExportStatus(errData.error || 'Server rendering notice. Please retry.');
            return;
          }
        } catch (serverErr: any) {
          clearInterval(progressInterval);
          console.warn('Server render attempt error:', serverErr);
          setIsExporting(false);
          setExportStatus('Render failed: ' + (serverErr?.message || 'Please retry.'));
          return;
        }

      // 2. Client-side rendering ONLY if a real video file is attached
      const hasRealVideoLoaded = !!(
        videoRef.current &&
        videoRef.current.readyState >= 2 &&
        videoRef.current.videoWidth > 0
      );

      if (!hasRealVideoLoaded && !project.videoFileUrl) {
        setIsExporting(false);
        setExportStatus('Source video is buffering. Please wait a moment and retry.');
        return;
      }

      setExportProgress(30);
      setExportStatus('Rendering moving video frames with hardware acceleration...');

      const result = await renderAndExportVideo(
        clipToExport,
        {
          ...settings,
          exportQuality: quality,
          headlineText: settings.headlineText || clipToExport.headlineBanner,
        },
        project.title,
        (progress, status) => {
          setExportProgress(progress);
          setExportStatus(status);
        },
        videoRef.current,
        project.thumbnailUrl
      );

      setExportResult(result);
      setIsExporting(false);
    } catch (err: any) {
      console.error('Export error:', err);
      setIsExporting(false);
      setExportStatus(err.message || 'Export could not complete. Please retry.');
    }
  };

  // Direct 1-Click Download of Original Full Moving MP4 Video
  const handleDownloadOriginalVideo = async () => {
    try {
      setIsDownloadingOriginal(true);
      if (project.videoFileUrl) {
        const link = document.createElement('a');
        link.href = project.videoFileUrl;
        link.download = project.videoFileName || `${project.title.replace(/[^a-zA-Z0-9_\-\u0980-\u09FF\s]/g, '') || 'video'}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => setIsDownloadingOriginal(false), 800);
        return;
      }

      const res = await fetch('/api/savefrom/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: project.id,
          localFileName: project.videoFileName,
          format: 'original',
          clipTitle: project.title,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.downloadUrl) {
          const link = document.createElement('a');
          link.href = data.downloadUrl;
          link.download = data.filename || `${project.title}.mp4`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        handleStartExport(selectedClip);
      }
    } catch (e) {
      handleStartExport(selectedClip);
    } finally {
      setIsDownloadingOriginal(false);
    }
  };

  // Direct 1-Click Download of Selected Cut Clip (MP4 with synchronized audio)
  const handleDownloadClipCut = async (clipToDownload: ShortClip) => {
    try {
      setDownloadingClipId(clipToDownload.id);
      const res = await fetch('/api/savefrom/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: project.id,
          localFileName: project.videoFileName,
          format: 'clip',
          startTime: clipToDownload.startTime,
          endTime: clipToDownload.endTime,
          clipTitle: clipToDownload.title,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.downloadUrl) {
          const link = document.createElement('a');
          link.href = data.downloadUrl;
          link.download = data.filename || `${clipToDownload.title}.mp4`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        handleStartExport(clipToDownload);
      }
    } catch (e) {
      handleStartExport(clipToDownload);
    } finally {
      setDownloadingClipId(null);
    }
  };

  // Quick AI caption translation or punchy rewrite
  const handleAiRefine = async (instruction: string, language?: string) => {
    try {
      setIsRefining(true);
      const res = await fetch('/api/refine-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clip: selectedClip,
          instruction,
          language,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedClips = project.clips.map((c) => {
          if (c.id === selectedClip.id) {
            return {
              ...c,
              headlineBanner: data.headlineBanner || c.headlineBanner,
              hookTitle: data.hookTitle || c.hookTitle,
              captions: data.captions || c.captions,
            };
          }
          return c;
        });

        onUpdateProject({ ...project, clips: updatedClips });
        if (data.headlineBanner) {
          setSettings((prev) => ({ ...prev, headlineText: data.headlineBanner }));
        }
        setRefineSuccess(true);
        setTimeout(() => setRefineSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Refine error:', err);
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Project Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-12 rounded-xl overflow-hidden bg-zinc-950 shrink-0 border border-zinc-700">
            <img
              src={project.thumbnailUrl}
              alt={project.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide">
                {project.author}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-[11px] text-zinc-400">
                {project.clips.length} Viral Shorts Detected
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-xl">
              {project.title}
            </h1>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('clips')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'clips'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-300" />
              <span>Shorts Editor ({project.clips.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'summary'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-cyan-300" />
              <span>Video Summary</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsCookieModalOpen(true)}
            title="Bypass YouTube bot checks with cookies or upload custom MP4 file"
            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Cookie className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Bot Bypass / File</span>
          </button>

          {/* 1. Download Full Original Video (MP4) */}
          <button
            type="button"
            onClick={handleDownloadOriginalVideo}
            disabled={isDownloadingOriginal}
            title="Download full original moving video (MP4) with synchronized audio"
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-emerald-950 active:scale-95"
          >
            {isDownloadingOriginal ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Downloading Original...</span>
              </>
            ) : (
              <>
                <Film className="w-3.5 h-3.5 text-emerald-200" />
                <span>Download Original (MP4)</span>
              </>
            )}
          </button>

          {/* 2. Download Selected Cut Clip (MP4) */}
          <button
            type="button"
            onClick={() => handleDownloadClipCut(selectedClip)}
            disabled={downloadingClipId === selectedClip.id}
            title={`Download exact ${selectedClip.duration}s cut clip as high quality MP4`}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-teal-950 active:scale-95"
          >
            {downloadingClipId === selectedClip.id ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Cutting MP4 Clip...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download Clip ({selectedClip.duration}s MP4)</span>
              </>
            )}
          </button>

          {/* 3. Export 9:16 Short (MP4) */}
          <button
            type="button"
            onClick={() => handleStartExport(selectedClip)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 transition active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Export 9:16 Short</span>
            <span className="sm:hidden">Short</span>
          </button>
        </div>
      </div>

      {/* Main Studio View */}
      {activeTab === 'summary' ? (
        <VideoSummaryTab
          project={project}
          onCreateClipFromChapter={(ch) => {
            setActiveTab('clips');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Clips List (4 Cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Detected Viral Clips
              </span>
              <span className="text-[11px] text-zinc-500 font-medium">
                Ranked by Virality Score
              </span>
            </div>

            <div className="space-y-2.5 max-h-[760px] overflow-y-auto pr-1">
              {project.clips.map((clip, index) => {
                const isSelected = clip.id === selectedClip.id;
                return (
                  <div
                    key={clip.id}
                    onClick={() => handleSelectClip(clip)}
                    className={`p-3.5 rounded-2xl cursor-pointer border transition duration-200 relative group ${
                      isSelected
                        ? 'bg-zinc-900 border-indigo-500/80 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/50'
                        : 'bg-zinc-900/60 hover:bg-zinc-850 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      {/* Virality score badge */}
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/15 to-red-500/15 border border-amber-500/30 text-amber-300 text-xs font-black">
                        <Flame className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{clip.viralityScore}/100</span>
                      </div>

                      <span className="font-mono text-[11px] text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {clip.formattedTime} ({clip.duration}s)
                      </span>
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300 transition line-clamp-1 mb-1">
                      {clip.title}
                    </h3>

                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-2">
                      {clip.hookReason}
                    </p>

                    {/* Headline Banner pill preview */}
                    <div className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide bg-yellow-400/15 text-yellow-300 border border-yellow-400/30">
                      {clip.headlineBanner}
                    </div>

                    {/* Quick export button inside card */}
                    <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-indigo-400 font-semibold flex items-center gap-1">
                        {clip.hookType}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadClipCut(clip);
                          }}
                          disabled={downloadingClipId === clip.id}
                          title="Download exact moving video clip with synchronized audio (MP4)"
                          className="text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold flex items-center gap-1 transition"
                        >
                          {downloadingClipId === clip.id ? (
                            <div className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Film className="w-3 h-3 text-emerald-400" />
                          )}
                          <span>Download MP4 Clip</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartExport(clip);
                          }}
                          className="text-zinc-400 hover:text-indigo-400 text-[11px] font-medium flex items-center gap-1 transition"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          <span>9:16 Short</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CENTER COLUMN: 9:16 Video Player & Stage (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col items-center">
            <VideoPlayerView
              clip={selectedClip}
              settings={settings}
              videoId={project.id}
              videoTitle={project.title}
              thumbnailUrl={project.thumbnailUrl}
              videoFileUrl={project.videoFileUrl}
              videoFileName={project.videoFileName}
              onAttachVideoFile={handleAttachVideoFile}
              onAttachStream={handleAttachStream}
              onUpdateHeadline={handleUpdateHeadline}
              onOneClickExport={(vEl) => handleStartExport(selectedClip)}
              isExporting={isExporting}
              videoRef={videoRef}
              onDownloadOriginal={handleDownloadOriginalVideo}
              onDownloadClip={handleDownloadClipCut}
              isDownloadingClip={downloadingClipId === selectedClip.id}
            />
          </div>

          {/* RIGHT COLUMN: Customization, AI Tools & Social Kit (4 Cols) */}
          <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-5">
            {/* Inspector Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setInspectorTab('style')}
                className={`flex items-center gap-1.5 pb-1 border-b-2 transition ${
                  inspectorTab === 'style'
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-indigo-400" />
                <span>Captions & Style</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('ai')}
                className={`flex items-center gap-1.5 pb-1 border-b-2 transition ${
                  inspectorTab === 'ai'
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                <span>AI Rewriter</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('social')}
                className={`flex items-center gap-1.5 pb-1 border-b-2 transition ${
                  inspectorTab === 'social'
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Post Kit</span>
              </button>
            </div>

            {/* TAB 1: Caption Style & Layout Presets */}
            {inspectorTab === 'style' && (
              <div className="space-y-4 text-xs">
                {/* Caption Preset Buttons */}
                <div>
                  <label className="block text-zinc-300 font-bold mb-2">
                    Viral Caption Presets
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'hormozi', name: 'Alex Hormozi', desc: 'Yellow pop keywords' },
                      { id: 'mrbeast', name: 'MrBeast', desc: 'High contrast tilt' },
                      { id: 'neon', name: 'Cyber Neon', desc: 'Glowing cyan shadow' },
                      { id: 'minimal', name: 'Clean Minimal', desc: 'Modern frosted pill' },
                      { id: 'karaoke', name: 'Karaoke Beat', desc: 'Active word bounce' },
                    ].map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            captionStyle: preset.id as CaptionStyle,
                          }))
                        }
                        className={`p-2.5 rounded-xl border text-left transition ${
                          settings.captionStyle === preset.id
                            ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        <div className="font-bold text-zinc-200">{preset.name}</div>
                        <div className="text-[10px] text-zinc-500">{preset.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Video Layout */}
                <div>
                  <label className="block text-zinc-300 font-bold mb-2">
                    Video Layout Preset
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({ ...prev, layoutStyle: 'fill_blur' }))
                      }
                      className={`p-2 rounded-xl border text-left transition ${
                        settings.layoutStyle === 'fill_blur'
                          ? 'bg-indigo-600/15 border-indigo-500 text-white'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-semibold text-zinc-200">Fill & Blur Background</div>
                      <div className="text-[10px] text-zinc-500">Standard 9:16 portrait</div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({ ...prev, layoutStyle: 'split_screen' }))
                      }
                      className={`p-2 rounded-xl border text-left transition ${
                        settings.layoutStyle === 'split_screen'
                          ? 'bg-indigo-600/15 border-indigo-500 text-white'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-semibold text-zinc-200">Split Screen</div>
                      <div className="text-[10px] text-zinc-500">Speaker + B-Roll clip</div>
                    </button>
                  </div>
                </div>

                {/* Highlight Color */}
                <div>
                  <label className="block text-zinc-300 font-bold mb-2">
                    Highlight Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    {['#facc15', '#4ade80', '#22d3ee', '#f97316', '#ec4899', '#a855f7'].map(
                      (color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() =>
                            setSettings((prev) => ({ ...prev, highlightColor: color }))
                          }
                          className={`w-7 h-7 rounded-full border-2 transition transform active:scale-90 ${
                            settings.highlightColor === color
                              ? 'border-white scale-110 shadow-lg'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      )
                    )}
                  </div>
                </div>

                {/* Caption Position */}
                <div>
                  <label className="block text-zinc-300 font-bold mb-1.5">
                    Caption Position
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['top', 'center', 'bottom'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() =>
                          setSettings((prev) => ({ ...prev, captionPosition: pos }))
                        }
                        className={`p-1.5 rounded-lg border text-center capitalize font-semibold transition ${
                          settings.captionPosition === pos
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="pt-2 border-t border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-zinc-200">Hook Headline Banner</div>
                      <div className="text-[10px] text-zinc-500">Display hook pill at top of short</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.showHeadline}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, showHeadline: e.target.checked }))
                      }
                      className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-zinc-200">Progress Bar</div>
                      <div className="text-[10px] text-zinc-500">Animated bottom retention bar</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.showProgressBar}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, showProgressBar: e.target.checked }))
                      }
                      className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    />
                  </div>

                  {/* Channel icon and watermark removed as requested */}
                </div>

                {/* HQ Export Quality & Format Controls */}
                <div className="pt-3 border-t border-zinc-800/80 space-y-3">
                  <label className="block text-zinc-200 font-bold">
                    HQ Video Download Options
                  </label>

                  {/* Format Selection */}
                  <div>
                    <span className="text-[11px] text-zinc-400 block mb-1">Video Format:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSettings((prev) => ({ ...prev, exportFormat: 'mp4' }))}
                        className={`p-2 rounded-xl border text-left transition ${
                          settings.exportFormat === 'mp4'
                            ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="font-bold text-zinc-200 flex items-center justify-between">
                          <span>Universal MP4</span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                            Best
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                          Plays on Windows Media Player, Mac QuickTime, iOS & Android
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSettings((prev) => ({ ...prev, exportFormat: 'webm' }))}
                        className={`p-2 rounded-xl border text-left transition ${
                          settings.exportFormat === 'webm'
                            ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="font-bold text-zinc-200">WebM (VP9)</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                          Web standard container
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Resolution Selection */}
                  <div>
                    <span className="text-[11px] text-zinc-400 block mb-1">
                      Download Quality Resolution:
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSettings((prev) => ({ ...prev, exportQuality: '360p' }))}
                        className={`p-2 rounded-xl border text-center font-bold transition ${
                          settings.exportQuality === '360p'
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-xs">360p</div>
                        <div className="text-[9px] font-normal text-zinc-400">Fast / Mobile</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSettings((prev) => ({ ...prev, exportQuality: '720p' }))}
                        className={`p-2 rounded-xl border text-center font-bold transition ${
                          settings.exportQuality === '720p'
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-xs">720p HD</div>
                        <div className="text-[9px] font-normal text-zinc-300">Standard</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSettings((prev) => ({ ...prev, exportQuality: '1080p' }))}
                        className={`p-2 rounded-xl border text-center font-bold transition ${
                          settings.exportQuality === '1080p'
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-xs text-amber-300 flex items-center justify-center gap-0.5">
                          1080p <span className="text-[9px] font-black bg-amber-500/20 px-1 rounded">HP</span>
                        </div>
                        <div className="text-[9px] font-normal text-zinc-300">Ultra Crisp</div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: AI Caption Rewriter & Translation */}
            {inspectorTab === 'ai' && (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-xl">
                  <div className="flex items-center gap-1.5 font-bold text-purple-300 mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Caption Enhancement
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Translate captions into global languages or optimize phrasing for TikTok and Reels algorithms.
                  </p>
                </div>

                {/* Language Translation Presets */}
                <div>
                  <label className="block text-zinc-300 font-bold mb-2">
                    Translate Subtitle Captions
                  </label>

                  {/* Primary Bangla Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSettings((prev) => ({ ...prev, subtitleLanguage: 'bn' }));
                      handleAiRefine('Translate and adapt the hook headline and all captions into natural, high-retention Bangla (বাংলা লিপি). Use authentic Bengali words and accurate spelling.', 'Bangla');
                    }}
                    disabled={isRefining}
                    className="w-full mb-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-600/25 via-teal-600/25 to-indigo-600/25 hover:from-emerald-600/35 hover:to-indigo-600/35 border-2 border-emerald-500/60 text-emerald-300 font-bold flex items-center justify-between transition disabled:opacity-50 shadow-lg shadow-emerald-950/40 group active:scale-[0.99]"
                  >
                    <span className="flex items-center gap-2.5 text-xs sm:text-sm">
                      <span className="text-base">🇧🇩</span>
                      <span>বাংলা সাবটাইটেল (Translate to Bangla)</span>
                    </span>
                    <span className="text-[10px] bg-emerald-500/25 text-emerald-200 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono font-semibold">
                      1-Click Bangla
                    </span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'Spanish', lang: 'Spanish' },
                      { name: 'Hindi', lang: 'Hindi' },
                      { name: 'French', lang: 'French' },
                      { name: 'German', lang: 'German' },
                      { name: 'Japanese', lang: 'Japanese' },
                      { name: 'Portuguese', lang: 'Portuguese' },
                    ].map((item) => (
                      <button
                        key={item.lang}
                        type="button"
                        onClick={() => handleAiRefine(`Translate captions to ${item.lang}`, item.lang)}
                        disabled={isRefining}
                        className="p-2 rounded-xl bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-medium flex items-center justify-between transition disabled:opacity-50"
                      >
                        <span>{item.name}</span>
                        <Languages className="w-3.5 h-3.5 text-zinc-500" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Viral Refinement Presets */}
                <div className="space-y-2">
                  <label className="block text-zinc-300 font-bold mb-1">
                    AI Hook Polish
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAiRefine('Make headline and captions more dramatic and punchy with emotional emojis')}
                    disabled={isRefining}
                    className="w-full p-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Make Hooks 10x More Punchy</span>
                  </button>
                </div>

                {refineSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center font-medium">
                    ✓ AI Captions & Hook Updated!
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Social Media Post Kit */}
            {inspectorTab === 'social' && (
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between text-zinc-300 font-bold mb-1">
                    <span>YouTube Shorts Title:</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(selectedClip.socialKit.youtubeTitle)}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-200 leading-relaxed">
                    {selectedClip.socialKit.youtubeTitle}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-zinc-300 font-bold mb-1">
                    <span>Instagram / TikTok Caption:</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(selectedClip.socialKit.instagramCaption)}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-200 leading-relaxed">
                    {selectedClip.socialKit.instagramCaption}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-zinc-300 font-bold mb-1">
                    <span>Viral Hashtags:</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(selectedClip.socialKit.hashtags.join(' '))}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 text-indigo-300 font-mono text-[11px] leading-relaxed">
                    {selectedClip.socialKit.hashtags.join(' ')}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-zinc-300 font-bold mb-1">
                    <span>Pinned Hook Comment:</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(selectedClip.socialKit.hookPinnedComment)}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-200 leading-relaxed">
                    {selectedClip.socialKit.hookPinnedComment}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        clip={selectedClip}
        settings={settings}
        videoTitle={project.title}
        channelAuthor={project.author}
        sourceUrl={project.url}
        isExporting={isExporting}
        exportProgress={exportProgress}
        exportStatus={exportStatus}
        exportResult={exportResult}
        onReExport={(newQuality) => {
          setSettings((prev) => ({ ...prev, exportQuality: newQuality }));
          handleStartExport(selectedClip, newQuality);
        }}
      />

      {/* YouTube Bot Verification & Cookie / Video Upload Modal */}
      <CookieModal
        isOpen={isCookieModalOpen}
        onClose={() => setIsCookieModalOpen(false)}
        onAttachFile={(file) => {
          handleAttachVideoFile(file);
          setTimeout(() => handleStartExport(selectedClip), 300);
        }}
        onCookiesSaved={() => {
          handleStartExport(selectedClip);
        }}
      />
    </div>
  );
};
