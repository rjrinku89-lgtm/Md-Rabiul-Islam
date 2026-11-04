import React, { useState, useRef, useEffect } from 'react';
import {
  Youtube,
  Sparkles,
  Wand2,
  Clock,
  Play,
  Pause,
  Upload,
  Mic,
  Palette,
  Volume2,
  Lightbulb,
  X,
  Flame,
  Film,
  Music,
  Smile,
  CheckCircle2,
  MapPin,
  Bot,
  Compass,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';
import { SAMPLE_VIDEOS, SampleVideo } from '../data/sampleVideos';

interface UrlInputSectionProps {
  onProcessVideo: (url: string, topicFocus: string, clipLength: string) => void;
  onProcessUploadedVideo: (file: File, topicFocus: string, clipLength: string) => void;
  onProcessTextToShort: (
    prompt: string,
    voiceName: string,
    style: string,
    targetDuration: number
  ) => void;
  onProcessCartoonVideo?: (options: {
    prompt: string;
    characterId?: string;
    sceneId?: string;
    voiceName?: string;
    bgMusicTrack?: string;
    bgMusicVolume?: number;
    targetDuration?: number;
  }) => void;
  isLoading: boolean;
  loadingStep: string;
}

export const UrlInputSection: React.FC<UrlInputSectionProps> = ({
  onProcessVideo,
  onProcessUploadedVideo,
  onProcessTextToShort,
  onProcessCartoonVideo,
  isLoading,
  loadingStep,
}) => {
  const [creationMode, setCreationMode] = useState<'cartoon' | 'youtube' | 'upload'>('cartoon');

  // Mode 1: YouTube
  const [url, setUrl] = useState('');
  const [topicFocus, setTopicFocus] = useState('Best viral hooks & key takeaways');
  const [clipLength, setClipLength] = useState('30-50 seconds');
  const [showOptions, setShowOptions] = useState(false);
  const [copiedSample, setCopiedSample] = useState<string | null>(null);

  // Mode 2: Upload Video File
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mode 3: AI Cartoon Text-to-Video (Auto-Director by default)
  const [cartoonPrompt, setCartoonPrompt] = useState(
    'A brave lion cub named Leo discovers an ancient secret map inside an enchanted forest. He explains why fear is just excitement without breath.'
  );
  const [isAutoDirector, setIsAutoDirector] = useState(true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState('auto');
  const [selectedScene, setSelectedScene] = useState('auto');
  const [selectedVoice, setSelectedVoice] = useState('auto');
  const [selectedBgm, setSelectedBgm] = useState('auto');
  const [bgmVolume, setBgmVolume] = useState(0.20);
  const [targetDuration, setTargetDuration] = useState(30);

  // Audio Preview State for BGM
  const [previewingTrack, setPreviewingTrack] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
    };
  }, []);

  const toggleBgmAudioPreview = (trackId: string) => {
    if (trackId === 'none') {
      if (audioPreviewRef.current) audioPreviewRef.current.pause();
      setPreviewingTrack(null);
      return;
    }

    if (previewingTrack === trackId) {
      if (audioPreviewRef.current) audioPreviewRef.current.pause();
      setPreviewingTrack(null);
    } else {
      if (!audioPreviewRef.current) {
        audioPreviewRef.current = new Audio();
      }
      audioPreviewRef.current.src = `/audio/bgm/${trackId}.mp3`;
      audioPreviewRef.current.volume = 0.5;
      audioPreviewRef.current.play().catch(() => {});
      setPreviewingTrack(trackId);
    }
  };

  const cartoonCharacters = [
    {
      id: 'char_sparky',
      name: 'Sparky the Robot',
      tagline: 'Curious 3D Cyber-Bot',
      desc: 'Playful tech genius • Explains mysteries & inventions',
      avatar: '/assets/cartoon/char_sparky.jpg',
      defaultVoice: 'Puck',
      badge: 'Popular',
    },
    {
      id: 'char_leo',
      name: 'Leo the Brave',
      tagline: 'Golden Lion Hero',
      desc: 'Inspiring & bold • Motivation, courage & life fables',
      avatar: '/assets/cartoon/char_leo.jpg',
      defaultVoice: 'Puck',
      badge: 'Heroic',
    },
    {
      id: 'char_pip',
      name: 'Professor Pip',
      tagline: 'Wise Scholar Owl',
      desc: 'Golden spectacles • Deep facts, psychology & lessons',
      avatar: '/assets/cartoon/char_pip.jpg',
      defaultVoice: 'Charon',
      badge: 'Genius',
    },
    {
      id: 'char_luna',
      name: 'Luna the Explorer',
      tagline: 'Lilac Star Kitten',
      desc: 'Adventure backpack • Bedtime fables & heartwarming tales',
      avatar: '/assets/cartoon/char_luna.jpg',
      defaultVoice: 'Kore',
      badge: 'Whimsical',
    },
  ];

  const cartoonScenes = [
    {
      id: 'bg_forest',
      name: 'Enchanted Forest',
      vibe: 'Sunbeams, fireflies & glowing trees',
      thumbnail: '/assets/cartoon/bg_forest.jpg',
    },
    {
      id: 'bg_city',
      name: 'Futuristic Cyber City',
      vibe: 'Flying cars, neon signs & sunset glow',
      thumbnail: '/assets/cartoon/bg_city.jpg',
    },
    {
      id: 'bg_space',
      name: 'Cosmic Galaxy Nebula',
      vibe: 'Swirling planetary rings & star dust',
      thumbnail: '/assets/cartoon/bg_space.jpg',
    },
  ];

  const bgmTracks = [
    { id: 'lofi_chill', name: 'Lo-Fi Storybook', desc: 'Warm melodic chord pads & vinyl crackle' },
    { id: 'cinematic_pulse', name: 'Cinematic Adventure', desc: 'Sub-bass pulse & suspenseful drone' },
    { id: 'phonk_energy', name: 'Phonk Energy Beat', desc: 'Driving 808 rhythm & viral retention' },
    { id: 'ambient_piano', name: 'Peaceful Piano', desc: 'Emotional, gentle acoustic melody' },
    { id: 'none', name: 'No Music', desc: 'Clean voiceover narration only' },
  ];

  const voiceOptions = [
    { id: 'Puck', label: 'Puck', gender: 'Male', tone: 'Energetic, punchy & heroic', badge: 'Recommended' },
    { id: 'Charon', label: 'Charon', gender: 'Male', tone: 'Deep, wise & scholarly' },
    { id: 'Kore', label: 'Kore', gender: 'Female', tone: 'Warm, friendly & soothing' },
    { id: 'Fenrir', label: 'Fenrir', gender: 'Male', tone: 'Bold, intense & confident' },
    { id: 'Aoede', label: 'Aoede', gender: 'Female', tone: 'Gentle fairytale storyteller' },
  ];

  const storyIdeas = [
    {
      title: '🦁 Leo: Why 99% Give Up Early',
      char: 'char_leo',
      scene: 'bg_forest',
      voice: 'Puck',
      prompt: 'A brave lion cub named Leo reveals why 99% of people quit right before their big breakthrough, and gives a 2-minute rule to stay unstoppable.',
    },
    {
      title: '🤖 Sparky: How I Built a Flying Car',
      char: 'char_sparky',
      scene: 'bg_city',
      voice: 'Puck',
      prompt: 'Sparky the robot explains how he accidentally invented a floating solar rocket in Cyber City using only old batteries and a microwave!',
    },
    {
      title: '🦉 Pip: 3 Rules of Dark Psychology',
      char: 'char_pip',
      scene: 'bg_space',
      voice: 'Charon',
      prompt: 'Professor Pip reveals 3 subtle body language tricks that diplomats and master negotiators use to tell if someone is being truthful.',
    },
    {
      title: '🐱 Luna: The Starlit Shooting Star',
      char: 'char_luna',
      scene: 'bg_forest',
      voice: 'Kore',
      prompt: 'Luna the lilac kitten finds a tiny fallen star in the glowing forest and goes on an adventure to place it back in the sky.',
    },
    {
      title: '🚀 Cosmic Secret: Why We Dream',
      char: 'char_sparky',
      scene: 'bg_space',
      voice: 'Fenrir',
      prompt: 'Did you know your brain defragments its memories like a supercomputer every time you enter deep sleep? Here is what happens in dreamland.',
    },
  ];

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
      }
    } catch (err) {
      // ignore
    }
  };

  const handleYoutubeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isLoading) return;
    onProcessVideo(url.trim(), topicFocus, clipLength);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile || isLoading) return;
    onProcessUploadedVideo(uploadedFile, topicFocus, clipLength);
  };

  const handleCartoonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cartoonPrompt.trim() || isLoading) return;

    if (onProcessCartoonVideo) {
      onProcessCartoonVideo({
        prompt: cartoonPrompt.trim(),
        characterId: isAutoDirector && !showAdvancedOptions ? 'auto' : selectedCharacter,
        sceneId: isAutoDirector && !showAdvancedOptions ? 'auto' : selectedScene,
        voiceName: isAutoDirector && !showAdvancedOptions ? 'auto' : selectedVoice,
        bgMusicTrack: isAutoDirector && !showAdvancedOptions ? 'auto' : selectedBgm,
        bgMusicVolume: bgmVolume,
        targetDuration: isAutoDirector && !showAdvancedOptions ? undefined : targetDuration,
      });
    } else {
      onProcessTextToShort(
        cartoonPrompt.trim(),
        selectedVoice === 'auto' ? 'Puck' : selectedVoice,
        'cinematic_aura',
        targetDuration
      );
    }
  };

  const handleSelectSample = (sample: SampleVideo) => {
    setUrl(sample.url);
    setCopiedSample(sample.videoId);
    setTimeout(() => setCopiedSample(null), 1500);
    onProcessVideo(sample.url, topicFocus, clipLength);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setUploadedFile(file);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
      {/* Title & Badge */}
      <div className="text-center space-y-3 mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-cyan-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>New Feature • Animated Cartoon Characters, AI Scenes & Full Shorts Studio</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
          Text-to-Video Animation &{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
            Cartoon Shorts Studio
          </span>
        </h1>
        <p className="text-zinc-400 text-xs sm:text-sm max-w-2xl mx-auto">
          Convert any written script into a complete 9:16 vertical animated cartoon short with 3D characters, natural voiceover, scenic backgrounds, and copyright-cleared background music.
        </p>
      </div>

      {/* Main Creation Hub Card */}
      <div className="bg-zinc-900/90 border border-zinc-700/80 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl">
        {/* Top 3-Way Mode Switcher Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-zinc-950 rounded-2xl border border-zinc-800 mb-5">
          <button
            type="button"
            onClick={() => setCreationMode('cartoon')}
            className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition ${
              creationMode === 'cartoon'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white shadow-lg shadow-orange-950'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Smile className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">Text-to-Video (Cartoon)</span>
            <span className="sm:hidden">Cartoon Video</span>
            <span className="hidden md:inline text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 uppercase tracking-wider font-mono">
              AI Scenes
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCreationMode('youtube')}
            className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition ${
              creationMode === 'youtube'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-950'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Youtube className="w-4 h-4 text-red-400" />
            <span className="hidden sm:inline">YouTube to Shorts</span>
            <span className="sm:hidden">YouTube</span>
          </button>

          <button
            type="button"
            onClick={() => setCreationMode('upload')}
            className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition ${
              creationMode === 'upload'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Upload Video File</span>
            <span className="sm:hidden">Upload File</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* MODE 1: AI CARTOON TEXT-TO-VIDEO STUDIO                      */}
        {/* ============================================================ */}
        {creationMode === 'cartoon' && (
          <form onSubmit={handleCartoonSubmit} className="space-y-5">
            {/* Auto-Director Intelligent Overview Banner */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-xs sm:text-sm">AI Auto-Director Enabled</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                      100% Automated
                    </span>
                  </div>
                  <p className="text-zinc-300 text-[11px] sm:text-xs mt-0.5">
                    Just provide your script or text. The AI handles character casting, scenes, animation, voiceover, dynamic duration & music automatically.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <span className="text-[11px] text-zinc-400 font-mono">
                  {cartoonPrompt.trim().split(/\s+/).filter(Boolean).length} words
                </span>
                <span className="text-[11px] text-amber-400 font-bold px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30">
                  ⏱️ ~{Math.max(10, Math.min(85, Math.round(cartoonPrompt.trim().split(/\s+/).filter(Boolean).length / 2.2)))}s Dynamic Duration
                </span>
              </div>
            </div>

            {/* Story & Script Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="text-zinc-200 font-bold flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-amber-400" />
                  <span>Enter Your Story, Script, or Any Text:</span>
                </label>
                <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Dynamic Duration (Matches your exact text length — never fixed!)</span>
                </span>
              </div>

              <div className="relative">
                <textarea
                  value={cartoonPrompt}
                  onChange={(e) => setCartoonPrompt(e.target.value)}
                  placeholder="Type or paste any text, fable, moral lesson, motivational story, or educational explanation (e.g. 'A brave lion cub named Leo discovers an ancient secret map inside an enchanted forest...')..."
                  rows={4}
                  disabled={isLoading}
                  className="w-full bg-zinc-950/90 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 text-xs sm:text-sm rounded-2xl p-4 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition resize-none leading-relaxed shadow-inner"
                />
                {cartoonPrompt && (
                  <button
                    type="button"
                    onClick={() => setCartoonPrompt('')}
                    className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 p-1 rounded-lg bg-zinc-900/60"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* 4 AI Auto-Director Features Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center gap-2">
                  <Smile className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-[11px] font-bold text-white">Auto Characters</div>
                    <div className="text-[9px] text-zinc-400 truncate">Leo, Sparky, Pip, Luna</div>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-[11px] font-bold text-white">Auto 3D Scenes</div>
                    <div className="text-[9px] text-zinc-400 truncate">Forest, Cyber City, Space</div>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <div className="text-[11px] font-bold text-white">AI Voice & Lip-Sync</div>
                    <div className="text-[9px] text-zinc-400 truncate">Animated speech bounce</div>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center gap-2">
                  <Music className="w-4 h-4 text-rose-400 shrink-0" />
                  <div>
                    <div className="text-[11px] font-bold text-white">Copyright-Free BGM</div>
                    <div className="text-[9px] text-zinc-400 truncate">Auto-ducked soundtrack</div>
                  </div>
                </div>
              </div>

              {/* Inspiration Story Prompts */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>1-Click Story Inspirations (Click to test):</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                  {storyIdeas.map((idea, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setCartoonPrompt(idea.prompt);
                        setSelectedCharacter(idea.char);
                        setSelectedScene(idea.scene);
                        setSelectedVoice(idea.voice);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 hover:border-amber-500/50 text-zinc-300 text-[11px] font-medium shrink-0 transition flex items-center gap-1 active:scale-95"
                    >
                      <span>{idea.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Optional Collapsible Advanced Customization Drawer */}
            <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/40">
              <button
                type="button"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-900/60 transition"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                  <span>Customize Characters, Scenes, Voices & Duration (Optional Override)</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                  <span>{showAdvancedOptions ? 'Hide Settings' : 'Expand Settings'}</span>
                  {showAdvancedOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>

              {showAdvancedOptions && (
                <div className="p-4 space-y-4 border-t border-zinc-800/80 bg-zinc-950/70">
                  {/* Step 2: Animated Cartoon Character Picker */}
                  <div className="space-y-2">
                    <label className="text-zinc-200 font-bold text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Smile className="w-4 h-4 text-orange-400" />
                        <span>Select Character (or Leave Auto-Detect):</span>
                      </span>
                      <span className="text-[11px] text-orange-400 font-semibold">Pixar 3D Animated Hero</span>
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {/* Auto Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCharacter('auto');
                          setSelectedVoice('auto');
                        }}
                        className={`p-2 rounded-2xl border text-left transition flex flex-col items-center group relative overflow-hidden ${
                          selectedCharacter === 'auto'
                            ? 'bg-gradient-to-b from-amber-500/20 to-orange-500/10 border-amber-500 shadow-md ring-1 ring-amber-500/40'
                            : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-zinc-700/60 mb-1.5 shadow-md bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white">
                          <Bot className="w-8 h-8" />
                          {selectedCharacter === 'auto' && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        <div className="text-center w-full">
                          <div className="font-extrabold text-white text-[11px] truncate">Auto-Director</div>
                          <div className="text-[9px] text-amber-400 font-medium">Smart AI Cast</div>
                        </div>
                      </button>

                      {cartoonCharacters.map((char) => {
                        const isSelected = selectedCharacter === char.id;
                        return (
                          <button
                            key={char.id}
                            type="button"
                            onClick={() => {
                              setSelectedCharacter(char.id);
                              setSelectedVoice(char.defaultVoice);
                            }}
                            className={`p-2 rounded-2xl border text-left transition flex flex-col items-center group relative overflow-hidden ${
                              isSelected
                                ? 'bg-gradient-to-b from-amber-500/20 to-orange-500/10 border-amber-500 shadow-md ring-1 ring-amber-500/40'
                                : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-zinc-700/60 mb-1.5 shadow-md">
                              <img
                                src={char.avatar}
                                alt={char.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                              {isSelected && (
                                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </div>
                            <div className="text-center w-full">
                              <div className="font-extrabold text-white text-[11px] truncate">{char.name}</div>
                              <div className="text-[9px] text-amber-400 font-medium truncate">{char.tagline}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Scene Environment & Voice Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Scene Selection */}
                    <div className="space-y-2">
                      <label className="text-zinc-200 font-bold text-xs flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-emerald-400" />
                        <span>Choose Scene Background:</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {cartoonScenes.map((scene) => {
                          const isSelected = selectedScene === scene.id;
                          return (
                            <button
                              key={scene.id}
                              type="button"
                              onClick={() => setSelectedScene(scene.id)}
                              className={`p-1.5 rounded-2xl border text-left transition overflow-hidden relative ${
                                isSelected
                                  ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                                  : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                              }`}
                            >
                              <div className="relative aspect-[9/14] rounded-xl overflow-hidden mb-1">
                                <img
                                  src={scene.thumbnail}
                                  alt={scene.name}
                                  className="w-full h-full object-cover"
                                />
                                {isSelected && (
                                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </div>
                              <div className="text-[10px] font-bold text-white truncate px-1">{scene.name}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Voiceover & BGM Controls */}
                    <div className="space-y-3 p-3 bg-zinc-900/60 rounded-2xl border border-zinc-800 text-xs">
                      <div>
                        <label className="text-zinc-300 font-bold mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Mic className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Character Voiceover:</span>
                          </span>
                          <span className="text-[10px] text-cyan-400 font-mono">Gemini TTS</span>
                        </label>
                        <select
                          value={selectedVoice}
                          onChange={(e) => setSelectedVoice(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-zinc-200 text-xs font-semibold focus:outline-none focus:border-cyan-500"
                        >
                          <option value="auto">✨ AI Auto-Voice (Matches Character)</option>
                          {voiceOptions.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.label} ({v.gender} • {v.tone}) {v.badge ? `★ ${v.badge}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Royalty-Free Background Music Selector with Audition Play */}
                      <div className="pt-2 border-t border-zinc-800/80">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-zinc-300 font-bold flex items-center gap-1.5">
                            <Music className="w-3.5 h-3.5 text-rose-400" />
                            <span>Background Soundtrack:</span>
                          </label>
                          <span className="text-[10px] text-zinc-400 font-mono">Vol: {Math.round(bgmVolume * 100)}%</span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedBgm}
                              onChange={(e) => setSelectedBgm(e.target.value)}
                              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-zinc-200 text-xs font-semibold focus:outline-none focus:border-rose-500"
                            >
                              <option value="auto">🎵 AI Auto-Music (Selects based on story mood)</option>
                              {bgmTracks.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} ({t.desc})
                                </option>
                              ))}
                            </select>

                            {/* Audition Play Button */}
                            {selectedBgm !== 'none' && selectedBgm !== 'auto' && (
                              <button
                                type="button"
                                onClick={() => toggleBgmAudioPreview(selectedBgm)}
                                title="Preview background track"
                                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-rose-400 transition"
                              >
                                {previewingTrack === selectedBgm ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Action Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
              <div className="text-xs text-zinc-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span>9:16 Vertical Video (1080×1920) • YouTube Shorts, Reels & TikTok</span>
              </div>

              <button
                type="submit"
                disabled={isLoading || !cartoonPrompt.trim()}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:via-orange-400 hover:to-rose-500 disabled:opacity-50 disabled:pointer-events-none text-white font-black text-sm shadow-xl shadow-orange-900/30 flex items-center justify-center gap-2.5 transition duration-200 active:scale-[0.98] cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{loadingStep || 'AI Auto-Director Producing Video...'}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-200 fill-amber-200" />
                    <span>Generate Complete Animated Video (Auto-Director)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* MODE 2: YOUTUBE LINK                                         */}
        {/* ============================================================ */}
        {creationMode === 'youtube' && (
          <form onSubmit={handleYoutubeSubmit} className="space-y-3">
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-zinc-500 pointer-events-none">
                <Youtube className="w-5 h-5 text-red-500" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste any YouTube video or Shorts URL (e.g. youtube.com/watch?v=...)"
                disabled={isLoading}
                className="w-full pl-11 pr-24 py-3.5 bg-zinc-950/80 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 text-xs sm:text-sm rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
              />
              <div className="absolute right-2 flex items-center gap-1">
                {url ? (
                  <button
                    type="button"
                    onClick={() => setUrl('')}
                    className="p-1.5 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="px-2.5 py-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-950/50 hover:bg-indigo-900/50 border border-indigo-800/60 rounded-lg transition"
                  >
                    Paste
                  </button>
                )}
              </div>
            </div>

            {/* Quick Demo Video Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <span className="text-zinc-500 font-semibold flex items-center gap-1 shrink-0">
                <Flame className="w-3.5 h-3.5 text-amber-400" /> Samples:
              </span>
              {SAMPLE_VIDEOS.map((sample) => (
                <button
                  key={sample.videoId}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium shrink-0 transition flex items-center gap-1.5 ${
                    copiedSample === sample.videoId
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                  }`}
                >
                  <span className="truncate max-w-[130px]">{sample.title}</span>
                </button>
              ))}
            </div>

            {/* Action Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
              <div className="text-xs text-zinc-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>100% Transformative Fair Use Protection • Subtitles Burned • Synced MP4</span>
              </div>

              <button
                type="submit"
                disabled={isLoading || !url.trim()}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600 disabled:opacity-50 disabled:pointer-events-none text-white font-extrabold text-sm shadow-xl shadow-indigo-900/30 flex items-center justify-center gap-2 transition duration-200 active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{loadingStep || 'Processing YouTube Video...'}</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 text-indigo-200" />
                    <span>Extract Viral Shorts</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* MODE 3: UPLOAD VIDEO FILE                                    */}
        {/* ============================================================ */}
        {creationMode === 'upload' && (
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed text-center cursor-pointer transition ${
                isDragOver
                  ? 'border-emerald-400 bg-emerald-950/20'
                  : uploadedFile
                  ? 'border-emerald-500/80 bg-zinc-950/60'
                  : 'border-zinc-700 hover:border-zinc-500 bg-zinc-950/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/mov"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setUploadedFile(f);
                }}
                className="hidden"
              />

              {uploadedFile ? (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                    <Film className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                      <span>{uploadedFile.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFile(null);
                        }}
                        className="text-zinc-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-emerald-400 font-medium">
                      {(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB • Ready for AI Clipping
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Drop your video file here, or click to browse
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Supports MP4, MOV, WebM • Fast multi-threaded processing • 100% audio-video sync
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="text-xs text-zinc-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>Original Moving Footage & Synced Audio Preserved</span>
              </div>

              <button
                type="submit"
                disabled={isLoading || !uploadedFile}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 disabled:pointer-events-none text-white font-extrabold text-sm shadow-xl shadow-emerald-900/30 flex items-center justify-center gap-2 transition duration-200 active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing Uploaded Video...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 text-emerald-200" />
                    <span>Generate Shorts from Video</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
