import { ShortClip, EditorSettings, CaptionWord } from '../types';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

export interface RenderProgressCallback {
  (progress: number, statusText: string): void;
}

export interface ExportResult {
  blob: Blob;
  format: 'mp4' | 'webm';
  filename: string;
  url: string;
  width: number;
  height: number;
}

// Pre-load an image with CORS handling
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Retry without anonymous if failed
      const imgFallback = new Image();
      imgFallback.onload = () => resolve(imgFallback);
      imgFallback.onerror = () => resolve(null);
      imgFallback.src = src;
    };
    img.src = src;
  });
}

export async function renderAndExportVideo(
  clip: ShortClip,
  settings: EditorSettings,
  videoTitle: string,
  onProgress: RenderProgressCallback,
  videoElement?: HTMLVideoElement | null,
  thumbnailUrl?: string,
  clipVideoUrl?: string
): Promise<ExportResult> {
  const quality = settings.exportQuality || '720p';
  let width = 720;
  let height = 1280;
  if (quality === '1080p') {
    width = 1080;
    height = 1920;
  } else if (quality === '360p') {
    width = 360;
    height = 640;
  }
  const scale = width / 720;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });

  if (!ctx) {
    throw new Error('Canvas 2D context not supported on this browser.');
  }

  // Pre-load thumbnail image as background fallback
  let thumbnailImg: HTMLImageElement | null = null;
  if (thumbnailUrl) {
    onProgress(3, 'Loading visual assets...');
    thumbnailImg = await loadImage(thumbnailUrl);
  }

  // If videoElement is not ready or not provided, but we have a clip video stream URL:
  let activeVideoEl = videoElement;
  const streamSrc = clipVideoUrl || clip.clipVideoUrl;
  if ((!activeVideoEl || activeVideoEl.readyState < 2 || activeVideoEl.videoWidth === 0) && streamSrc) {
    try {
      onProgress(6, 'Buffering real YouTube video stream for HQ export...');
      activeVideoEl = document.createElement('video');
      activeVideoEl.src = streamSrc;
      activeVideoEl.crossOrigin = 'anonymous';
      activeVideoEl.playsInline = true;
      activeVideoEl.muted = false;
      await new Promise<void>((resolve) => {
        let isDone = false;
        activeVideoEl!.onloadeddata = () => {
          if (!isDone) {
            isDone = true;
            resolve();
          }
        };
        activeVideoEl!.onerror = () => {
          if (!isDone) {
            isDone = true;
            resolve();
          }
        };
        setTimeout(() => {
          if (!isDone) {
            isDone = true;
            resolve();
          }
        }, 6000);
      });
    } catch (e) {
      console.warn('Buffer stream note:', e);
    }
  }

  const fps = 30;
  const clipDuration = Math.min(clip.duration, 60);
  const totalFrames = Math.floor(clipDuration * fps);

  // If a real video element is attached, ensure it's loaded and ready
  const hasRealVideo = !!(
    activeVideoEl &&
    activeVideoEl.readyState >= 2 &&
    activeVideoEl.videoWidth > 0
  );

  if (!hasRealVideo) {
    throw new Error(
      'Original moving video stream is required for video export. To ensure original quality with moving video and synchronized audio, please use the SaveFrom Downloader or attach your video file.'
    );
  }

  // MediaRecorder Engine (Full Video Footage + Original Synced Audio)
  return await exportViaMediaRecorder(
    canvas,
    ctx,
    clip,
    settings,
    videoTitle,
    activeVideoEl,
    thumbnailImg,
    width,
    height,
    scale,
    fps,
    clipDuration,
    totalFrames,
    onProgress
  );
}

// ---------------------------------------------------------------------------
// 1. WebCodecs Hardware Accelerated MP4 Engine
// ---------------------------------------------------------------------------
async function exportViaWebCodecs(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  clip: ShortClip,
  settings: EditorSettings,
  videoTitle: string,
  thumbnailImg: HTMLImageElement | null,
  width: number,
  height: number,
  scale: number,
  fps: number,
  clipDuration: number,
  totalFrames: number,
  onProgress: RenderProgressCallback
): Promise<ExportResult> {
  onProgress(5, 'Initializing Universal MP4 H.264 hardware encoder...');

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: 'avc',
      width: width,
      height: height,
    },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  const bitrate =
    settings.exportQuality === '1080p'
      ? 8_000_000
      : settings.exportQuality === '360p'
      ? 1_800_000
      : 4_500_000;

  let encodingError: any = null;
  const videoEncoder = new (window as any).VideoEncoder({
    output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
    error: (e: any) => {
      console.error('VideoEncoder error:', e);
      encodingError = e;
    },
  });

  const avcCodec = settings.exportQuality === '1080p' ? 'avc1.4d002a' : 'avc1.42001f';

  await videoEncoder.configure({
    codec: avcCodec,
    width: width,
    height: height,
    bitrate: bitrate,
    framerate: fps,
    hardwareAcceleration: 'prefer-hardware',
  });

  for (let frameIndex = 0; frameIndex <= totalFrames; frameIndex++) {
    if (encodingError) throw encodingError;

    const currentTimeSec = frameIndex / fps;
    const progress = Math.min(95, Math.round((frameIndex / totalFrames) * 90) + 5);

    if (frameIndex % 8 === 0) {
      onProgress(
        progress,
        `Encoding Universal MP4 frame ${frameIndex} of ${totalFrames} (${progress}%)...`
      );
      await new Promise((r) => setTimeout(r, 0));
    }

    drawVideoFrame(
      ctx,
      clip,
      settings,
      videoTitle,
      null,
      thumbnailImg,
      currentTimeSec,
      clipDuration,
      width,
      height,
      scale
    );

    const timestampUs = Math.round(currentTimeSec * 1_000_000);
    const frame = new (window as any).VideoFrame(canvas, {
      timestamp: timestampUs,
      duration: Math.round((1 / fps) * 1_000_000),
    });

    const isKeyframe = frameIndex % (fps * 2) === 0;
    videoEncoder.encode(frame, { keyFrame: isKeyframe });
    frame.close();
  }

  onProgress(95, 'Finalizing Universal MP4 container...');
  await videoEncoder.flush();
  videoEncoder.close();
  muxer.finalize();

  const buffer = (muxer.target as ArrayBufferTarget).buffer;
  const blob = new Blob([buffer], { type: 'video/mp4' });
  const filename = `${sanitizeFilename(clip.title)}-short.mp4`;
  const url = URL.createObjectURL(blob);

  onProgress(100, 'Universal HQ MP4 ready!');

  return {
    blob,
    format: 'mp4',
    filename,
    url,
    width,
    height,
  };
}

// ---------------------------------------------------------------------------
// 2. MediaRecorder Engine (Full Real Video Footage + Real Audio)
// ---------------------------------------------------------------------------
async function exportViaMediaRecorder(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  clip: ShortClip,
  settings: EditorSettings,
  videoTitle: string,
  videoElement: HTMLVideoElement | null | undefined,
  thumbnailImg: HTMLImageElement | null,
  width: number,
  height: number,
  scale: number,
  fps: number,
  clipDuration: number,
  totalFrames: number,
  onProgress: RenderProgressCallback
): Promise<ExportResult> {
  onProgress(5, 'Setting up real video & audio recording stream...');

  let audioCtx: AudioContext | null = null;
  let dest: MediaStreamAudioDestinationNode | null = null;
  let osc: OscillatorNode | null = null;
  let audioTracks: MediaStreamTrack[] = [];

  const hasRealVideo = !!(
    videoElement &&
    videoElement.readyState >= 2 &&
    videoElement.videoWidth > 0
  );

  // If we have a real video element with audio, capture its audio stream
  if (hasRealVideo && videoElement) {
    try {
      if ((videoElement as any).captureStream) {
        const stream = (videoElement as any).captureStream();
        audioTracks = stream.getAudioTracks();
      } else if ((videoElement as any).mozCaptureStream) {
        const stream = (videoElement as any).mozCaptureStream();
        audioTracks = stream.getAudioTracks();
      }
    } catch (e) {
      console.warn('Direct stream capture error, using Web Audio fallback:', e);
    }

    if (audioTracks.length === 0) {
      try {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        dest = audioCtx.createMediaStreamDestination();
        const source = audioCtx.createMediaElementSource(videoElement);
        source.connect(dest);
        source.connect(audioCtx.destination);
        audioTracks = dest.stream.getAudioTracks();
      } catch (e) {
        console.warn('AudioContext source setup note:', e);
      }
    }

    // Cue the real video to the clip start
    try {
      const isTrimmed = videoElement.duration <= clip.duration + 10;
      videoElement.currentTime = isTrimmed ? 0 : clip.startTime;
      await videoElement.play().catch(() => {});
    } catch (e) {
      // ignore
    }
  }

  // If still no audio tracks (e.g. no video file loaded yet), synthesize subtle audio bed
  if (audioTracks.length === 0) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      dest = audioCtx.createMediaStreamDestination();
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.015, audioCtx.currentTime);

      osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      audioTracks = dest.stream.getAudioTracks();
    } catch (e) {
      // ignore
    }
  }

  const canvasStream = canvas.captureStream(fps);
  const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks(), ...audioTracks];
  const combinedStream = new MediaStream(tracks);

  let chosenMime = 'video/mp4';
  let targetFormat: 'mp4' | 'webm' = 'mp4';

  const preferredMp4Types = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4;codecs=h264',
    'video/mp4',
  ];

  const preferredWebmTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];

  if (settings.exportFormat === 'mp4') {
    const supportedMp4 = preferredMp4Types.find((t) => MediaRecorder.isTypeSupported(t));
    if (supportedMp4) {
      chosenMime = supportedMp4;
      targetFormat = 'mp4';
    } else {
      const supportedWebm = preferredWebmTypes.find((t) => MediaRecorder.isTypeSupported(t)) || 'video/webm';
      chosenMime = supportedWebm;
      targetFormat = 'webm';
    }
  } else {
    const supportedWebm = preferredWebmTypes.find((t) => MediaRecorder.isTypeSupported(t)) || 'video/webm';
    chosenMime = supportedWebm;
    targetFormat = 'webm';
  }

  const recordedChunks: Blob[] = [];
  const recorder = new MediaRecorder(combinedStream, {
    mimeType: chosenMime,
    videoBitsPerSecond:
      settings.exportQuality === '1080p'
        ? 8_000_000
        : settings.exportQuality === '360p'
        ? 1_800_000
        : 4_500_000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      try {
        if (osc) osc.stop();
        if (audioCtx) audioCtx.close();
      } catch (e) {
        // ignore
      }
      const finalBlob = new Blob(recordedChunks, { type: chosenMime });
      resolve(finalBlob);
    };
    recorder.onerror = (e) => reject(e);
  });

  recorder.start(100);

  for (let frameIndex = 0; frameIndex <= totalFrames; frameIndex++) {
    const currentTimeSec = frameIndex / fps;
    const progress = Math.min(95, Math.round((frameIndex / totalFrames) * 90) + 5);

    if (frameIndex % 8 === 0) {
      onProgress(
        progress,
        `Rendering frame ${frameIndex} of ${totalFrames} (${progress}%)...`
      );
      await new Promise((r) => setTimeout(r, 10));
    }

    // If real video is playing, sync its time if needed
    if (hasRealVideo && videoElement) {
      const targetTime = clip.startTime + currentTimeSec;
      if (Math.abs(videoElement.currentTime - targetTime) > 0.5) {
        videoElement.currentTime = targetTime;
      }
    }

    drawVideoFrame(
      ctx,
      clip,
      settings,
      videoTitle,
      videoElement,
      thumbnailImg,
      currentTimeSec,
      clipDuration,
      width,
      height,
      scale
    );
  }

  if (hasRealVideo && videoElement) {
    try {
      videoElement.pause();
    } catch (e) {
      // ignore
    }
  }

  onProgress(95, 'Finalizing video stream...');
  recorder.stop();
  const blob = await recordingPromise;

  const filename = `${sanitizeFilename(clip.title)}-short.${targetFormat}`;
  const url = URL.createObjectURL(blob);

  onProgress(100, 'Video generated successfully!');

  return {
    blob,
    format: targetFormat,
    filename,
    url,
    width,
    height,
  };
}

// ---------------------------------------------------------------------------
// 3. Real Video & Visual Content Frame Drawing Function
// ---------------------------------------------------------------------------
export function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  clip: ShortClip,
  settings: EditorSettings,
  videoTitle: string,
  videoElement: HTMLVideoElement | null | undefined,
  thumbnailImg: HTMLImageElement | null,
  currentTimeSec: number,
  clipDuration: number,
  width: number,
  height: number,
  scale: number
) {
  const themeColors = {
    hormozi: { primary: '#facc15', secondary: '#4ade80', bg: '#09090b', accent: '#eab308' },
    mrbeast: { primary: '#ef4444', secondary: '#facc15', bg: '#0b0f19', accent: '#3b82f6' },
    neon: { primary: '#22d3ee', secondary: '#c084fc', bg: '#050510', accent: '#ec4899' },
    minimal: { primary: '#ffffff', secondary: '#94a3b8', bg: '#18181b', accent: '#38bdf8' },
    karaoke: { primary: '#38bdf8', secondary: '#fbbf24', bg: '#090d16', accent: '#818cf8' },
  }[settings.captionStyle] || { primary: '#facc15', secondary: '#4ade80', bg: '#09090b', accent: '#eab308' };

  // --- 1. Background Layer (Deep Blur of Real Video / Thumbnail) ---
  ctx.fillStyle = themeColors.bg;
  ctx.fillRect(0, 0, width, height);

  const hasRealVideo = !!(
    videoElement &&
    videoElement.readyState >= 2 &&
    videoElement.videoWidth > 0
  );

  const realVideoSource: HTMLVideoElement | null = hasRealVideo
    ? (videoElement as HTMLVideoElement)
    : null;

  const bgSource: CanvasImageSource | null = realVideoSource || thumbnailImg;

  if (bgSource) {
    // Draw blurred ambient background to fill the 9:16 vertical canvas
    ctx.save();
    const zoom = 1.1 + Math.sin(currentTimeSec * 0.15) * 0.05;
    const bgW = width * zoom;
    const bgH = height * zoom;
    const bgX = (width - bgW) / 2;
    const bgY = (height - bgH) / 2;

    ctx.drawImage(bgSource, bgX, bgY, bgW, bgH);

    // Apply dark glass blur overlay so captions pop
    ctx.fillStyle = 'rgba(9, 9, 11, 0.72)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  } else {
    // Gradient fallback if no visual source
    const t = currentTimeSec * 1.5;
    const grad1 = ctx.createRadialGradient(
      width * 0.3 + Math.sin(t) * (100 * scale),
      height * 0.35 + Math.cos(t) * (120 * scale),
      10 * scale,
      width * 0.3,
      height * 0.35,
      450 * scale
    );
    grad1.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
    grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, width, height);
  }

  // --- 2. Main Center Video Content / Card (REAL VIDEO FOOTAGE) ---
  if (settings.layoutStyle === 'split_screen') {
    // Split Screen Layout
    const pad = 36 * scale;
    const cardH = 430 * scale;

    // Top Card (Real Speaker / Video)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pad, 170 * scale, width - pad * 2, cardH, 24 * scale);
    ctx.clip();

    if (realVideoSource) {
      // Draw actual video content filling the top half
      ctx.drawImage(realVideoSource, pad, 170 * scale, width - pad * 2, cardH);
    } else {
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(pad, 170 * scale, width - pad * 2, cardH);
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.roundRect(pad, 170 * scale, width - pad * 2, cardH, 24 * scale);
    ctx.stroke();

    // Bottom Card (B-Roll or Zoomed Reaction)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pad, 620 * scale, width - pad * 2, cardH, 24 * scale);
    ctx.clip();

    if (realVideoSource) {
      // Zoomed alternate angle from the same video
      const zoomW = (width - pad * 2) * 1.35;
      const zoomH = cardH * 1.35;
      const zoomX = pad - (zoomW - (width - pad * 2)) / 2;
      const zoomY = 620 * scale - (zoomH - cardH) / 2;
      ctx.drawImage(realVideoSource, zoomX, zoomY, zoomW, zoomH);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(pad, 620 * scale, width - pad * 2, cardH);
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.roundRect(pad, 620 * scale, width - pad * 2, cardH, 24 * scale);
    ctx.stroke();
  } else {
    // Standard Fill & Blur (Main High-Quality 16:9 Center Video Display)
    const cardY = 250 * scale;
    const pad = 32 * scale;
    const cardW = width - pad * 2;
    const cardH = (cardW * 9) / 16; // Exact 16:9 widescreen video aspect ratio!

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 45 * scale;
    ctx.beginPath();
    ctx.roundRect(pad, cardY, cardW, cardH, 28 * scale);
    ctx.clip();

    if (realVideoSource) {
      // Draw the REAL video content / video frames into the 16:9 center display!
      ctx.drawImage(realVideoSource, pad, cardY, cardW, cardH);
    } else if (thumbnailImg) {
      // High-resolution visual fallback so screen is never an empty black rectangle
      ctx.drawImage(thumbnailImg, pad, cardY, cardW, cardH);
    } else {
      ctx.fillStyle = '#111827';
      ctx.fillRect(pad, cardY, cardW, cardH);
    }
    ctx.restore();

    // Crisp illuminated frame border
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.roundRect(pad, cardY, cardW, cardH, 28 * scale);
    ctx.stroke();
    ctx.restore();
  }

  // --- 3. Top Hook Headline Banner ---
  if (settings.showHeadline && (settings.headlineText || clip.headlineBanner)) {
    const rawBanner = settings.headlineText || clip.headlineBanner;
    const isBanglaBanner = /[\u0980-\u09FF]/.test(rawBanner);
    const bannerText = isBanglaBanner ? rawBanner : rawBanner.toUpperCase();
    const bannerY = 110 * scale;

    ctx.save();
    const bannerFont = isBanglaBanner
      ? `'Hind Siliguri', 'Noto Sans Bengali', sans-serif`
      : `Montserrat, Cabinet Grotesk, sans-serif`;
    ctx.font = `900 ${Math.round((isBanglaBanner ? 32 : 36) * scale)}px ${bannerFont}`;
    ctx.textAlign = 'center';
    const textMetrics = ctx.measureText(bannerText);
    const pillW = textMetrics.width + 70 * scale;
    const pillH = 72 * scale;

    // Glowing banner shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 18 * scale;
    ctx.fillStyle = settings.highlightColor || '#facc15';
    ctx.beginPath();
    ctx.roundRect(width / 2 - pillW / 2, bannerY - 48 * scale, pillW, pillH, 18 * scale);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Bold black text on yellow/accent pill
    ctx.fillStyle = '#000000';
    ctx.fillText(bannerText, width / 2, bannerY);
    ctx.restore();
  }

  // --- 4. Dynamic Animated Subtitle Captions (Bangla & English) ---
  const activeCaption =
    clip.captions.find(
      (c) => currentTimeSec >= c.start && currentTimeSec <= c.end + 0.35
    ) ||
    clip.captions[Math.min(clip.captions.length - 1, Math.floor((currentTimeSec / clipDuration) * clip.captions.length))] ||
    clip.captions[0];

  if (activeCaption) {
    const captionY =
      settings.captionPosition === 'top'
        ? 230 * scale
        : settings.captionPosition === 'bottom'
        ? 1000 * scale
        : 840 * scale;

    const baseFontSize = (settings.captionFontSize || 42) * scale;
    const isBanglaText = /[\u0980-\u09FF]/.test(activeCaption.text) || settings.subtitleLanguage === 'bn';
    const captionFont = isBanglaText
      ? `'Hind Siliguri', 'Noto Sans Bengali', sans-serif`
      : `'Montserrat', 'Inter', sans-serif`;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textToShow = isBanglaText ? activeCaption.text : activeCaption.text.toUpperCase();

    if (settings.captionStyle === 'hormozi') {
      // Alex Hormozi Preset: Ultra bold with heavy black stroke
      ctx.font = `900 ${baseFontSize * (isBanglaText ? 1.05 : 1.15)}px ${captionFont}`;
      ctx.lineWidth = 14 * scale;
      ctx.strokeStyle = '#000000';
      ctx.lineJoin = 'miter';

      ctx.strokeText(textToShow, width / 2, captionY);
      ctx.fillStyle = activeCaption.emphasis ? settings.highlightColor || '#facc15' : '#ffffff';
      ctx.fillText(textToShow, width / 2, captionY);
    } else if (settings.captionStyle === 'mrbeast') {
      // MrBeast Preset: Red/Yellow high contrast with heavy stroke
      ctx.font = `900 ${baseFontSize * (isBanglaText ? 1.1 : 1.25)}px ${captionFont}`;
      ctx.lineWidth = 16 * scale;
      ctx.strokeStyle = '#000000';

      ctx.strokeText(textToShow, width / 2, captionY);
      ctx.fillStyle = activeCaption.emphasis ? '#ef4444' : '#facc15';
      ctx.fillText(textToShow, width / 2, captionY);
    } else if (settings.captionStyle === 'neon') {
      // Neon Glow Preset
      ctx.font = `800 ${baseFontSize * (isBanglaText ? 1.0 : 1.1)}px ${captionFont}`;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 30 * scale;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(activeCaption.text, width / 2, captionY);
      ctx.shadowBlur = 0;
    } else if (settings.captionStyle === 'minimal') {
      // Clean Minimal Frosted Pill
      ctx.font = `700 ${baseFontSize}px ${captionFont}`;
      const textMetrics = ctx.measureText(activeCaption.text);
      const pillW = textMetrics.width + 50 * scale;
      const pillH = (baseFontSize + 28) * scale;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.beginPath();
      ctx.roundRect(width / 2 - pillW / 2, captionY - pillH / 2, pillW, pillH, 999);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(activeCaption.text, width / 2, captionY);
    } else {
      // Karaoke preset
      ctx.font = `900 ${baseFontSize * 1.1}px ${captionFont}`;
      ctx.lineWidth = 12 * scale;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(activeCaption.text, width / 2, captionY);

      ctx.fillStyle = settings.highlightColor || '#38bdf8';
      ctx.fillText(activeCaption.text, width / 2, captionY);
    }

    ctx.restore();
  }

  // --- 5. Bottom Progress Retention Bar ---
  if (settings.showProgressBar) {
    const barH = 14 * scale;
    const progressWidth = width * (currentTimeSec / clipDuration);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(0, height - barH, width, barH);

    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, '#ef4444');
    grad.addColorStop(0.5, '#facc15');
    grad.addColorStop(1, '#10b981');
    ctx.fillStyle = grad;
    ctx.fillRect(0, height - barH, progressWidth, barH);
  }

  // Channel icon and watermark completely removed as requested
}

function sanitizeFilename(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 50);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

export function generateSrtContent(captions: CaptionWord[]): string {
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
  };

  return captions
    .map((cap, idx) => {
      return `${idx + 1}\n${formatTime(cap.start)} --> ${formatTime(cap.end)}\n${cap.text}\n`;
    })
    .join('\n');
}
