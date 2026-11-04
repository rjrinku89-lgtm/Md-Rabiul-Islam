import React from 'react';
import { Sparkles, Video, Flame, ShieldCheck, Zap, ArrowRight, RefreshCw, Download } from 'lucide-react';

interface HeaderProps {
  onNewProject: () => void;
  activeProjectTitle?: string;
  hasActiveProject: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onNewProject,
  activeProjectTitle,
  hasActiveProject,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="h-full w-full rounded-[11px] bg-zinc-950 flex items-center justify-center">
              <Video className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-white tracking-tight">
                Kixy<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">Clip</span>
              </span>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> 100% Free • Unlimited
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              Turn YouTube videos, uploaded files & text scripts into viral 9:16 Shorts
            </p>
          </div>
        </div>

        {/* Center status for active project */}
        {hasActiveProject && activeProjectTitle && (
          <div className="hidden md:flex items-center gap-2 max-w-sm truncate text-xs text-zinc-300 bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="truncate">{activeProjectTitle}</span>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 text-xs bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 rounded-lg">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Virality Engine</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="font-medium text-emerald-400">$0</span> / month
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-300 font-medium">∞ Credits</span>
          </div>

          {hasActiveProject && (
            <button
              onClick={onNewProject}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-semibold flex items-center gap-2 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
              New Video
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
