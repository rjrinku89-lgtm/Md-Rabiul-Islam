import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Cookie,
  Upload,
  CheckCircle2,
  X,
  Key,
  ExternalLink,
  FileVideo,
  Info,
} from 'lucide-react';

interface CookieModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttachFile?: (file: File) => void;
  onCookiesSaved?: () => void;
}

export const CookieModal: React.FC<CookieModalProps> = ({
  isOpen,
  onClose,
  onAttachFile,
  onCookiesSaved,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'cookies'>('upload');
  const [cookieText, setCookieText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasExistingCookies, setHasExistingCookies] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/check-cookies')
        .then((res) => res.json())
        .then((data) => setHasExistingCookies(!!data.hasCookies))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveCookies = async () => {
    if (!cookieText.trim()) return;
    try {
      setIsSaving(true);
      setStatusMsg('');
      const res = await fetch('/api/save-cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookies: cookieText }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveSuccess(true);
        setHasExistingCookies(true);
        setStatusMsg('YouTube cookies saved! Bot checks are now bypassed.');
        setTimeout(() => {
          if (onCookiesSaved) onCookiesSaved();
          onClose();
        }, 1200);
      } else {
        setStatusMsg(data.error || 'Failed to save cookies.');
      }
    } catch (err: any) {
      setStatusMsg(err.message || 'Error saving cookies.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAttachFile) {
      onAttachFile(file);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl overflow-hidden p-5 sm:p-6 text-zinc-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              YouTube Bot Verification Detected
            </h3>
            <p className="text-xs text-zinc-400">
              YouTube requires sign-in verification for this specific video.
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 p-1 bg-zinc-950 rounded-xl mb-4 border border-zinc-800 text-xs">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'upload'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Option 1: Upload Video File (Instant)</span>
          </button>
          <button
            onClick={() => setActiveTab('cookies')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'cookies'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Cookie className="w-3.5 h-3.5" />
            <span>Option 2: Provide Cookies</span>
          </button>
        </div>

        {activeTab === 'upload' ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-700/40 text-xs text-indigo-200 leading-relaxed">
              <span className="font-bold text-white block mb-1">
                Fastest & 100% Reliable Solution:
              </span>
              Select or drop your video file (MP4/WebM). The engine will instantly render moving real video footage, custom 9:16 vertical crop, and sync your Bangla subtitles without any YouTube bot blocks!
            </div>

            <label className="border-2 border-dashed border-zinc-700 hover:border-indigo-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-zinc-950/50 hover:bg-zinc-950">
              <FileVideo className="w-8 h-8 text-indigo-400" />
              <div className="text-xs font-bold text-white">Click to Select MP4 / WebM Video File</div>
              <div className="text-[11px] text-zinc-500">Supports standard MP4, MOV, MKV & WebM</div>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-zinc-300">
              Paste standard Netscape-format YouTube cookies to authenticate server-side downloads:
            </div>

            <textarea
              value={cookieText}
              onChange={(e) => setCookieText(e.target.value)}
              placeholder="# Netscape HTTP Cookie File&#10;.youtube.com TRUE / FALSE ...&#10;Paste cookies.txt content here..."
              rows={5}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
            />

            {statusMsg && (
              <div
                className={`text-xs p-2 rounded-lg font-medium ${
                  saveSuccess
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : 'bg-red-500/10 text-red-300 border border-red-500/30'
                }`}
              >
                {statusMsg}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                <span>Cookies are stored locally on your dev instance</span>
              </div>
              <button
                onClick={handleSaveCookies}
                disabled={isSaving || !cookieText.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition"
              >
                {isSaving ? 'Saving...' : saveSuccess ? 'Saved ✓' : 'Save Cookies & Retry'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
