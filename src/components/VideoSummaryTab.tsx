import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Quote,
  Target,
  Sparkles,
  Bookmark,
  Clock,
  Play,
  ArrowRight,
  Download,
} from 'lucide-react';
import { VideoProject, VideoChapter } from '../types';

interface VideoSummaryTabProps {
  project: VideoProject;
  onJumpToTimestamp?: (seconds: number) => void;
  onCreateClipFromChapter?: (chapter: VideoChapter) => void;
}

export const VideoSummaryTab: React.FC<VideoSummaryTabProps> = ({
  project,
  onJumpToTimestamp,
  onCreateClipFromChapter,
}) => {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const summary = project.summary;

  const handleCopyAll = () => {
    const text = `# ${project.title} - Video Summary & Key Takeaways
Author: ${project.author}
Category: ${summary.category}
Target Audience: ${summary.targetAudience}

## Executive Overview
${summary.overview}

## Key Takeaways
${summary.keyTakeaways.map((t, i) => `${i + 1}. ${t}`).join('\n')}

## Notable Quote
${summary.notableQuote}

## Chapters
${summary.chapters.map((c) => `- [${c.timestamp}] ${c.title}: ${c.summary}`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopyTakeaway = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  const parseTimestampToSeconds = (ts: string) => {
    const parts = ts.split(':').map((p) => parseInt(p, 10));
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in py-4">
      {/* Top Banner with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Full Video Summary & Intelligence
            </h2>
            <p className="text-xs text-zinc-400">
              Extracted automatically by AI • Free unlimited summaries
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyAll}
          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-2 border border-zinc-700 transition"
        >
          {copiedAll ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
          <span>{copiedAll ? 'Summary Copied!' : 'Copy Full Summary'}</span>
        </button>
      </div>

      {/* Grid: Overview & Quote */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Executive Overview */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" /> Executive Overview
          </div>
          <p className="text-sm text-zinc-200 leading-relaxed font-normal">
            {summary.overview}
          </p>

          <div className="pt-4 border-t border-zinc-800/80 flex flex-wrap gap-4 text-xs">
            <div>
              <span className="text-zinc-500 block">Category</span>
              <span className="text-zinc-300 font-semibold">{summary.category || 'General'}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Target Audience</span>
              <span className="text-zinc-300 font-semibold">{summary.targetAudience}</span>
            </div>
          </div>
        </div>

        {/* Notable Golden Quote */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-zinc-900 border border-indigo-800/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">
              <Quote className="w-4 h-4" /> Viral Quote Highlight
            </div>
            <p className="text-sm font-semibold text-zinc-100 italic leading-relaxed">
              {summary.notableQuote}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-indigo-900/40 text-xs text-zinc-400 flex items-center justify-between">
            <span>By {project.author}</span>
            <span className="text-[10px] text-indigo-400 font-medium bg-indigo-500/10 px-2 py-0.5 rounded-full">
              High Hook Potential
            </span>
          </div>
        </div>
      </div>

      {/* Key Takeaways */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <Bookmark className="w-4 h-4" /> Key Insights & Takeaways
          </div>
          <span className="text-xs text-zinc-500">{summary.keyTakeaways.length} Key Points</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {summary.keyTakeaways.map((takeaway, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-start justify-between gap-3 group hover:border-zinc-700 transition"
            >
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-xs sm:text-sm text-zinc-300 leading-snug">
                  {takeaway}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCopyTakeaway(takeaway, idx)}
                title="Copy takeaway"
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
              >
                {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Timestamped Chapters Breakdown */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
            <Clock className="w-4 h-4" /> Timestamped Chapter Breakdown
          </div>
          <span className="text-xs text-zinc-500">Auto-generated chapters</span>
        </div>

        <div className="space-y-2">
          {summary.chapters.map((chapter, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-700 transition"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                  {chapter.timestamp}
                </span>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-white">
                    {chapter.title}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {chapter.summary}
                  </p>
                </div>
              </div>

              {onCreateClipFromChapter && (
                <button
                  type="button"
                  onClick={() => onCreateClipFromChapter(chapter)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 self-start sm:self-auto transition shrink-0"
                >
                  <Play className="w-3 h-3 text-cyan-400 fill-cyan-400" />
                  <span>Make Short</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
