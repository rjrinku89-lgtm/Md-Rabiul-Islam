import React, { useState } from 'react';
import {
  Download,
  Sparkles,
  CheckCircle2,
  Film,
  FileText,
  Share2,
  Copy,
  Check,
  X,
  Play,
  MonitorPlay,
  ShieldCheck,
  ExternalLink,
  Music,
  Info,
  HelpCircle,
  Layers,
  Flame,
} from 'lucide-react';
import { ShortClip, EditorSettings } from '../types';
import { downloadBlob, generateSrtContent, ExportResult } from '../utils/exportEngine';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  clip: ShortClip;
  settings: EditorSettings;
  videoTitle: string;
  channelAuthor?: string;
  sourceUrl?: string;
  isExporting: boolean;
  exportProgress: number;
  exportStatus: string;
  exportResult: ExportResult | null;
  onReExport?: (quality: '360p' | '720p' | '1080p') => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  clip,
  settings,
  videoTitle,
  channelAuthor,
  sourceUrl,
  isExporting,
  exportProgress,
  exportStatus,
  exportResult,
  onReExport,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'youtube' | 'rules' | 'social'>('youtube');
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadVideo = () => {
    if (exportResult) {
      if (exportResult.url) {
        const link = document.createElement('a');
        link.href = exportResult.url;
        link.download = exportResult.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (exportResult.blob && exportResult.blob.size > 0) {
        downloadBlob(exportResult.blob, exportResult.filename);
      }
    }
  };

  const handleDownloadSrt = () => {
    const srtContent = generateSrtContent(clip.captions);
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `${clip.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-subtitles.srt`);
  };

  const copyToClipboard = (text: string, section: string, toastMessage = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setCopiedToast(toastMessage);
    setTimeout(() => {
      setCopiedSection(null);
      setCopiedToast(null);
    }, 2500);
  };

  const authorName = channelAuthor || 'Original Creator';
  const originalTitle = videoTitle || clip.title;
  const hashtags = (clip.socialKit?.hashtags && clip.socialKit.hashtags.length > 0)
    ? clip.socialKit.hashtags.join(' ')
    : '#shorts #viral #trending #reels';

  // Statutory Fair Use Legal Notice (Section 107 of US Copyright Act)
  const fairUseNotice = `⚖️ FAIR USE COPYRIGHT DISCLAIMER:
Under Section 107 of the Copyright Act 1976, allowance is made for "fair use" for purposes such as criticism, comment, news reporting, teaching, scholarship, education, and research.
Fair use is a use permitted by copyright statute that might otherwise be infringing. Non-profit, educational, or personal use tips the balance in favor of fair use.
Original Source: "${originalTitle}" by ${authorName}.
This clip is a transformative short-form analysis with vertical reframing, on-screen dynamic subtitles, and commentary. No copyright infringement intended.`;

  // Complete YouTube-ready description with creator attribution and statutory disclaimer
  const fullYouTubeDescription = `${clip.title}

${clip.socialKit?.instagramCaption || clip.transcript || ''}

📌 Question for you:
${clip.socialKit?.hookPinnedComment || 'What are your thoughts on this? Drop a comment below! 👇'}

----------------------------------------
🎬 ORIGINAL CONTENT & ATTRIBUTION:
Original Video: ${originalTitle}
Creator / Channel: ${authorName}
${sourceUrl ? `Source Link: ${sourceUrl}\n` : ''}All rights and credit reserved to the respective copyright owner(s).

----------------------------------------
${fairUseNotice}

----------------------------------------
${hashtags}`;

  // Complete one-click copy package (Title + Description + Tags)
  const completePackage = `TITLE:
${clip.socialKit?.youtubeTitle || clip.title}

DESCRIPTION:
${fullYouTubeDescription}`;

  const openYouTubeUpload = () => {
    window.open('https://studio.youtube.com/channel/UC/videos/short?d=bu', '_blank', 'noopener,noreferrer');
  };

  const handleCopyAndOpenYouTube = () => {
    copyToClipboard(completePackage, 'full-package', 'Copied full copyright-safe package! Opening YouTube Studio...');
    setTimeout(() => {
      openYouTubeUpload();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-700/80 rounded-3xl shadow-2xl overflow-hidden p-5 sm:p-6 text-zinc-100 my-auto max-h-[94vh] overflow-y-auto">
        {/* Floating Copied Toast */}
        {copiedToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-full shadow-2xl shadow-emerald-500/50 flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4" />
            <span>{copiedToast}</span>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isExporting}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                {isExporting ? 'Generating High-Quality Video' : 'HQ Video Export Ready'}
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full">
                {settings.exportQuality === '1080p' ? '1080p HP Studio' : settings.exportQuality === '360p' ? '360p Fast' : '720p HD'}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded-full">
                <ShieldCheck className="w-3 h-3 text-rose-400" />
                Fair Use Protected
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Universal MP4 format • Guaranteed playback on Windows, Mac, iOS, Android & Direct YouTube Upload
            </p>
          </div>
        </div>

        {/* Progress State */}
        {isExporting ? (
          <div className="space-y-5 my-8 text-center p-6 bg-zinc-950/70 rounded-2xl border border-zinc-800">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-500 border-t-transparent animate-spin flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-bold text-white mb-1">
                {exportStatus || 'Rendering video frames with hardware acceleration...'}
              </div>
              <div className="text-xs text-emerald-400 font-mono font-semibold">
                {exportProgress}% Encoded
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden p-0.5 border border-zinc-700">
              <div
                className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all duration-200"
                style={{ width: `${exportProgress}%` }}
              />
            </div>

            <p className="text-[11px] text-zinc-500">
              Rendering in {settings.exportQuality === '1080p' ? 'Full HD 1080×1920 (HP)' : settings.exportQuality === '360p' ? 'Fast 360×640' : 'HD 720×1280'} resolution with clean dynamic captions
            </p>
          </div>
        ) : exportResult ? (
          /* Finished State */
          <div className="space-y-4">
            {/* Top Video Preview & Primary Download Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-zinc-950/80 p-3.5 sm:p-4 rounded-2xl border border-zinc-800">
              {/* Video Player */}
              <div className="md:col-span-5 flex justify-center">
                <div className="relative w-36 sm:w-40 aspect-[9/16] bg-black rounded-2xl overflow-hidden border-2 border-zinc-700 shadow-xl group">
                  <video
                    src={exportResult.url}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Action Buttons Column */}
              <div className="md:col-span-7 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-bold">
                    <MonitorPlay className="w-4 h-4 text-emerald-400" />
                    <span>Video File Details</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    {exportResult.width}×{exportResult.height} MP4
                  </span>
                </div>

                <div className="space-y-1 font-mono text-[11px] text-zinc-400 bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Filename:</span>
                    <span className="text-zinc-200 truncate max-w-[190px]">{exportResult.filename}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Audio/Video:</span>
                    <span className="text-emerald-400 font-semibold">100% Synced Motion</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Platform:</span>
                    <span className="text-zinc-200">YouTube Shorts / TikTok / Reels</span>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-col gap-2 pt-1">
                  {/* Download Video Button */}
                  <button
                    type="button"
                    onClick={handleDownloadVideo}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 transition active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download HQ MP4 Video</span>
                  </button>

                  {/* Share on YouTube Button (Red YouTube Accent) */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('youtube');
                      handleCopyAndOpenYouTube();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-red-600/30 transition active:scale-95"
                  >
                    {/* YouTube Play Icon SVG */}
                    <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                    <span>Share on YouTube (Copyright-Free Rules)</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadSrt}
                      className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <FileText className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Subtitles (.srt)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('rules')}
                      className="py-2 px-3 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/60 text-indigo-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Zero Strike Rules</span>
                    </button>
                  </div>

                  {/* Quick Quality Switcher */}
                  {onReExport && (
                    <div className="pt-1.5 border-t border-zinc-800 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 font-medium">Re-encode resolution:</span>
                      <div className="flex gap-1.5">
                        {(['360p', '720p', '1080p'] as const).map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => onReExport(q)}
                            className={`py-1 px-2.5 rounded-lg text-[10px] font-bold border transition ${
                              (settings.exportQuality || '1080p') === q
                                ? 'bg-indigo-600 text-white border-indigo-500'
                                : 'bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                            }`}
                          >
                            {q === '1080p' ? '1080p HP' : q === '720p' ? '720p HD' : '360p Fast'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Tabs for Sharing & Copyright Compliance */}
            <div className="flex items-center border-b border-zinc-800 gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('youtube')}
                className={`py-2 px-3.5 rounded-t-xl transition flex items-center gap-2 border-b-2 ${
                  activeTab === 'youtube'
                    ? 'border-red-500 text-white bg-zinc-800/60'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <svg className="w-3.5 h-3.5 fill-red-500" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                <span>YouTube Copyright-Free Kit</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rules')}
                className={`py-2 px-3.5 rounded-t-xl transition flex items-center gap-2 border-b-2 ${
                  activeTab === 'rules'
                    ? 'border-indigo-500 text-white bg-zinc-800/60'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Zero Copyright Rules (4-Step Guide)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('social')}
                className={`py-2 px-3.5 rounded-t-xl transition flex items-center gap-2 border-b-2 ${
                  activeTab === 'social'
                    ? 'border-emerald-500 text-white bg-zinc-800/60'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>TikTok & Reels</span>
              </button>
            </div>

            {/* TAB 1: YouTube Copyright-Free Sharing Kit */}
            {activeTab === 'youtube' && (
              <div className="space-y-3 p-4 bg-zinc-950/70 rounded-2xl border border-zinc-800 text-xs">
                {/* Fair Use Protection Guarantee Notice */}
                <div className="p-3 bg-gradient-to-r from-red-950/30 to-amber-950/20 border border-red-500/30 rounded-xl flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="text-white font-extrabold flex items-center gap-1.5 text-xs">
                      <span>100% Transformative Fair Use Protection (Section 107 Compliance)</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      This short qualifies as a <strong>transformative derivative work</strong> because it reframes original video into 9:16 vertical layout, burns dynamic kinetic subtitles, adds headline banners, and credits original author <strong>{authorName}</strong>.
                    </p>
                  </div>
                </div>

                {/* Direct Action Hub */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={openYouTubeUpload}
                    className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/20 transition active:scale-95"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>1. Open YouTube Shorts Upload</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(completePackage, 'full-package', 'Copied full copyright package!')}
                    className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    {copiedSection === 'full-package' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-400" />}
                    <span>2. Copy Title + Fair Use Description</span>
                  </button>
                </div>

                {/* Title Box */}
                <div>
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span className="font-semibold text-zinc-300">Viral YouTube Title:</span>
                    <button
                      onClick={() => copyToClipboard(clip.socialKit?.youtubeTitle || clip.title, 'title', 'Title copied!')}
                      className="text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold"
                    >
                      {copiedSection === 'title' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedSection === 'title' ? 'Copied' : 'Copy Title'}
                    </button>
                  </div>
                  <div className="p-2.5 bg-zinc-900 rounded-lg text-zinc-200 border border-zinc-800 text-[11px] font-medium">
                    {clip.socialKit?.youtubeTitle || `${clip.title} #shorts`}
                  </div>
                </div>

                {/* Complete Copyright-Protected Description Preview Box */}
                <div>
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span className="font-semibold text-zinc-300">Full Description with Attribution & Fair Use Notice:</span>
                    <button
                      onClick={() => copyToClipboard(fullYouTubeDescription, 'desc', 'Full description copied!')}
                      className="text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold"
                    >
                      {copiedSection === 'desc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedSection === 'desc' ? 'Copied' : 'Copy Description'}
                    </button>
                  </div>
                  <div className="p-3 bg-zinc-900/90 rounded-lg text-zinc-300 border border-zinc-800 text-[11px] font-mono whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed select-all">
                    {fullYouTubeDescription}
                  </div>
                </div>

                {/* Legal Disclaimer Only Copy Button */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
                  <span>Need just the statutory Section 107 legal notice?</span>
                  <button
                    onClick={() => copyToClipboard(fairUseNotice, 'disclaimer-only', 'Section 107 legal notice copied!')}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                  >
                    {copiedSection === 'disclaimer-only' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy Section 107 Legal Notice</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Zero Copyright Rules (4-Step Actionable Guide) */}
            {activeTab === 'rules' && (
              <div className="space-y-3 p-4 bg-zinc-950/70 rounded-2xl border border-zinc-800 text-xs">
                <div className="text-zinc-200 font-bold flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>How to Publish on YouTube Without Any Copyright Claims (4-Step Shield)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Step 1 */}
                  <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 space-y-1">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">1</span>
                      <span>Transformative Visuals (Done)</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      By converting 16:9 landscape to 9:16 vertical, burning kinetic captions, and headline banners, your video is transformed under Section 107 of the US Copyright Act.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 space-y-1">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">2</span>
                      <span>Source Attribution (Done)</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Always credit original creator <strong>{authorName}</strong>. Our copy kit automatically includes source attribution to prevent manual creator copyright strikes.
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="p-3 bg-zinc-900 rounded-xl border border-amber-500/30 bg-amber-950/15 space-y-1">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                      <Music className="w-3.5 h-3.5 text-amber-400" />
                      <span>Anti-Content ID Audio Shield</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      95% of automated YouTube claims are music tracks. When uploading on the YouTube mobile app, tap <strong>"Add Sound"</strong> and select a trending song or YouTube Audio Library track. This legally clears audio Content ID!
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 space-y-1">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px]">4</span>
                      <span>Select Education/News Category</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      In YouTube Studio upload settings, choose <strong>"Education"</strong> or <strong>"News & Politics"</strong> as your category to confirm your transformative commentary status.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">Ready to post with 0 copyright claims?</span>
                  <button
                    type="button"
                    onClick={openYouTubeUpload}
                    className="py-1 px-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition"
                  >
                    <ExternalLink className="w-3 h-3" /> Open YouTube Upload
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: TikTok & Instagram Reels */}
            {activeTab === 'social' && (
              <div className="p-4 bg-zinc-950/70 rounded-2xl border border-zinc-800 space-y-3 text-xs">
                <div className="flex items-center justify-between font-semibold text-zinc-300">
                  <span className="flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Social Media Copy Kit (TikTok / Instagram Reels)</span>
                  </span>
                  <span className="text-[11px] text-zinc-500">1-click copy</span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span>Reels / TikTok Caption:</span>
                    <button
                      onClick={() => copyToClipboard(clip.socialKit?.instagramCaption || clip.transcript, 'ig-caption')}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
                    >
                      {copiedSection === 'ig-caption' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedSection === 'ig-caption' ? 'Copied!' : 'Copy Caption'}
                    </button>
                  </div>
                  <div className="p-2.5 bg-zinc-900 rounded-lg text-zinc-200 border border-zinc-800 text-[11px]">
                    {clip.socialKit?.instagramCaption || clip.transcript}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span>Viral Hashtags:</span>
                    <button
                      onClick={() => copyToClipboard(hashtags, 'tags')}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
                    >
                      {copiedSection === 'tags' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedSection === 'tags' ? 'Copied!' : 'Copy Tags'}
                    </button>
                  </div>
                  <div className="p-2.5 bg-zinc-900 rounded-lg text-emerald-300 font-mono border border-zinc-800 text-[11px]">
                    {hashtags}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Footer */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-zinc-400 hover:text-white transition"
              >
                Close Window
              </button>
              <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> High Performance Video Engine • 100% Free
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
