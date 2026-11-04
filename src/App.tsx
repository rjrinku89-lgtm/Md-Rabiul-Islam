/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UrlInputSection } from './components/UrlInputSection';
import { ShortsStudio } from './components/ShortsStudio';
import { VideoProject } from './types';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Video,
  Flame,
  CheckCircle,
  HelpCircle,
  Layers,
  FileText,
  Download,
} from 'lucide-react';

export default function App() {
  const [project, setProject] = useState<VideoProject | null>(() => {
    try {
      const saved = localStorage.getItem('kixyclip_active_project');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync active project to localStorage
  useEffect(() => {
    if (project) {
      try {
        localStorage.setItem('kixyclip_active_project', JSON.stringify(project));
      } catch (e) {
        // ignore quota error
      }
    }
  }, [project]);

  const handleProcessVideo = async (
    url: string,
    topicFocus: string,
    clipLength: string
  ) => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      setLoadingStep('Connecting to YouTube and extracting metadata...');

      // Step 1: Request extraction from backend
      const res = await fetch('/api/extract-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, topicFocus, clipLength }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to process YouTube video');
      }

      setLoadingStep('AI analyzing transcript & virality moments...');
      const data: VideoProject = await res.json();

      setLoadingStep('Generating 9:16 vertical shorts and captions...');
      setProject(data);
    } catch (err: any) {
      console.error('Processing error:', err);
      setErrorMsg(err.message || 'Something went wrong while processing the video.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleProcessUploadedVideo = async (
    file: File,
    topicFocus: string,
    clipLength: string
  ) => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      setLoadingStep(`Uploading "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB)...`);

      const cleanFilename = `upload_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9_\-\.]/g, '_')}`;

      // Upload file directly to server
      const uploadRes = await fetch(`/api/upload-video?filename=${encodeURIComponent(cleanFilename)}`, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'video/mp4' },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload video file to server');
      }

      setLoadingStep('Probing video stream & extracting thumbnail frames...');

      // Analyze uploaded video and detect viral clips
      const analyzeRes = await fetch('/api/analyze-uploaded-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: cleanFilename,
          title: file.name.replace(/\.[^/.]+$/, ''),
          topicFocus,
          clipLength,
        }),
      });

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to analyze uploaded video');
      }

      setLoadingStep('Generating clips, animated captions & virality breakdown...');
      const projectData: VideoProject = await analyzeRes.json();
      setProject(projectData);
    } catch (err: any) {
      console.error('Video upload processing error:', err);
      setErrorMsg(err.message || 'Something went wrong while processing your uploaded video.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleProcessTextToShort = async (
    prompt: string,
    voiceName: string,
    style: string,
    targetDuration: number
  ) => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      setLoadingStep('AI writing high-retention viral script & hooks...');

      const res = await fetch('/api/text-to-short', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          voiceName,
          style,
          targetDuration,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate text-to-short video');
      }

      setLoadingStep('Generating AI narration voiceover & rendering 9:16 vertical video...');
      const projectData: VideoProject = await res.json();
      setProject(projectData);
    } catch (err: any) {
      console.error('Text-to-Short error:', err);
      setErrorMsg(err.message || 'Failed to generate AI short video from text prompt.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleProcessCartoonVideo = async (options: {
    prompt: string;
    characterId?: string;
    sceneId?: string;
    voiceName?: string;
    bgMusicTrack?: string;
    bgMusicVolume?: number;
    targetDuration?: number;
  }) => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      setLoadingStep('AI writing cartoon storyline & character dialogue...');

      const res = await fetch('/api/generate-cartoon-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate cartoon video');
      }

      setLoadingStep('Synthesizing character voiceover, animating 9:16 scenes & mixing BGM...');
      const projectData: VideoProject = await res.json();
      setProject(projectData);
    } catch (err: any) {
      console.error('Cartoon video generation error:', err);
      setErrorMsg(err.message || 'Failed to generate cartoon video from script.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleNewProject = () => {
    setProject(null);
    localStorage.removeItem('kixyclip_active_project');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navigation */}
      <Header
        onNewProject={handleNewProject}
        hasActiveProject={!!project}
        activeProjectTitle={project?.title}
      />

      {/* Main Body */}
      <main className="flex-1">
        {errorMsg && (
          <div className="max-w-4xl mx-auto mt-4 px-4">
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex items-center justify-between">
              <span>{errorMsg}</span>
              <button
                onClick={() => setErrorMsg(null)}
                className="text-red-400 hover:text-white font-bold ml-3"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {project ? (
          <ShortsStudio
            project={project}
            onUpdateProject={setProject}
          />
        ) : (
          <div className="space-y-12 pb-16">
            <UrlInputSection
              onProcessVideo={handleProcessVideo}
              onProcessUploadedVideo={handleProcessUploadedVideo}
              onProcessTextToShort={handleProcessTextToShort}
              onProcessCartoonVideo={handleProcessCartoonVideo}
              isLoading={isLoading}
              loadingStep={loadingStep}
            />

            {/* Feature Highlights Grid */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="text-center space-y-2 mb-8">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Why Creators Use KixyClip AI
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Built to streamline editing like Kixy.ai and Opus Clip, but 100% free with unlimited personal use.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-indigo-500/40 transition space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Flame className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    Virality Hook Detection
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    AI scans the entire long video to pinpoint the exact 30-50 second segments with high retention, emotional resonance, and contrarian truth hooks.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-indigo-500/40 transition space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    Dynamic Karaoke Captions
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    One click applies Alex Hormozi, MrBeast, and Neon glowing styled subtitles with bouncing active word highlights, 100% synced to speech.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-indigo-500/40 transition space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    100% Free & Unlimited Exports
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    No monthly subscription fees, no credit tokens, and no forced watermarks. Export unlimited high-definition 9:16 videos and SRT subtitle files.
                  </p>
                </div>
              </div>
            </div>

            {/* Step-by-Step Workflow Preview */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 space-y-6">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  <Zap className="w-4 h-4" /> 3-Step Streamlined Workflow
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 text-white font-black text-sm flex items-center justify-center">
                      1
                    </div>
                    <h4 className="text-sm font-bold text-white">Paste YouTube Link</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Enter any YouTube URL (interview, podcast, tutorial, or speech).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-sm flex items-center justify-center">
                      2
                    </div>
                    <h4 className="text-sm font-bold text-white">AI Extracts & Summarizes</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Gemini produces comprehensive takeaways and cuts 4-6 viral short candidates.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black text-sm flex items-center justify-center">
                      3
                    </div>
                    <h4 className="text-sm font-bold text-white">1-Click Export Short</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Download HD 9:16 vertical video with captions, plus ready-to-post hashtags.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-400">KixyClip AI</span>
            <span>•</span>
            <span className="text-emerald-400 font-medium">Free Personal Edition</span>
            <span>•</span>
            <span>Unlimited Video Summaries & Exports</span>
          </div>

          <div className="flex items-center gap-4 text-zinc-500">
            <span>No Subscription</span>
            <span>•</span>
            <span>Zero Watermark</span>
            <span>•</span>
            <span>Instant In-Browser Render</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
