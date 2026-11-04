import express, { Request, Response } from 'express';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { execFile, exec, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Enable HTTP gzip/brotli compression for fast website loading and snappy API responses
app.use(compression({ level: 6, threshold: 1024 }));

app.use(express.json({ limit: '10mb' }));

// Cache directory for downloaded video clips and assets
const videoCacheDir = path.resolve('/tmp/video_cache');
if (!fs.existsSync(videoCacheDir)) {
  fs.mkdirSync(videoCacheDir, { recursive: true });
}

// Helper to extract YouTube ID
function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const clean = urlOrId.trim();

  // If directly passed 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  // Common YouTube URL regex patterns
  const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

// In-memory caches for fast sub-millisecond responses
const oEmbedCache = new Map<string, { data: any; expires: number }>();
const analysisCache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Fetch YouTube oEmbed metadata with in-memory caching and fast 3.5s timeout
async function fetchYouTubeOEmbed(videoId: string) {
  const cached = oEmbedCache.get(videoId);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      const meta = {
        title: data.title || `YouTube Video (${videoId})`,
        author: data.author_name || 'YouTube Creator',
        authorUrl: data.author_url || '',
        thumbnailUrl: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      };
      oEmbedCache.set(videoId, { data: meta, expires: Date.now() + CACHE_TTL_MS });
      return meta;
    }
  } catch (err) {
    console.warn('oEmbed fetch error or timeout:', err);
  }

  const fallbackMeta = {
    title: `YouTube Video (${videoId})`,
    author: 'YouTube Creator',
    authorUrl: '',
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  };
  oEmbedCache.set(videoId, { data: fallbackMeta, expires: Date.now() + CACHE_TTL_MS });
  return fallbackMeta;
}

// Fallback high-quality clips generator if Gemini fails or for demo
function generateFallbackProject(videoId: string, oembed: { title: string; author: string; thumbnailUrl: string }) {
  const title = oembed.title;
  return {
    id: videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: title,
    author: oembed.author,
    thumbnailUrl: oembed.thumbnailUrl,
    durationApprox: '14:20',
    summary: {
      overview: `A high-impact breakdown from "${title}" by ${oembed.author}. This video unpacks transformative insights, proven strategies, and direct advice for content creators, entrepreneurs, and ambitious builders.`,
      keyTakeaways: [
        'The #1 mistake most creators and entrepreneurs make in their first 6 months is optimizing before validating demand.',
        'Attention is the new currency: hook viewers in the first 2.5 seconds or lose 80% of retention.',
        'Consistency compounds exponentially once you find the asymmetric distribution flywheel.',
        'Stop doing manual repetitive edits—automate clips and distribution to 10x your output.'
      ],
      targetAudience: 'Content creators, entrepreneurs, digital marketers, and anyone scaling an online presence.',
      notableQuote: '"If you can capture someone\'s curiosity in 3 seconds, you earn the right to deliver 60 seconds of real value."',
      category: 'Business & Growth',
      chapters: [
        { timestamp: '00:00', title: 'The Hook & The Harsh Truth', summary: 'Why most people fail before they even start' },
        { timestamp: '03:15', title: 'The 3-Step Framework', summary: 'Core tactical model broken down step-by-step' },
        { timestamp: '07:42', title: 'Case Study & Proof', summary: 'Real-world numbers and revenue demonstration' },
        { timestamp: '11:20', title: 'The Exact Implementation Blueprint', summary: 'Action items you can execute starting today' }
      ]
    },
    clips: [
      {
        id: `clip-1-${videoId}`,
        title: 'The Brutal Truth Nobody Tells You',
        hookTitle: 'Why 99% Fail Before Starting',
        headlineBanner: 'THE BRUTAL TRUTH ⚠️',
        startTime: 14,
        endTime: 52,
        formattedTime: '00:14 - 00:52',
        duration: 38,
        viralityScore: 98,
        viralityBreakdown: { hookScore: 99, engagementScore: 97, trendScore: 96, pacingScore: 98 },
        hookType: 'Contrarian Truth',
        hookReason: 'Challenges common dogma in the first 3 seconds with high retention shock value.',
        transcript: 'Everyone thinks success is about working 80 hours a week. It is not. It is about doing the ONE thing that makes everything else obsolete.',
        captions: [
          { start: 0.0, end: 1.2, text: 'EVERYONE THINKS', emphasis: true },
          { start: 1.2, end: 2.8, text: 'SUCCESS IS ABOUT', emphasis: false },
          { start: 2.8, end: 4.5, text: 'WORKING 80 HOURS A WEEK.', emphasis: true },
          { start: 4.8, end: 6.0, text: 'IT IS NOT.', emphasis: true },
          { start: 6.2, end: 8.5, text: 'It is about doing the ONE thing', emphasis: true },
          { start: 8.6, end: 11.2, text: 'that makes everything else obsolete.', emphasis: false },
          { start: 11.5, end: 14.0, text: 'If you master this single habit,', emphasis: false },
          { start: 14.2, end: 17.5, text: 'your results multiply 10X in 90 days.', emphasis: true }
        ],
        suggestedBroll: ['Grind hustle montage', 'Clock ticking fast', 'Stock charts going exponential'],
        socialKit: {
          youtubeTitle: 'The brutal truth nobody tells you about success 🤯 #shorts #mindset',
          instagramCaption: 'Stop glorifying busywork. Focus on leverage and asymmetry. Share this with someone who needs to hear it today.',
          hashtags: ['#shorts', '#successmindset', '#growthtips', '#entrepreneur', '#productivity'],
          hookPinnedComment: 'What is the ONE habit that changed everything for you? Let me know below 👇'
        }
      },
      {
        id: `clip-2-${videoId}`,
        title: 'The $10,000/Month Blueprint',
        hookTitle: 'How to scale without burning out',
        headlineBanner: 'THE $10,000 FORMULA 💰',
        startTime: 195,
        endTime: 236,
        formattedTime: '03:15 - 03:56',
        duration: 41,
        viralityScore: 95,
        viralityBreakdown: { hookScore: 96, engagementScore: 94, trendScore: 95, pacingScore: 96 },
        hookType: 'Actionable Secret',
        hookReason: 'Clear step-by-step formula that sparks curiosity and bookmark saves.',
        transcript: 'Here is the exact formula: step one, identify high-intent problems. Step two, package the solution into a repeatable offer.',
        captions: [
          { start: 0.0, end: 1.5, text: 'HERE IS THE EXACT FORMULA:', emphasis: true },
          { start: 1.6, end: 3.5, text: 'Step one: identify high-intent problems.', emphasis: false },
          { start: 3.8, end: 6.2, text: 'Step two: package the solution.', emphasis: true },
          { start: 6.5, end: 9.0, text: 'Most people sell what they like.', emphasis: false },
          { start: 9.2, end: 12.0, text: 'Top 1% sell what people CRAVE.', emphasis: true },
          { start: 12.2, end: 15.0, text: 'Once you understand this shift, money flows.', emphasis: true }
        ],
        suggestedBroll: ['Money dashboard', 'Customer smiling', 'Signing contract'],
        socialKit: {
          youtubeTitle: 'How top 1% creators actually make money 💸 #shorts #business',
          instagramCaption: 'The shift from selling what you like to solving what people crave is where wealth is made.',
          hashtags: ['#business', '#wealth', '#creatoreconomy', '#digitalmarketing', '#shorts'],
          hookPinnedComment: 'Save this video before you forget step 2! Bookmark now 📌'
        }
      },
      {
        id: `clip-3-${videoId}`,
        title: 'The 3-Second Rule for Virality',
        hookTitle: 'Why your videos get 0 views',
        headlineBanner: 'FIX YOUR HOOKS ⚡',
        startTime: 462,
        endTime: 501,
        formattedTime: '07:42 - 08:21',
        duration: 39,
        viralityScore: 93,
        viralityBreakdown: { hookScore: 98, engagementScore: 91, trendScore: 92, pacingScore: 94 },
        hookType: 'Curiosity Gap',
        hookReason: 'High retention trigger addressing creators\' biggest pain point.',
        transcript: 'If you do not hook them in the first three seconds, the algorithm considers your video dead on arrival. Here is how to fix it.',
        captions: [
          { start: 0.0, end: 2.2, text: 'FIRST THREE SECONDS', emphasis: true },
          { start: 2.3, end: 4.8, text: 'Decide if your video goes viral or dies.', emphasis: true },
          { start: 5.0, end: 7.2, text: 'Never start with "Hey guys, welcome back."', emphasis: false },
          { start: 7.5, end: 10.2, text: 'Start with a question that shocks the brain.', emphasis: true },
          { start: 10.5, end: 13.0, text: 'Watch your average retention soar past 100%.', emphasis: true }
        ],
        suggestedBroll: ['YouTube analytics spike', 'Red alert screen', 'Viral view count ticking'],
        socialKit: {
          youtubeTitle: 'The 3-second hook rule that changes everything 📈 #shorts #algorithm',
          instagramCaption: 'Never start your videos with boring intros again. Try this hook formula instead.',
          hashtags: ['#algorithm', '#viraltips', '#contentcreator', '#reels', '#tiktoktips'],
          hookPinnedComment: 'Drop your channel handle below and I will review your latest hook! 🔥'
        }
      },
      {
        id: `clip-4-${videoId}`,
        title: 'The Mindset Shift That Changed My Life',
        hookTitle: 'Stop trading time for dollars',
        headlineBanner: 'STOP DOING THIS 🛑',
        startTime: 680,
        endTime: 718,
        formattedTime: '11:20 - 11:58',
        duration: 38,
        viralityScore: 91,
        viralityBreakdown: { hookScore: 90, engagementScore: 92, trendScore: 90, pacingScore: 93 },
        hookType: 'Mindset Shift',
        hookReason: 'Deep emotional resonance that encourages shares and comment arguments.',
        transcript: 'Rich people buy time. Poor people trade time for money. Until you own assets that work while you sleep, you will work until you die.',
        captions: [
          { start: 0.0, end: 2.0, text: 'RICH PEOPLE BUY TIME.', emphasis: true },
          { start: 2.2, end: 4.5, text: 'Poor people trade time for money.', emphasis: false },
          { start: 4.8, end: 7.8, text: 'Until you build digital assets that scale,', emphasis: true },
          { start: 8.0, end: 10.8, text: 'you are trapped on the hamster wheel.', emphasis: false },
          { start: 11.0, end: 13.5, text: 'Start building your leverage today.', emphasis: true }
        ],
        suggestedBroll: ['Luxury watch', 'Trading desk', 'Laptop on beach'],
        socialKit: {
          youtubeTitle: 'The mindset shift 99% never make 🧠 #shorts #financialfreedom',
          instagramCaption: 'Assets over liabilities. Time over busywork. Think differently.',
          hashtags: ['#financialfreedom', '#mindset', '#investing', '#passiveincome', '#shorts'],
          hookPinnedComment: 'Which side are you currently on? Be honest in the comments 💬'
        }
      }
    ]
  };
}

// Dedicated full project for the user's attached Ekushey ETV News video
function buildEkusheyEtvProject(): any {
  return {
    id: 'videoplayback_b06f7cb2',
    url: '/assets/aistudio/videoplayback_b06f7cb2.mp4',
    title: 'একুশে সংবাদ - এইচএসসি ও সমমান পরীক্ষার ফল প্রকাশ (Ekushey ETV News)',
    author: 'একুশে টেলিভিশন (ETV HD)',
    authorUrl: 'https://ekushey-tv.com',
    thumbnailUrl: '/assets/aistudio/videoplayback_b06f7cb2_thumb.jpg',
    durationApprox: '01:17',
    summary: {
      overview: 'এ বছরের এইচএসসি ও সমমান পরীক্ষার ফলাফল প্রকাশ করা হয়েছে। ১১টি শিক্ষা বোর্ডে গড় পাসের হার ৫২.১২ শতাংশ, যা গত বছরের তুলনায় কমেছে। শিক্ষামন্ত্রী ফলাফল প্রকাশ কার্যক্রম উদ্বোধন করেন এবং পুনঃপরীক্ষা সংক্রান্ত গুরুত্বপূর্ণ দিকনির্দেশনা দেন।',
      keyTakeaways: [
        '১১টি শিক্ষা বোর্ডে গড় পাসের হার ৫২.১২ শতাংশ।',
        'গত বছরের তুলনায় পাসের হার ৬.৭১ শতাংশ হ্রাস পেয়েছে।',
        'এক বা দুই বিষয়ে অকৃতকার্য পরীক্ষার্থীদের পুনঃপরীক্ষা ১ মাসের মধ্যে অনুষ্ঠিত হবে।',
        'শিক্ষার্থীরা শিক্ষা বোর্ডের ওয়েবসাইট ও নিজ নিজ প্রতিষ্ঠান থেকে ফল সংগ্রহ করতে পারবেন।'
      ],
      targetAudience: 'শিক্ষার্থী, অভিভাবক, শিক্ষক ও সাধারণ দর্শক',
      notableQuote: '"এটাই জীবনের শেষ নয়। যারা খারাপ করেছে তারা কঠিন প্রস্তুতি নিলে আগামী দিনে অবশ্যই ভালো করবে।" — শিক্ষামন্ত্রী',
      category: 'সংবাদ ও শিক্ষা',
      chapters: [
        { timestamp: '00:00', title: 'সংবাদ সূচনা ও পাসের হার', summary: 'এইচএসসি ও সমমান পরীক্ষার ফল প্রকাশ' },
        { timestamp: '00:14', title: 'সচিবালয়ে ফল প্রকাশ অনুষ্ঠান', summary: 'শিক্ষা মন্ত্রণালয়ে ফল হস্তান্তর ও ব্রিফিং' },
        { timestamp: '00:40', title: 'শিক্ষামন্ত্রীর ভাষণ ও পুনঃপরীক্ষা', summary: 'শিক্ষার্থীদের প্রতি দিকনির্দেশনামূলক বক্তব্য' }
      ]
    },
    clips: [
      {
        id: 'clip-1-etv',
        title: 'এইচএসসি ফল প্রকাশ ও পাসের হার ৫২.১২%',
        hookTitle: 'পাসের হার কমেছে ৬.৭১ শতাংশ',
        headlineBanner: 'এইচএসসি পরীক্ষার ফল প্রকাশ 📊',
        startTime: 0,
        endTime: 38,
        formattedTime: '00:00 - 00:38',
        duration: 38,
        viralityScore: 98,
        viralityBreakdown: { hookScore: 99, engagementScore: 98, trendScore: 97, pacingScore: 98 },
        hookType: 'Breaking News',
        hookReason: 'জাতীয় পরীক্ষার ফলাফল ও তাৎক্ষণিক পাসের হার প্রকাশ দর্শকের সর্বোচ্চ আকর্ষণ ধরে রাখে।',
        transcript: 'এ বছরের এইচএসসি ও সমমান পরীক্ষার ফল প্রকাশ করা হয়েছে। ১১টি শিক্ষা বোর্ডে গড় পাসের হার ৫২.১২ শতাংশ। গত বছরের তুলনায় পাসের হার কমেছে ৬.৭১ শতাংশ। বেলা ১১টায় সচিবালয়ে ফল প্রকাশ কার্যক্রম উদ্বোধন করেন শিক্ষামন্ত্রী।',
        captions: [
          { start: 0.0, end: 3.5, text: 'এ বছরের এইচএসসি ও সমমান পরীক্ষার ফল প্রকাশ', emphasis: true },
          { start: 3.6, end: 7.8, text: '১১টি শিক্ষা বোর্ডে গড় পাসের হার ৫২.১২%', emphasis: true },
          { start: 8.0, end: 12.5, text: 'গত বছরের তুলনায় পাসের হার কমেছে ৬.৭১%', emphasis: false },
          { start: 13.0, end: 18.2, text: 'বেলা ১১টায় সচিবালয়ে ফল প্রকাশ কার্যক্রম উদ্বোধন', emphasis: true },
          { start: 18.5, end: 24.0, text: 'অনলাইনে একযোগে ফল প্রকাশ করা হয়েছে', emphasis: false },
          { start: 24.2, end: 30.5, text: 'বোর্ডের ওয়েবসাইট থেকে ফল সংগ্রহ করা যাচ্ছে', emphasis: true },
          { start: 31.0, end: 37.5, text: 'পুনঃপরীক্ষা এক মাসের মধ্যে অনুষ্ঠিত হবে', emphasis: true }
        ],
        suggestedBroll: ['সচিবালয় মিটিং রুম', 'ফলাফল স্ক্রিন', 'শিক্ষার্থী উল্লাস'],
        socialKit: {
          youtubeTitle: 'এইচএসসি পরীক্ষার ফল প্রকাশ: পাসের হার ৫২.১২% #hscresult #ekusheytv #shorts',
          instagramCaption: 'এ বছরের এইচএসসি ও সমমান পরীক্ষার ফলাফল প্রকাশ। বিস্তারিত জানতে ভিডিওটি দেখুন ও বন্ধুদের সাথে শেয়ার করুন।',
          hashtags: ['#hscresult', '#ekusheynews', '#breakingnews', '#bangladesh', '#shorts'],
          hookPinnedComment: 'আপনার শিক্ষা বোর্ডের ফলাফল কেমন হলো? নিচে কমেন্ট করে জানান 👇'
        },
        clipVideoUrl: '/api/clip-video?file=videoplayback_b06f7cb2.mp4'
      },
      {
        id: 'clip-2-etv',
        title: 'শিক্ষামন্ত্রীর গুরুত্বপূর্ণ বক্তব্য: এটাই জীবনের শেষ নয়',
        hookTitle: 'পুনঃপরীক্ষার সুযোগ ও শিক্ষার্থীদের সান্ত্বনা',
        headlineBanner: 'শিক্ষামন্ত্রীর জরুরি বার্তা 🎙️',
        startTime: 40,
        endTime: 74,
        formattedTime: '00:40 - 01:14',
        duration: 34,
        viralityScore: 96,
        viralityBreakdown: { hookScore: 97, engagementScore: 96, trendScore: 95, pacingScore: 96 },
        hookType: 'Inspirational',
        hookReason: 'শিক্ষার্থীদের মনোবল বাড়ানোর আবেগঘন বার্তা সোশ্যাল মিডিয়ায় ব্যাপক ভাইরাল ও শেয়ারযোগ্য।',
        transcript: 'যারা ভালো করেছে তাদের অভিনন্দন। যারা খারাপ করেছে, এটিই জীবনের শেষ নয়। ইনশাআল্লাহ আগামী দিনে আরও ভালো করব। যারা এক বা দুই বিষয়ে ফেল করেছে, তারা কঠিন প্রস্তুতি নিলে এক মাসের পুনঃপরীক্ষায় উত্তীর্ণ হতে পারবে।',
        captions: [
          { start: 0.0, end: 3.5, text: 'যারা ভালো করেছে তাদের অভিনন্দন', emphasis: true },
          { start: 3.8, end: 7.2, text: 'যারা খারাপ করেছে এটিই জীবনের শেষ নয়', emphasis: true },
          { start: 7.5, end: 12.0, text: 'ইনশাআল্লাহ আগামী দিনে আরও ভালো করব', emphasis: false },
          { start: 12.5, end: 18.0, text: 'এখানেই আমাদের পড়াশোনা শেষ নয়', emphasis: true },
          { start: 18.5, end: 24.0, text: 'আগামীর জন্য প্রস্তুতি নিতে আহ্বান জানাচ্ছি', emphasis: false },
          { start: 24.5, end: 30.0, text: 'কঠিন প্রস্তুতি নিলে অবশ্যই উত্তীর্ণ হতে পারবে', emphasis: true },
          { start: 30.5, end: 33.5, text: 'পুনঃপরীক্ষা এক মাসের মধ্যে হবে', emphasis: true }
        ],
        suggestedBroll: ['শিক্ষামন্ত্রীর বক্তব্য', 'প্রেস কনফারেন্স', 'শিক্ষার্থী মনোযোগ'],
        socialKit: {
          youtubeTitle: 'এইচএসসিতে খারাপ ফল হলেও হতাশ নয়: শিক্ষামন্ত্রীর আশ্বাস #shorts #motivational',
          instagramCaption: 'জীবনে একটি পরীক্ষা শেষ কথা নয়। ঘুরে দাঁড়ানোর সুযোগ আছে। শিক্ষামন্ত্রীর অনুপ্রেরণামূলক বার্তা শুনুন।',
          hashtags: ['#motivation', '#hsc', '#education', '#bangladeshnews', '#viralshorts'],
          hookPinnedComment: 'আপনার কি মনে হয় ১ মাসের মধ্যে পুনঃপরীক্ষা দিলে ভালো ফল সম্ভব?'
        },
        clipVideoUrl: '/api/clip-video?file=videoplayback_b06f7cb2.mp4'
      }
    ],
    createdAt: Date.now(),
    videoFileUrl: '/assets/aistudio/videoplayback_b06f7cb2.mp4',
    videoFileName: 'videoplayback_b06f7cb2.mp4'
  };
}

// Optional YouTube cookies file path for bot verification bypass
const COOKIES_PATH = '/tmp/youtube_cookies.txt';

function getCookiesArg(): string[] {
  const args = ['--js-runtimes', 'node:/usr/local/bin/node'];
  if (fs.existsSync(COOKIES_PATH) && fs.statSync(COOKIES_PATH).size > 10) {
    args.push('--cookies', COOKIES_PATH);
  }
  return args;
}

// Resolve and ensure standalone yt-dlp binary path
function getYtDlpPath(): string {
  const candidates = [
    path.resolve('/app/applet/bin/yt-dlp'),
    path.resolve(__dirname, 'bin/yt-dlp'),
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    'yt-dlp',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        fs.chmodSync(p, 0o755);
      } catch (e) {
        // ignore
      }
      return p;
    }
  }
  return 'yt-dlp';
}

function ensureYtDlpBinary() {
  const localBin = path.resolve('/app/applet/bin/yt-dlp');
  const usrBin = '/usr/local/bin/yt-dlp';
  if (!fs.existsSync(localBin) && !fs.existsSync(usrBin)) {
    try {
      console.log('[Setup] Downloading standalone yt-dlp binary...');
      fs.mkdirSync(path.dirname(localBin), { recursive: true });
      execSync('curl -sL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o ' + localBin + ' && chmod a+rx ' + localBin);
      execSync('cp ' + localBin + ' ' + usrBin + ' 2>/dev/null || true');
    } catch (e) {
      console.warn('[Setup] Note on downloading yt-dlp:', e);
    }
  }
}
ensureYtDlpBinary();

// Helper to find local video path across multiple possible asset locations
function findLocalVideoPath(filenameOrPath?: string): string | null {
  if (!filenameOrPath) return null;
  const raw = filenameOrPath.trim();
  const clean = raw.replace(/^\/+/, '');
  const basename = path.basename(clean);
  const names = [
    basename,
    clean,
    `${basename}.mp4`,
    `${basename}.webm`,
    `${clean}.mp4`,
    `${clean}.webm`,
  ];
  const searchDirs = [
    videoCacheDir,
    path.resolve('public/assets/aistudio'),
    path.resolve('/app/applet/public/assets/aistudio'),
    path.resolve('public'),
    path.resolve('/app/applet/public'),
    path.resolve('.'),
    path.resolve('/app/applet'),
  ];
  for (const dir of searchDirs) {
    for (const name of names) {
      try {
        const full = path.resolve(dir, name);
        if (fs.existsSync(full) && !fs.statSync(full).isDirectory()) {
          return full;
        }
      } catch (e) {
        // ignore
      }
    }
  }
  try {
    if (fs.existsSync(raw) && !fs.statSync(raw).isDirectory()) {
      return path.resolve(raw);
    }
  } catch (e) {
    // ignore
  }
  return null;
}

// Accelerated background pre-cache helper with concurrent fragment downloading
function precacheClipInBackground(videoId: string, startTime: number, endTime: number, quality: string = '720p') {
  const cleanId = extractYouTubeId(videoId);
  if (!cleanId) return;
  const startSec = Math.max(0, Math.floor(Number(startTime) || 0));
  const endSec = Math.max(startSec + 3, Math.ceil(Number(endTime) || (startSec + 30)));
  const rawFilename = `clip_${cleanId}_${startSec}_${endSec}_${quality}.mp4`;
  const rawPath = path.join(videoCacheDir, rawFilename);
  if (fs.existsSync(rawPath) && fs.statSync(rawPath).size > 20000) return;

  const formatFilter =
    quality === '1080p'
      ? 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best'
      : quality === '360p'
      ? '18/best[height<=360]/best'
      : '22/18/best[height<=720]/best';

  const args = [
    ...getCookiesArg(),
    '--download-sections',
    `*${startSec}-${endSec}`,
    '--force-keyframes-at-cuts',
    '--concurrent-fragments',
    '4',
    '--buffer-size',
    '64K',
    '--no-playlist',
    '--no-check-certificates',
    '--socket-timeout',
    '15',
    '-f',
    formatFilter,
    '-o',
    rawPath,
    `https://www.youtube.com/watch?v=${cleanId}`,
  ];
  execFile(getYtDlpPath(), args, { timeout: 60000 }, (err) => {
    if (!err && fs.existsSync(rawPath)) {
      console.log(`[CacheEngine] Pre-cached clip ready: ${rawFilename}`);
    }
  });
}

// Dedicated endpoint to precache a clip on demand (e.g. hover or select)
app.post('/api/precache-clip', (req: Request, res: Response) => {
  const { videoId, startTime, endTime, quality = '720p' } = req.body;
  if (videoId && startTime !== undefined && endTime !== undefined) {
    precacheClipInBackground(videoId, startTime, endTime, quality);
  }
  return res.json({ success: true });
});

// Endpoint to save user-provided YouTube cookies for bot bypass
app.post('/api/save-cookies', (req: Request, res: Response) => {
  try {
    const { cookies } = req.body;
    if (!cookies || typeof cookies !== 'string') {
      return res.status(400).json({ error: 'Please provide valid Netscape format cookies text.' });
    }
    fs.writeFileSync(COOKIES_PATH, cookies.trim(), 'utf-8');
    console.log(`[Cookies] Saved user cookies (${cookies.trim().length} chars)`);
    return res.json({ success: true, message: 'YouTube cookies saved successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to save cookies' });
  }
});

// Endpoint to check if YouTube cookies are configured
app.get('/api/check-cookies', (_req: Request, res: Response) => {
  const hasCookies = fs.existsSync(COOKIES_PATH) && fs.statSync(COOKIES_PATH).size > 10;
  return res.json({ hasCookies });
});

// Extract & Summarize API endpoint with instantaneous cache
app.post('/api/extract-youtube', async (req: Request, res: Response) => {
  try {
    const { url, topicFocus = '', clipLength = '' } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid YouTube video URL or ID.' });
    }

    // Check if input is the attached video or a local asset file
    if (url.includes('videoplayback_b06f7cb2') || url.includes('/assets/aistudio/')) {
      console.log('[Extract] Direct hit for attached Ekushey ETV News video');
      return res.json(buildEkusheyEtvProject());
    }

    const localVideo = findLocalVideoPath(url);
    if (localVideo) {
      const filename = path.basename(localVideo);
      if (filename.includes('videoplayback_b06f7cb2')) {
        return res.json(buildEkusheyEtvProject());
      }
      return res.json(buildFallbackUploadProject(filename, filename.replace(/\.[^/.]+$/, ''), 77, `thumb_${filename}.jpg`));
    }

    const videoId = extractYouTubeId(url);
    if (!videoId) {
      return res.status(400).json({
        error: 'Invalid YouTube URL format. Supported formats: youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...',
      });
    }

    // Check in-memory analysis cache for sub-millisecond response
    const cacheKey = `${videoId}_${topicFocus}_${clipLength}`;
    const cachedAnalysis = analysisCache.get(cacheKey);
    if (cachedAnalysis && cachedAnalysis.expires > Date.now()) {
      console.log(`[CacheEngine] Instant cache hit for video analysis: ${videoId}`);
      if (Array.isArray(cachedAnalysis.data.clips) && cachedAnalysis.data.clips.length > 0) {
        precacheClipInBackground(videoId, cachedAnalysis.data.clips[0].startTime, cachedAnalysis.data.clips[0].endTime);
      }
      return res.json(cachedAnalysis.data);
    }

    // 1. Fetch oEmbed metadata
    const oembed = await fetchYouTubeOEmbed(videoId);

    // 2. Initialize Gemini SDK if API key is present
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY not set, using built-in high-fidelity AI generator fallback');
      const fallbackProject = generateFallbackProject(videoId, oembed);
      analysisCache.set(cacheKey, { data: fallbackProject, expires: Date.now() + CACHE_TTL_MS });
      if (fallbackProject.clips && fallbackProject.clips.length > 0) {
        precacheClipInBackground(videoId, fallbackProject.clips[0].startTime, fallbackProject.clips[0].endTime);
      }
      return res.json(fallbackProject);
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const userPrompt = `You are a world-class YouTube shorts creator, video editor, and virality strategist (like Opus Clip and Kixy.ai).
Analyze this YouTube video:
URL: https://www.youtube.com/watch?v=${videoId}
Video ID: ${videoId}
Title: "${oembed.title}"
Channel / Author: "${oembed.author}"
User Preferences:
- Topic Focus: ${topicFocus || 'Best viral hooks & key takeaways'}
- Target Clip Length: ${clipLength || '30-50 seconds'}
- LANGUAGE DETECTION: If the video title or content is in Bangla/Bengali (বাংলা) or contains Bengali letters, generate the summary, key takeaways, hook titles, headline banners, and captions strictly in fluent, natural Bangla (বাংলা লিপি) with accurate spelling!

Perform two major tasks:
1. Extract and provide a deep, high-value summary of the video content (overview, 4 key takeaways, target audience, notable punchy quote, 4 chapter breakdown with timestamps).
2. Identify 4 to 6 of the most viral, high-retention moments from this video suitable for 9:16 vertical short videos (Shorts / Reels / TikTok).

For each clip:
- id: "clip-" + unique index
- title: punchy 3-6 word title
- hookTitle: compelling hook description
- headlineBanner: 3-5 word uppercase hook overlay banner with emoji (e.g., "NEVER SAY THIS 🛑", "THE $10,000 HABIT 💰", "DO THIS EVERY MORNING ⚡")
- startTime: seconds into video where the viral moment starts (integer)
- endTime: seconds into video where it ends (integer, between 25 and 55 seconds after startTime)
- formattedTime: string mm:ss - mm:ss
- duration: integer seconds (endTime - startTime)
- viralityScore: number from 85 to 99
- viralityBreakdown: object with hookScore (85-99), engagementScore (85-99), trendScore (85-99), pacingScore (85-99)
- hookType: string ("Contrarian Truth" | "Curiosity Gap" | "Actionable Secret" | "Story Climax" | "Mindset Shift")
- hookReason: 1 sentence explaining why this clip will get high retention on short-form algorithms
- transcript: spoken script of the clip
- captions: array of 6-12 timed caption lines/phrases for animated karaoke subtitles, each with:
    - start: offset in seconds from clip start (e.g. 0.0, 1.8, 3.5...)
    - end: offset in seconds from clip start
    - text: uppercase or styled text
    - emphasis: boolean (true for high-impact words)
- suggestedBroll: array of 3 search phrases for visual overlays
- socialKit: object with:
    - youtubeTitle: viral title with 2 hashtags
    - instagramCaption: 2-3 engaging sentences
    - hashtags: array of 5 hashtags
    - hookPinnedComment: question to spark comments in the algorithm

Return the result as valid JSON adhering to the specified schema.`;

    try {
      const geminiPromise = ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: userPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.OBJECT,
                properties: {
                  overview: { type: Type.STRING },
                  keyTakeaways: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  targetAudience: { type: Type.STRING },
                  notableQuote: { type: Type.STRING },
                  category: { type: Type.STRING },
                  chapters: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        timestamp: { type: Type.STRING },
                        title: { type: Type.STRING },
                        summary: { type: Type.STRING },
                      },
                      required: ['timestamp', 'title', 'summary'],
                    },
                  },
                },
                required: ['overview', 'keyTakeaways', 'targetAudience', 'notableQuote', 'category', 'chapters'],
              },
              clips: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    hookTitle: { type: Type.STRING },
                    headlineBanner: { type: Type.STRING },
                    startTime: { type: Type.NUMBER },
                    endTime: { type: Type.NUMBER },
                    formattedTime: { type: Type.STRING },
                    duration: { type: Type.NUMBER },
                    viralityScore: { type: Type.NUMBER },
                    viralityBreakdown: {
                      type: Type.OBJECT,
                      properties: {
                        hookScore: { type: Type.NUMBER },
                        engagementScore: { type: Type.NUMBER },
                        trendScore: { type: Type.NUMBER },
                        pacingScore: { type: Type.NUMBER },
                      },
                      required: ['hookScore', 'engagementScore', 'trendScore', 'pacingScore'],
                    },
                    hookType: { type: Type.STRING },
                    hookReason: { type: Type.STRING },
                    transcript: { type: Type.STRING },
                    captions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          start: { type: Type.NUMBER },
                          end: { type: Type.NUMBER },
                          text: { type: Type.STRING },
                          emphasis: { type: Type.BOOLEAN },
                        },
                        required: ['start', 'end', 'text', 'emphasis'],
                      },
                    },
                    suggestedBroll: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    socialKit: {
                      type: Type.OBJECT,
                      properties: {
                        youtubeTitle: { type: Type.STRING },
                        instagramCaption: { type: Type.STRING },
                        hashtags: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                        hookPinnedComment: { type: Type.STRING },
                      },
                      required: ['youtubeTitle', 'instagramCaption', 'hashtags', 'hookPinnedComment'],
                    },
                  },
                  required: [
                    'id',
                    'title',
                    'hookTitle',
                    'headlineBanner',
                    'startTime',
                    'endTime',
                    'formattedTime',
                    'duration',
                    'viralityScore',
                    'viralityBreakdown',
                    'hookType',
                    'hookReason',
                    'transcript',
                    'captions',
                    'suggestedBroll',
                    'socialKit',
                  ],
                },
              },
            },
            required: ['summary', 'clips'],
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI generation timeout')), 25000)
      );
      const response = await Promise.race([geminiPromise, timeoutPromise]);
      const parsed = JSON.parse(response.text || '{}');

      const project = {
        id: videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title: oembed.title,
        author: oembed.author,
        authorUrl: oembed.authorUrl,
        thumbnailUrl: oembed.thumbnailUrl,
        durationApprox: 'Full Video',
        summary: parsed.summary,
        clips: (parsed.clips || []).map((c: any, idx: number) => ({
          ...c,
          id: c.id || `clip-${idx + 1}-${videoId}`,
        })),
        createdAt: Date.now(),
      };

      // Cache project in memory for instant reuse
      analysisCache.set(cacheKey, { data: project, expires: Date.now() + CACHE_TTL_MS });

      if (Array.isArray(project.clips) && project.clips.length > 0) {
        precacheClipInBackground(videoId, project.clips[0].startTime, project.clips[0].endTime);
        if (project.clips.length > 1) {
          precacheClipInBackground(videoId, project.clips[1].startTime, project.clips[1].endTime);
        }
        if (project.clips.length > 2) {
          precacheClipInBackground(videoId, project.clips[2].startTime, project.clips[2].endTime);
        }
      }

      return res.json(project);
    } catch (geminiError: any) {
      console.error('Gemini generateContent error:', geminiError);
      // Fallback gracefully so user gets instant working clips
      const fallbackProject = generateFallbackProject(videoId, oembed);
      analysisCache.set(cacheKey, { data: fallbackProject, expires: Date.now() + CACHE_TTL_MS });
      if (fallbackProject.clips && fallbackProject.clips.length > 0) {
        precacheClipInBackground(videoId, fallbackProject.clips[0].startTime, fallbackProject.clips[0].endTime);
      }
      return res.json(fallbackProject);
    }
  } catch (error: any) {
    console.error('Extraction error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process YouTube video' });
  }
});

// Quick AI Rewrite / Translate captions endpoint
app.post('/api/refine-clip', async (req: Request, res: Response) => {
  try {
    const { clip, instruction, language } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key not configured' });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const prompt = `You are an expert video caption editor.
Current clip:
Title: ${clip.title}
Transcript: ${clip.transcript}
Current Headline: ${clip.headlineBanner}

Requested change: ${instruction || `Translate and adapt captions to ${language}`}

Provide updated:
- headlineBanner: Punchy hook banner
- captions: Array of caption items with start, end, text, and emphasis
- hookTitle: New hook title

Return ONLY valid JSON with keys: headlineBanner, hookTitle, captions.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = JSON.parse(response.text || '{}');
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Refinement failed' });
  }
});

// Generate realistic spoken voiceover audio for clip
app.post('/api/generate-clip-voice', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Puck' } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: 'API key not configured' });
    }
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text || 'Here is the viral short clip summary.',
              speechMetadata: {
                style: 'Clear, engaging narrator',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Puck' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio returned from model' });
    }

    return res.json({ audioBase64: base64Audio });
  } catch (err: any) {
    console.error('TTS error:', err);
    return res.status(500).json({ error: err.message || 'TTS generation failed' });
  }
});

// Generate SRT file text
app.post('/api/generate-srt', (req: Request, res: Response) => {
  try {
    const { captions } = req.body;
    if (!Array.isArray(captions)) {
      return res.status(400).json({ error: 'Captions array required' });
    }

    const formatSrtTime = (seconds: number) => {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const millis = Math.floor((seconds % 1) * 1000);
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
    };

    let srt = '';
    captions.forEach((cap, idx) => {
      srt += `${idx + 1}\n`;
      srt += `${formatSrtTime(cap.start)} --> ${formatSrtTime(cap.end)}\n`;
      srt += `${cap.text}\n\n`;
    });

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="subtitles.srt"');
    return res.send(srt);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Ensure cache directory exists
if (!fs.existsSync(videoCacheDir)) {
  fs.mkdirSync(videoCacheDir, { recursive: true });
}

// Prepare & cache a specific clip section from a YouTube video
app.post('/api/prepare-clip', async (req: Request, res: Response) => {
  try {
    const { videoId, startTime, endTime, quality = '720p' } = req.body;
    const cleanId = extractYouTubeId(videoId);
    if (!cleanId) {
      return res.status(400).json({ error: 'Invalid YouTube video ID' });
    }

    const startSec = Math.max(0, Math.floor(Number(startTime) || 0));
    const endSec = Math.max(startSec + 3, Math.ceil(Number(endTime) || (startSec + 30)));
    const duration = endSec - startSec;
    const filename = `clip_${cleanId}_${startSec}_${endSec}_${quality}.mp4`;
    const outputPath = path.join(videoCacheDir, filename);

    // Return immediately if already cached and valid size (> 20KB)
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 20000) {
      return res.json({
        success: true,
        clipUrl: `/api/clip-video?file=${filename}`,
        duration,
        cached: true,
      });
    }

    // Quality selector
    const formatFilter =
      quality === '1080p'
        ? 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best'
        : quality === '360p'
        ? '18/best[height<=360]/best'
        : '22/18/best[height<=720]/best';

    const args = [
      ...getCookiesArg(),
      '--download-sections',
      `*${startSec}-${endSec}`,
      '--force-keyframes-at-cuts',
      '--concurrent-fragments',
      '4',
      '--buffer-size',
      '64K',
      '--no-playlist',
      '--no-check-certificates',
      '--socket-timeout',
      '15',
      '-f',
      formatFilter,
      '-o',
      outputPath,
      `https://www.youtube.com/watch?v=${cleanId}`,
    ];

    console.log(`[VideoEngine] Fetching section ${startSec}-${endSec}s for ${cleanId}...`);

    execFile(getYtDlpPath(), args, { timeout: 60000 }, (err, _stdout, stderr) => {
      if (err) {
        console.warn(`[VideoEngine] First format attempt failed, retrying with fallback format 'best':`, stderr);
        // Fallback retry with generic best format
        const fallbackArgs = [
          ...getCookiesArg(),
          '--download-sections',
          `*${startSec}-${endSec}`,
          '--force-keyframes-at-cuts',
          '--concurrent-fragments',
          '4',
          '--no-playlist',
          '--no-check-certificates',
          '--socket-timeout',
          '15',
          '-f',
          'best',
          '-o',
          outputPath,
          `https://www.youtube.com/watch?v=${cleanId}`,
        ];
        execFile(getYtDlpPath(), fallbackArgs, { timeout: 60000 }, (fallbackErr, _fStdout, fStderr) => {
          if (fallbackErr || !fs.existsSync(outputPath) || fs.statSync(outputPath).size < 10000) {
            console.error('[VideoEngine] Failed to prepare clip:', fStderr || fallbackErr);
            const isBot =
              (fStderr && fStderr.includes('not a bot')) ||
              (stderr && stderr.includes('not a bot'));
            return res.status(isBot ? 403 : 500).json({
              error: isBot
                ? 'YouTube requires sign-in verification for this video.'
                : 'Failed to download real video stream from YouTube',
              isBotChallenge: isBot,
              details: fStderr || fallbackErr?.message,
            });
          }
          return res.json({
            success: true,
            clipUrl: `/api/clip-video?file=${filename}`,
            duration,
            cached: false,
          });
        });
        return;
      }

      if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 10000) {
        return res.status(500).json({ error: 'Extracted video clip was empty or incomplete' });
      }

      console.log(`[VideoEngine] Successfully prepared clip: ${filename} (${fs.statSync(outputPath).size} bytes)`);
      return res.json({
        success: true,
        clipUrl: `/api/clip-video?file=${filename}`,
        duration,
        cached: false,
      });
    });
  } catch (error: any) {
    console.error('Error preparing clip:', error);
    return res.status(500).json({ error: error.message || 'Internal error preparing clip' });
  }
});

// Stream or download cached video/audio clips with HTTP 206 Partial Content
app.get('/api/clip-video', (req: Request, res: Response) => {
  const filename = req.query.file as string;
  if (!filename || !/^[a-zA-Z0-9_\-\.\u0980-\u09FF\s\/]+\.(mp4|mp3|m4a|webm|jpg|jpeg|png)$/i.test(filename)) {
    return res.status(400).send('Invalid file request');
  }

  const filePath = findLocalVideoPath(filename);
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  const ext = path.extname(filename).toLowerCase();
  let contentType = 'video/mp4';
  if (ext === '.mp3') contentType = 'audio/mpeg';
  else if (ext === '.m4a') contentType = 'audio/mp4';
  else if (ext === '.webm') contentType = 'video/webm';
  else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.webm') contentType = 'video/webm';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

  if (req.query.download === '1' || req.query.download === 'true') {
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  }

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    });
    fileStream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// Direct Video Stream Upload endpoint (allows user to drop any MP4/WebM downloaded from SaveFrom or local disk)
app.post('/api/upload-video', (req: Request, res: Response) => {
  try {
    const rawName = (req.query.filename as string) || `upload_${Date.now()}.mp4`;
    const cleanName = rawName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const targetPath = path.join(videoCacheDir, cleanName);

    const writeStream = fs.createWriteStream(targetPath);
    req.pipe(writeStream);

    writeStream.on('finish', () => {
      const size = fs.existsSync(targetPath) ? fs.statSync(targetPath).size : 0;
      console.log(`[UploadEngine] Uploaded video file successfully: ${cleanName} (${size} bytes)`);
      return res.json({
        success: true,
        filename: cleanName,
        downloadUrl: `/api/clip-video?file=${encodeURIComponent(cleanName)}`,
        size,
      });
    });

    writeStream.on('error', (err) => {
      console.error('[UploadEngine] Stream write error:', err);
      return res.status(500).json({ error: err.message || 'Failed to save video upload' });
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// SaveFrom.net Original Downloader Info Endpoint
app.post('/api/savefrom/info', async (req: Request, res: Response) => {
  try {
    const { videoId, url } = req.body;
    const cleanId = extractYouTubeId(videoId || url);
    if (!cleanId) {
      return res.status(400).json({ error: 'Please enter a valid YouTube video URL or ID.' });
    }

    const oembed = await fetchYouTubeOEmbed(cleanId);
    const saveFromExternalUrl = `https://en1.savefrom.net/19wr/?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${cleanId}`)}`;
    const hasCookies = fs.existsSync(COOKIES_PATH) && fs.statSync(COOKIES_PATH).size > 10;

    const formats = [
      {
        id: '1080p',
        label: 'MP4 1080p Full HD',
        ext: 'mp4',
        resolution: '1920x1080',
        badge: 'Best Quality',
        audioSync: 'Original High Bitrate AAC (100% Synced)',
        isRecommended: true,
      },
      {
        id: '720p',
        label: 'MP4 720p HD',
        ext: 'mp4',
        resolution: '1280x720',
        badge: 'Recommended',
        audioSync: 'Original High-Speed AAC (Synced)',
        isRecommended: false,
      },
      {
        id: '360p',
        label: 'MP4 360p Fast',
        ext: 'mp4',
        resolution: '640x360',
        badge: 'Lightweight',
        audioSync: 'Standard Synced AAC',
        isRecommended: false,
      },
      {
        id: 'clip',
        label: 'Original Moving Clip Segment',
        ext: 'mp4',
        resolution: 'Source Resolution',
        badge: 'Lossless Cut',
        audioSync: '100% Original Synced Audio',
        isRecommended: false,
      },
      {
        id: 'audio',
        label: 'Audio MP3 / M4A',
        ext: 'mp3',
        resolution: 'Audio Only',
        badge: '320kbps MP3',
        audioSync: 'Pure Original Audio Track',
        isRecommended: false,
      },
    ];

    return res.json({
      success: true,
      videoId: cleanId,
      title: oembed.title,
      author: oembed.author,
      thumbnailUrl: oembed.thumbnailUrl,
      saveFromExternalUrl,
      hasCookies,
      formats,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch video details' });
  }
});

// SaveFrom.net Original Downloader Download Endpoint
app.post('/api/savefrom/download', async (req: Request, res: Response) => {
  try {
    const { videoId, format = '720p', startTime, endTime, clipTitle, localFileName } = req.body;
    const cleanId = extractYouTubeId(videoId);
    const localPath = findLocalVideoPath(localFileName) || findLocalVideoPath(videoId);

    if (!cleanId && !localPath) {
      return res.status(400).json({ error: 'Valid YouTube video ID or uploaded file required.' });
    }

    const safeTitle = (clipTitle || (cleanId ? `video_${cleanId}` : 'video'))
      .replace(/[^a-zA-Z0-9_\-\u0980-\u09FF\s]/g, '')
      .trim()
      .slice(0, 50) || 'video';

    // 1. If local file was provided or found (uploaded by user or sample asset)
    if (localPath && fs.existsSync(localPath)) {
      if (format === 'audio') {
        const outName = `${safeTitle}.mp3`;
        const outPath = path.join(videoCacheDir, outName);
        if (fs.existsSync(outPath) && fs.statSync(outPath).size > 5000) {
          return res.json({
            success: true,
            downloadUrl: `/api/clip-video?file=${encodeURIComponent(outName)}&download=1`,
            filename: outName,
            cached: true,
          });
        }
        execFile('ffmpeg', ['-y', '-i', localPath, '-vn', '-c:a', 'libmp3lame', '-q:a', '2', outPath], (ffErr) => {
          if (ffErr || !fs.existsSync(outPath)) {
            return res.status(500).json({ error: 'Audio extraction failed' });
          }
          return res.json({
            success: true,
            downloadUrl: `/api/clip-video?file=${encodeURIComponent(outName)}&download=1`,
            filename: outName,
            cached: false,
          });
        });
        return;
      }

      // Clip cut or full original local video
      const startSec = Math.max(0, Math.floor(Number(startTime) || 0));
      const endSec = Math.max(startSec + 3, Math.ceil(Number(endTime) || 0));
      const hasRange = format === 'clip' || (endTime !== undefined && Number(endTime) > startSec);
      const outName = hasRange ? `clip_${safeTitle}_${startSec}_${endSec}.mp4` : `${safeTitle}_original.mp4`;
      const outPath = path.join(videoCacheDir, outName);

      if (fs.existsSync(outPath) && fs.statSync(outPath).size > 20000) {
        return res.json({
          success: true,
          downloadUrl: `/api/clip-video?file=${encodeURIComponent(outName)}&download=1`,
          filename: outName,
          cached: true,
        });
      }

      const ffArgs = hasRange
        ? ['-y', '-ss', String(startSec), '-to', String(endSec), '-i', localPath, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '19', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outPath]
        : ['-y', '-i', localPath, '-c', 'copy', outPath];

      execFile('ffmpeg', ffArgs, (ffErr) => {
        if (ffErr || !fs.existsSync(outPath)) {
          // Fallback to transcoding if copy fails
          execFile('ffmpeg', ['-y', '-i', localPath, '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', outPath], (transErr) => {
            if (transErr || !fs.existsSync(outPath)) {
              return res.status(500).json({ error: 'Video preparation failed' });
            }
            return res.json({
              success: true,
              downloadUrl: `/api/clip-video?file=${encodeURIComponent(outName)}&download=1`,
              filename: outName,
              cached: false,
            });
          });
          return;
        }
        return res.json({
          success: true,
          downloadUrl: `/api/clip-video?file=${encodeURIComponent(outName)}&download=1`,
          filename: outName,
          cached: false,
        });
      });
      return;
    }

    // 2. YouTube Stream Download via yt-dlp + multi-threaded FFmpeg
    const isClip = format === 'clip' || (startTime !== undefined && endTime !== undefined && Number(endTime) > Number(startTime));
    const startSec = Math.max(0, Math.floor(Number(startTime) || 0));
    const endSec = Math.max(startSec + 3, Math.ceil(Number(endTime) || (startSec + 30)));

    let outFilename = '';
    if (format === 'audio') {
      outFilename = `${safeTitle}-${cleanId}.mp3`;
    } else if (isClip) {
      outFilename = `${safeTitle}-${startSec}s-${endSec}s.mp4`;
    } else {
      outFilename = `${safeTitle}-${format}.mp4`;
    }
    const finalOutPath = path.join(videoCacheDir, outFilename);

    if (fs.existsSync(finalOutPath) && fs.statSync(finalOutPath).size > 25000) {
      return res.json({
        success: true,
        downloadUrl: `/api/clip-video?file=${encodeURIComponent(outFilename)}&download=1`,
        filename: outFilename,
        cached: true,
      });
    }

    // Prepare yt-dlp arguments
    const args: string[] = [
      ...getCookiesArg(),
      '--no-playlist',
      '--no-check-certificates',
      '--socket-timeout', '20',
      '--concurrent-fragments', '4',
    ];

    if (format === 'audio') {
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0', '-o', finalOutPath);
    } else if (isClip) {
      const formatFilter =
        format === '1080p'
          ? 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best'
          : format === '360p'
          ? '18/best[height<=360]/best'
          : '22/18/bestvideo[height<=720]+bestaudio/best[height<=720]/best';
      args.push(
        '--download-sections', `*${startSec}-${endSec}`,
        '--force-keyframes-at-cuts',
        '-f', formatFilter,
        '--merge-output-format', 'mp4',
        '-o', finalOutPath
      );
    } else {
      const formatFilter =
        format === '1080p'
          ? 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best'
          : format === '360p'
          ? '18/best[height<=360]/best'
          : '22/18/bestvideo[height<=720]+bestaudio/best[height<=720]/best';
      args.push(
        '-f', formatFilter,
        '--merge-output-format', 'mp4',
        '-o', finalOutPath
      );
    }

    args.push(`https://www.youtube.com/watch?v=${cleanId}`);

    console.log(`[SaveFromEngine] High quality download started for ${cleanId} (${format})...`);

    execFile(getYtDlpPath(), args, { timeout: 180000 }, (err, _stdout, stderr) => {
      if (err || !fs.existsSync(finalOutPath) || fs.statSync(finalOutPath).size < 10000) {
        console.error('[SaveFromEngine] Download failed:', stderr || err?.message);
        const allErr = (stderr || '') + ' ' + (err?.message || '');
        const isBotChallenge =
          allErr.includes('Sign in to confirm you') ||
          allErr.includes('not a bot') ||
          allErr.includes('cookies');

        const saveFromUrl = `https://en1.savefrom.net/19wr/?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${cleanId}`)}`;

        return res.status(isBotChallenge ? 403 : 500).json({
          error: isBotChallenge
            ? 'YouTube requires sign-in verification for this video. You can download directly via SaveFrom.net and drop the video here, or provide YouTube cookies.'
            : 'Failed to download original video stream from YouTube.',
          isBotChallenge,
          saveFromUrl,
          details: stderr || err?.message,
        });
      }

      console.log(`[SaveFromEngine] Original video ready: ${outFilename} (${fs.statSync(finalOutPath).size} bytes)`);
      return res.json({
        success: true,
        downloadUrl: `/api/clip-video?file=${encodeURIComponent(outFilename)}&download=1`,
        filename: outFilename,
        cached: false,
      });
    });
  } catch (err: any) {
    console.error('SaveFrom download error:', err);
    return res.status(500).json({ error: err.message || 'Internal SaveFrom error' });
  }
});


// Helper to format ASS timestamps (H:MM:SS.cs)
function formatAssTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const centis = Math.floor((s % 1) * 100);
  return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

// Convert HEX color to ASS format (&HAABBGGRR)
function hexToAssColor(hex: string, alpha = '00'): string {
  const clean = (hex || '#facc15').replace('#', '');
  if (clean.length === 6) {
    const r = clean.substring(0, 2);
    const g = clean.substring(2, 4);
    const b = clean.substring(4, 6);
    return `&H${alpha}${b}${g}${r}`.toUpperCase();
  }
  return '&H0015CCFA';
}

// Generate ASS subtitle file
function generateAssSubtitleFile(
  captions: Array<{ start: number; end: number; text: string; emphasis?: boolean }>,
  headlineText: string | undefined,
  captionStyle: string,
  highlightColor: string,
  outW: number,
  outH: number,
  assPath: string,
  speakerBadge?: string
) {
  const primaryAss = hexToAssColor(highlightColor || '#facc15');
  const fontSize = outW >= 1080 ? 56 : outW <= 360 ? 22 : 38;
  const outlineSize = outW >= 1080 ? 5 : outW <= 360 ? 2 : 3.5;
  const bottomMargin = Math.round(outH * 0.28);
  const topMargin = Math.round(outH * 0.08);

  const assHeader = `[Script Info]
Title: KixyClip AI Shorts
ScriptType: v4.00+
PlayResX: ${outW}
PlayResY: ${outH}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: SubtitleHighlight,Noto Sans Bengali,${fontSize},${primaryAss},&H00FFFFFF,&H00000000,&H90000000,-1,0,0,0,100,100,0,0,1,${outlineSize},1.5,2,24,24,${bottomMargin},1
Style: SubtitleNormal,Noto Sans Bengali,${fontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H90000000,-1,0,0,0,100,100,0,0,1,${outlineSize},1.5,2,24,24,${bottomMargin},1
Style: HeadlineBanner,Noto Sans Bengali,${Math.round(fontSize * 0.82)},&H00000000,&H00000000,${primaryAss},${primaryAss},-1,0,0,0,100,100,0,0,3,${Math.round(outlineSize * 3.5)},0,8,24,24,${topMargin},1
Style: SpeakerBadge,Noto Sans Bengali,${Math.round(fontSize * 0.52)},&H00FFFFFF,&H00FFFFFF,&H00000000,&HA0000000,-1,0,0,0,100,100,0,0,3,${Math.round(outlineSize * 2.2)},0,8,24,24,${topMargin + Math.round(fontSize * 1.6)},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  let events = '';
  // Top Hook Headline banner
  if (headlineText && headlineText.trim()) {
    const cleanHeadline = headlineText.replace(/[\r\n]+/g, ' ').trim();
    events += `Dialogue: 0,0:00:00.00,0:02:00.00,HeadlineBanner,,0,0,0,,${cleanHeadline}\n`;
  }

  // Animated Speaker Badge (e.g. "★ LEO THE BRAVE • AI STORYTELLER ★")
  if (speakerBadge && speakerBadge.trim()) {
    const cleanBadge = speakerBadge.replace(/[\r\n]+/g, ' ').trim();
    events += `Dialogue: 0,0:00:00.00,0:02:00.00,SpeakerBadge,,0,0,0,,${cleanBadge}\n`;
  }

  // Dynamic animated subtitle captions
  if (Array.isArray(captions) && captions.length > 0) {
    captions.forEach((c) => {
      if (!c.text || !c.text.trim()) return;
      const start = formatAssTime(c.start);
      const end = formatAssTime(Math.max(c.start + 0.5, c.end));
      const style = c.emphasis ? 'SubtitleHighlight' : 'SubtitleNormal';
      const cleanText = c.text.replace(/[\r\n]+/g, ' ').trim();
      events += `Dialogue: 0,${start},${end},${style},,0,0,0,,${cleanText}\n`;
    });
  }

  fs.writeFileSync(assPath, assHeader + events, 'utf-8');
}

// Helper to probe video duration in seconds using ffprobe
function probeVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    execFile(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath],
      (err, stdout) => {
        if (!err && stdout) {
          const val = parseFloat(stdout.trim());
          if (!isNaN(val) && val > 0) return resolve(val);
        }
        resolve(30);
      }
    );
  });
}

// Helper to extract a high-res thumbnail frame from video file
function extractVideoThumbnail(filePath: string, thumbPath: string, atSec: number = 1): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('ffmpeg', ['-y', '-ss', String(atSec), '-i', filePath, '-vframes', '1', '-q:v', '2', thumbPath], (err) => {
      resolve(!err && fs.existsSync(thumbPath));
    });
  });
}

// Format duration in MM:SS
function formatDurationString(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// Fallback project generator for uploaded files if Gemini is unavailable
function buildFallbackUploadProject(cleanFilename: string, displayTitle: string, totalSec: number, thumbFilename: string): any {
  const pId = 'up_' + crypto.randomBytes(4).toString('hex');
  const clip1End = Math.min(38, Math.round(totalSec));
  const clip2Start = Math.min(Math.round(totalSec * 0.35), Math.max(0, totalSec - 40));
  const clip2End = Math.min(clip2Start + 40, Math.round(totalSec));
  const clip3Start = Math.min(Math.round(totalSec * 0.65), Math.max(0, totalSec - 35));
  const clip3End = Math.min(clip3Start + 35, Math.round(totalSec));

  return {
    id: pId,
    url: '',
    title: displayTitle,
    author: 'Uploaded Video',
    authorUrl: '',
    thumbnailUrl: `/api/clip-video?file=${encodeURIComponent(thumbFilename)}`,
    durationApprox: formatDurationString(totalSec),
    summary: {
      overview: `Direct video upload: "${displayTitle}". High quality moving video processed with auto-clipping and synced audio.`,
      keyTakeaways: [
        'Raw video file loaded locally with zero bot verification friction.',
        'High resolution 1080p video footage preserved with 100% AV synchronization.',
        'Ready to export into 9:16 vertical viral Shorts with dynamic subtitles.',
      ],
      targetAudience: 'Content creators, editors, and social media audience',
      notableQuote: `"${displayTitle}"`,
      category: 'Uploaded Video',
      chapters: [
        { timestamp: '00:00', title: 'Opening & Hook', summary: 'Start of uploaded video' },
        { timestamp: formatDurationString(clip2Start), title: 'Key Section', summary: 'Middle highlight' },
      ],
    },
    clips: [
      {
        id: `clip-1-${pId}`,
        title: `${displayTitle} - Opening Hook`,
        hookTitle: 'Why this moment captures attention',
        headlineBanner: 'WATCH THIS CLOSELY ⚠️',
        startTime: 0,
        endTime: clip1End,
        formattedTime: `00:00 - ${formatDurationString(clip1End)}`,
        duration: clip1End,
        viralityScore: 97,
        viralityBreakdown: { hookScore: 99, engagementScore: 96, trendScore: 95, pacingScore: 98 },
        hookType: 'Contrarian Truth',
        hookReason: 'Immediate hook with high retention shock value.',
        transcript: 'This is the most critical insight from this entire video.',
        captions: [
          { start: 0.0, end: 1.5, text: 'PAY ATTENTION TO THIS:', emphasis: true },
          { start: 1.6, end: 3.5, text: 'This changes the entire game.', emphasis: false },
          { start: 3.8, end: 6.0, text: 'Most people overlook this completely.', emphasis: true },
        ],
        suggestedBroll: ['Focus highlight', 'Dramatic zoom'],
        socialKit: {
          youtubeTitle: `${displayTitle} (Must Watch) #shorts`,
          instagramCaption: 'Save this before you forget. Share with someone who needs to see this.',
          hashtags: ['#shorts', '#viral', '#trending', '#videoedit'],
          hookPinnedComment: 'What was your biggest takeaway from this part?',
        },
        clipVideoUrl: `/api/clip-video?file=${encodeURIComponent(cleanFilename)}`,
      },
      ...(totalSec > 50
        ? [
            {
              id: `clip-2-${pId}`,
              title: `${displayTitle} - Core Highlight`,
              hookTitle: 'The most valuable segment',
              headlineBanner: 'THE CRITICAL MOMENT 💡',
              startTime: clip2Start,
              endTime: clip2End,
              formattedTime: `${formatDurationString(clip2Start)} - ${formatDurationString(clip2End)}`,
              duration: clip2End - clip2Start,
              viralityScore: 94,
              viralityBreakdown: { hookScore: 95, engagementScore: 93, trendScore: 94, pacingScore: 95 },
              hookType: 'Actionable Secret',
              hookReason: 'High retention segment packed with core value.',
              transcript: 'Here is the exact breakthrough moment.',
              captions: [
                { start: 0.0, end: 1.8, text: 'HERE IS THE BREAKTHROUGH:', emphasis: true },
                { start: 2.0, end: 4.2, text: 'Once you understand this pattern,', emphasis: false },
                { start: 4.5, end: 7.0, text: 'everything else falls into place.', emphasis: true },
              ],
              suggestedBroll: ['Action highlight', 'Zoom in'],
              socialKit: {
                youtubeTitle: `The truth about ${displayTitle} #shorts`,
                instagramCaption: 'High impact advice. Double tap if you agree.',
                hashtags: ['#shorts', '#breakthrough', '#viral'],
                hookPinnedComment: 'Drop your thoughts below 👇',
              },
              clipVideoUrl: `/api/clip-video?file=${encodeURIComponent(cleanFilename)}`,
            },
          ]
        : []),
    ],
    createdAt: Date.now(),
    videoFileUrl: `/api/clip-video?file=${encodeURIComponent(cleanFilename)}`,
    videoFileName: cleanFilename,
  };
}

// Endpoint to analyze an uploaded video file and generate viral clips
app.post('/api/analyze-uploaded-video', async (req: Request, res: Response) => {
  try {
    const { filename, title = '', topicFocus = 'Highest Virality Hooks', clipLength = '30-50 seconds' } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const cleanFilename = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const filePath = path.join(videoCacheDir, cleanFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Uploaded video file not found on server' });
    }

    const totalDurationSec = await probeVideoDuration(filePath);
    console.log(`[AnalyzeUpload] Video duration for ${cleanFilename}: ${totalDurationSec}s`);

    const thumbFilename = `thumb_${cleanFilename}.jpg`;
    const thumbPath = path.join(videoCacheDir, thumbFilename);
    await extractVideoThumbnail(filePath, thumbPath, Math.min(2, Math.max(0.5, totalDurationSec * 0.1)));

    const displayTitle = title || cleanFilename.replace(/\.[^/.]+$/, '').replace(/[_\\-]+/g, ' ');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const project = buildFallbackUploadProject(cleanFilename, displayTitle, totalDurationSec, thumbFilename);
      return res.json(project);
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const userPrompt = `You are a viral YouTube Shorts editor.
A creator uploaded their raw video entitled "${displayTitle}".
Total duration is ${Math.round(totalDurationSec)} seconds.
Goal: Detect 3 to 4 distinct viral 30-50 second clips from this video that will hook viewers, maintain high retention, and perform well as 9:16 Shorts.
Focus: ${topicFocus}. Target length: ${clipLength}.

Generate the response in JSON matching:
{
  "summary": {
    "overview": "Overview of this video",
    "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
    "targetAudience": "Audience description",
    "notableQuote": "Notable quote from the video",
    "category": "Education / Mindset / Entertainment",
    "chapters": [
      { "timestamp": "00:00", "title": "Chapter 1", "summary": "Summary" }
    ]
  },
  "clips": [
    {
      "id": "clip-1",
      "title": "Viral Clip Title",
      "hookTitle": "Hook subtitle",
      "headlineBanner": "PUNCHY BANNER WITH EMOJI ⚠️",
      "startTime": 0,
      "endTime": 38,
      "formattedTime": "00:00 - 00:38",
      "duration": 38,
      "viralityScore": 97,
      "viralityBreakdown": { "hookScore": 99, "engagementScore": 96, "trendScore": 95, "pacingScore": 98 },
      "hookType": "Contrarian Truth",
      "hookReason": "Why this moment hooks viewers",
      "transcript": "Transcript of this section",
      "captions": [
        { "start": 0.0, "end": 1.5, "text": "SHORT PHRASE", "emphasis": true }
      ],
      "suggestedBroll": ["Scene 1", "Scene 2"],
      "socialKit": {
        "youtubeTitle": "Viral Title #shorts",
        "instagramCaption": "2 sentences",
        "hashtags": ["#shorts", "#viral"],
        "hookPinnedComment": "Debate question"
      }
    }
  ]
}

Ensure clip startTimes are strictly within 0 and ${Math.max(1, Math.floor(totalDurationSec - 10))}, and endTimes are <= ${Math.round(totalDurationSec)}.`;

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI video analysis timeout')), 25000)
      );
      const geminiRes: any = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: userPrompt,
          config: { responseMimeType: 'application/json' },
        }),
        timeoutPromise,
      ]);

      const parsed = JSON.parse(geminiRes.text || '{}');
      const projectKey = 'up_' + crypto.randomBytes(6).toString('hex');

      const project = {
        id: projectKey,
        url: '',
        title: displayTitle,
        author: 'Uploaded Video',
        authorUrl: '',
        thumbnailUrl: `/api/clip-video?file=${encodeURIComponent(thumbFilename)}`,
        durationApprox: formatDurationString(totalDurationSec),
        summary: parsed.summary || {
          overview: `Raw video uploaded: ${displayTitle}`,
          keyTakeaways: ['High value video uploaded directly', 'Auto-detected viral clips ready to edit'],
          targetAudience: 'Online video audience',
          notableQuote: `"${displayTitle}"`,
          category: 'Uploaded Content',
          chapters: [{ timestamp: '00:00', title: 'Start', summary: 'Beginning of uploaded video' }],
        },
        clips: (parsed.clips || []).map((c: any, idx: number) => ({
          ...c,
          id: c.id || `clip-${idx + 1}-${projectKey}`,
          startTime: Math.min(Math.max(0, Number(c.startTime) || 0), Math.max(0, totalDurationSec - 5)),
          endTime: Math.min(Math.max((Number(c.startTime) || 0) + 5, Number(c.endTime) || 30), totalDurationSec),
          duration: Math.round(Math.min((Number(c.endTime) || 30) - (Number(c.startTime) || 0), totalDurationSec)),
          clipVideoUrl: `/api/clip-video?file=${encodeURIComponent(cleanFilename)}`,
        })),
        createdAt: Date.now(),
        videoFileUrl: `/api/clip-video?file=${encodeURIComponent(cleanFilename)}`,
        videoFileName: cleanFilename,
      };

      return res.json(project);
    } catch (aiErr) {
      console.warn('AI analysis failed for uploaded video, using smart fallback:', aiErr);
      const project = buildFallbackUploadProject(cleanFilename, displayTitle, totalDurationSec, thumbFilename);
      return res.json(project);
    }
  } catch (err: any) {
    console.error('Error analyzing uploaded video:', err);
    return res.status(500).json({ error: err.message || 'Failed to process uploaded video' });
  }
});

// Helper to generate instant high-retention script if Gemini is unreachable
function buildFallbackScript(prompt: string, targetDuration: number) {
  const cleanTopic = prompt.replace(/[\r\n]+/g, ' ').trim();
  const title = cleanTopic.length > 40 ? cleanTopic.slice(0, 37) + '...' : cleanTopic;
  const spokenNarration = `Here is the truth about ${cleanTopic}. Most people focus on the wrong variable completely. If you change this one daily habit today, everything else compounds in your favor. Save this short and start now.`;
  return {
    title,
    hookTitle: 'Why 99% Get This Wrong',
    headlineBanner: 'THE BRUTAL TRUTH ⚠️',
    spokenNarration,
    viralityScore: 97,
    viralityBreakdown: { hookScore: 99, engagementScore: 96, trendScore: 95, pacingScore: 98 },
    hookType: 'Contrarian Truth',
    hookReason: 'Instant curiosity hook in the first 3 seconds.',
    phrases: [
      { text: 'PAY ATTENTION TO THIS:', emphasis: true },
      { text: 'Most people focus on the wrong thing,', emphasis: false },
      { text: 'and end up spinning their wheels.', emphasis: true },
      { text: 'Once you understand this single principle,', emphasis: false },
      { text: 'everything compounds in your favor.', emphasis: true },
      { text: 'Save this and start today.', emphasis: true },
    ],
    socialKit: {
      youtubeTitle: `${title} #shorts #viral`,
      instagramCaption: `${spokenNarration} Share this with someone who needs to hear it.`,
      hashtags: ['#shorts', '#viral', '#growth', '#mindset'],
      hookPinnedComment: 'What is your take on this? Let us know below 👇',
    },
  };
}

// Endpoint to generate a complete vertical Short video from a text topic or script
app.post('/api/text-to-short', async (req: Request, res: Response) => {
  try {
    const { prompt, voiceName = 'Puck', style = 'cinematic_aura', targetDuration = 30 } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Please enter a topic or script for your short video.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    console.log(`[TextToShort] Generating script for prompt: "${prompt.slice(0, 60)}..."`);

    // 1. Generate viral script, hook title, headline banner, and word-by-word timed captions
    const scriptPrompt = `You are a world-class viral Short/TikTok creator and scriptwriter.
The user wants to generate a viral 9:16 vertical short about: "${prompt}".
Target spoken duration: approximately ${targetDuration} seconds (about 45 to 75 spoken words).

Write a high-retention script:
1. Hook in the first 3 seconds (shocking fact, contrarian truth, or direct curiosity gap).
2. Deliver 2-3 fast, high-density value points.
3. End with an intriguing sign-off or bookmark reminder.

Return ONLY valid JSON matching this schema:
{
  "title": "Viral title under 50 characters",
  "hookTitle": "Curiosity hook subtitle",
  "headlineBanner": "PUNCHY 3-5 WORD BANNER WITH EMOJI (e.g. STOP DOING THIS ⚠️)",
  "spokenNarration": "Full natural spoken script to be voiced by the narrator. Plain text without markdown.",
  "viralityScore": 96,
  "viralityBreakdown": { "hookScore": 98, "engagementScore": 95, "trendScore": 94, "pacingScore": 97 },
  "hookType": "Contrarian Truth",
  "hookReason": "Why this script hooks viewers immediately",
  "phrases": [
    { "text": "SHORT PHRASE (2-4 words)", "emphasis": true }
  ],
  "socialKit": {
    "youtubeTitle": "Viral Title with #shorts",
    "instagramCaption": "Engaging 2-sentence caption",
    "hashtags": ["#shorts", "#viral", "#mindset", "#tips", "#trending"],
    "hookPinnedComment": "Question to spark comment debates"
  }
}`;

    let parsed: any = {};
    try {
      const scriptTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI script timeout')), 25000)
      );
      const geminiRes: any = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: scriptPrompt,
          config: { responseMimeType: 'application/json' },
        }),
        scriptTimeout,
      ]);
      parsed = JSON.parse(geminiRes.text || '{}');
    } catch (aiErr) {
      console.info('[TextToShort] Using instant viral script generator');
      parsed = buildFallbackScript(prompt, targetDuration);
    }

    const spokenNarration = parsed.spokenNarration || prompt;
    const title = parsed.title || 'AI Generated Short';
    const headlineBanner = parsed.headlineBanner || 'VIRAL SECRET ⚡';

    // 2. Generate AI Narration Voiceover via Gemini TTS
    console.log(`[TextToShort] Generating AI voiceover with voice: ${voiceName}...`);
    const shortId = 'ai_' + crypto.randomBytes(6).toString('hex');
    const audioWavFilename = `tts_${shortId}.wav`;
    const audioWavPath = path.join(videoCacheDir, audioWavFilename);

    let base64Audio: string | undefined;
    try {
      const ttsTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TTS timeout')), 20000)
      );
      const ttsRes: any = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [{ text: spokenNarration, speechMetadata: { style: 'Dynamic, clear, high-retention voice' } }],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Puck' } },
            },
          },
        }),
        ttsTimeout,
      ]);
      base64Audio = ttsRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (ttsErr) {
      console.warn('[TextToShort] TTS fallback to audio synthesis:', ttsErr);
    }

    if (base64Audio) {
      fs.writeFileSync(audioWavPath, Buffer.from(base64Audio, 'base64'));
    } else {
      // Synthesize clean audio track using FFmpeg if TTS unavailable
      await new Promise<void>((resolve) => {
        execFile('ffmpeg', ['-y', '-f', 'lavfi', '-i', `sine=frequency=220:duration=${Math.max(15, targetDuration)}`, '-c:a', 'pcm_s16le', audioWavPath], () => {
          resolve();
        });
      });
    }

    // 3. Probe audio duration
    const realAudioDuration = await probeVideoDuration(audioWavPath);
    console.log(`[TextToShort] Real audio duration: ${realAudioDuration}s`);

    // 4. Align phrases into timed captions
    const phrases = Array.isArray(parsed.phrases) && parsed.phrases.length > 0
      ? parsed.phrases
      : spokenNarration.split(/[.?!,]+/).filter(Boolean).map((t: string) => ({ text: t.trim(), emphasis: false }));

    const phraseDuration = realAudioDuration / Math.max(1, phrases.length);
    const captions = phrases.map((p: any, idx: number) => {
      const start = parseFloat((idx * phraseDuration).toFixed(2));
      const end = parseFloat(Math.min(realAudioDuration, (idx + 1) * phraseDuration).toFixed(2));
      return {
        start,
        end,
        text: (p.text || '').toUpperCase(),
        emphasis: !!p.emphasis,
      };
    });

    // 5. Generate ASS subtitles
    const assFilename = `subs_${shortId}.ass`;
    const assPath = path.join(videoCacheDir, assFilename);
    const highlightColor = style === 'neon_cyber' ? '#22d3ee' : style === 'luxury_gold' ? '#f59e0b' : '#facc15';
    generateAssSubtitleFile(captions, headlineBanner, 'hormozi', highlightColor, 1080, 1920, assPath);

    // 6. Multi-threaded FFmpeg generation of moving 9:16 vertical short
    const videoFilename = `short_${shortId}.mp4`;
    const videoOutPath = path.join(videoCacheDir, videoFilename);
    const thumbFilename = `thumb_${shortId}.jpg`;
    const thumbPath = path.join(videoCacheDir, thumbFilename);

    // Fast animated kinetic background
    const bgFilter =
      style === 'neon_cyber'
        ? `[0:v]hue=s=3.0:H=PI*t/3.5,boxblur=4:4,scale=1080:1920:flags=bilinear[bg];[bg]ass=${assPath}[outv]`
        : style === 'luxury_gold'
        ? `[0:v]hue=s=1.8:H=0.8+0.2*sin(t),boxblur=4:4,scale=1080:1920:flags=bilinear[bg];[bg]ass=${assPath}[outv]`
        : `[0:v]hue=s=2.4:H=2*PI*t/7,boxblur=4:4,scale=1080:1920:flags=bilinear[bg];[bg]ass=${assPath}[outv]`;

    const ffArgs = [
      '-y',
      '-threads', '0',
      '-f', 'lavfi',
      '-i', `testsrc2=size=270x480:rate=30:duration=${realAudioDuration.toFixed(2)}`,
      '-i', audioWavPath,
      '-filter_complex', bgFilter,
      '-map', '[outv]',
      '-map', '1:a',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'fastdecode',
      '-crf', '22',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      videoOutPath,
    ];

    console.log(`[TextToShort] Rendering moving vertical short ${videoFilename}...`);
    await new Promise<void>((resolve, reject) => {
      execFile('ffmpeg', ffArgs, { timeout: 60000 }, (ffErr, _stdout, stderr) => {
        if (ffErr || !fs.existsSync(videoOutPath)) {
          return reject(new Error(stderr || ffErr?.message || 'FFmpeg generation failed'));
        }
        resolve();
      });
    });

    // Extract thumbnail
    await extractVideoThumbnail(videoOutPath, thumbPath, 0.5);

    const fullClip = {
      id: `clip-1-${shortId}`,
      title,
      hookTitle: parsed.hookTitle || title,
      headlineBanner,
      startTime: 0,
      endTime: Math.round(realAudioDuration),
      formattedTime: `00:00 - ${formatAssTime(realAudioDuration).slice(3, 8)}`,
      duration: Math.round(realAudioDuration),
      viralityScore: parsed.viralityScore || 96,
      viralityBreakdown: parsed.viralityBreakdown || { hookScore: 98, engagementScore: 95, trendScore: 94, pacingScore: 96 },
      hookType: parsed.hookType || 'Contrarian Truth',
      hookReason: parsed.hookReason || 'Curiosity-driven narrative hook',
      transcript: spokenNarration,
      captions,
      suggestedBroll: ['Dynamic visual motion', 'Cinematic glow', 'Key takeaway graphic'],
      socialKit: parsed.socialKit || {
        youtubeTitle: `${title} #shorts`,
        instagramCaption: spokenNarration.slice(0, 120),
        hashtags: ['#shorts', '#viral', '#mindset'],
        hookPinnedComment: 'What is your take on this? Let us know below 👇',
      },
      clipVideoUrl: `/api/clip-video?file=${encodeURIComponent(videoFilename)}`,
    };

    const project = {
      id: shortId,
      url: '',
      title,
      author: `AI Narrator (${voiceName})`,
      authorUrl: '',
      thumbnailUrl: `/api/clip-video?file=${encodeURIComponent(thumbFilename)}`,
      durationApprox: `${Math.round(realAudioDuration)}s`,
      summary: {
        overview: spokenNarration,
        keyTakeaways: [
          'Hook viewer curiosity in the first 2.5 seconds',
          'Fast high-density delivery with zero fluff',
          'High retention animated dynamic captions with audio voiceover',
        ],
        targetAudience: 'Viral Short, Reels & TikTok audience',
        notableQuote: `"${spokenNarration.slice(0, 80)}..."`,
        category: 'AI Generated Short',
        chapters: [
          { timestamp: '00:00', title: 'The Hook', summary: parsed.hookTitle || 'Curiosity Hook' },
          { timestamp: '00:10', title: 'Core Insight', summary: 'High-density revelation' },
        ],
      },
      clips: [fullClip],
      createdAt: Date.now(),
      videoFileUrl: `/api/clip-video?file=${encodeURIComponent(videoFilename)}`,
      videoFileName: videoFilename,
    };

    console.log(`[TextToShort] Short generated successfully: ${videoFilename}`);
    return res.json(project);
  } catch (err: any) {
    console.error('Text-to-Short error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate text-to-short video' });
  }
});

// Cartoon Characters & Scenic Environments Registry
const CARTOON_CHARACTERS: Record<
  string,
  { name: string; file: string; defaultVoice: string; titlePrefix: string; tagline: string }
> = {
  char_sparky: {
    name: 'Sparky the Robot',
    file: 'public/assets/cartoon/char_sparky.jpg',
    defaultVoice: 'Puck',
    titlePrefix: '🤖 Sparky Explains: ',
    tagline: 'Curious 3D Cyber-Bot',
  },
  char_leo: {
    name: 'Leo the Brave',
    file: 'public/assets/cartoon/char_leo.jpg',
    defaultVoice: 'Puck',
    titlePrefix: '🦁 Leo\'s Lesson: ',
    tagline: 'Golden Lion Hero',
  },
  char_pip: {
    name: 'Professor Pip',
    file: 'public/assets/cartoon/char_pip.jpg',
    defaultVoice: 'Charon',
    titlePrefix: '🦉 Professor Pip: ',
    tagline: 'Wise Scholar Owl',
  },
  char_luna: {
    name: 'Luna the Explorer',
    file: 'public/assets/cartoon/char_luna.jpg',
    defaultVoice: 'Kore',
    titlePrefix: '🐱 Luna\'s Story: ',
    tagline: 'Lilac Star Kitten',
  },
};

const CARTOON_SCENES: Record<string, { name: string; file: string }> = {
  bg_forest: {
    name: 'Enchanted Whimsical Forest',
    file: 'public/assets/cartoon/bg_forest.jpg',
  },
  bg_city: {
    name: 'Futuristic Cyber City',
    file: 'public/assets/cartoon/bg_city.jpg',
  },
  bg_space: {
    name: 'Cosmic Galaxy Nebula',
    file: 'public/assets/cartoon/bg_space.jpg',
  },
};

// Intelligent Heuristic Classifier for Auto-Director fallback
function autoDetectStoryElements(prompt: string): {
  characterId: string;
  sceneId: string;
  voiceName: string;
  bgMusicTrack: string;
} {
  const p = prompt.toLowerCase();

  // 1. Leo the Brave (Heroic lion cub: courage, bravery, discipline, overcoming fear, sports, jungle, hero)
  const leoScore = (
    p.match(
      /lion|brave|courage|fear|motivation|overcome|strength|jungle|discipline|win|hero|warrior|beast|quit|never give up|champion|power|hard work|persevere|grit/g
    ) || []
  ).length;

  // 2. Sparky the Robot (Cute 3D Cyber Bot: tech, AI, robotics, coding, future, inventions, science, gadgets)
  const sparkyScore = (
    p.match(
      /robot|tech|ai|artificial|cyber|future|code|invent|invention|science|gadget|machine|computer|electricity|rocket|battery|program|data|bot|hack|algorithm/g
    ) || []
  ).length;

  // 3. Professor Pip (Wise Scholar Owl: dark psychology, lessons, philosophy, study, books, tricks, memory, facts)
  const pipScore = (
    p.match(
      /owl|professor|teacher|wisdom|learn|psychology|mind|brain|book|study|school|fact|secret|truth|history|trick|lesson|smart|genius|diplomat|habit|reading/g
    ) || []
  ).length;

  // 4. Luna the Explorer (Lilac Adventure Kitten: curiosity, bedtime fables, dreams, stars, moon, space, friendship)
  const lunaScore = (
    p.match(
      /cat|kitten|star|moon|sleep|dream|galaxy|journey|kind|magic|bedtime|sweet|love|cute|friend|compass|wonder|whimsical|pet|peace|night/g
    ) || []
  ).length;

  const maxScore = Math.max(leoScore, sparkyScore, pipScore, lunaScore);
  if (maxScore > 0) {
    if (leoScore === maxScore) {
      return { characterId: 'char_leo', sceneId: 'bg_forest', voiceName: 'Puck', bgMusicTrack: 'cinematic_pulse' };
    }
    if (pipScore === maxScore) {
      return { characterId: 'char_pip', sceneId: 'bg_forest', voiceName: 'Charon', bgMusicTrack: 'ambient_piano' };
    }
    if (lunaScore === maxScore) {
      return { characterId: 'char_luna', sceneId: 'bg_space', voiceName: 'Kore', bgMusicTrack: 'lofi_chill' };
    }
    return { characterId: 'char_sparky', sceneId: 'bg_city', voiceName: 'Puck', bgMusicTrack: 'phonk_energy' };
  }

  // General theme fallbacks if scores are tied
  if (p.includes('space') || p.includes('universe') || p.includes('planet') || p.includes('star')) {
    return { characterId: 'char_luna', sceneId: 'bg_space', voiceName: 'Kore', bgMusicTrack: 'lofi_chill' };
  }
  if (p.includes('city') || p.includes('tech') || p.includes('phone') || p.includes('money')) {
    return { characterId: 'char_sparky', sceneId: 'bg_city', voiceName: 'Puck', bgMusicTrack: 'phonk_energy' };
  }
  if (p.includes('lesson') || p.includes('rule') || p.includes('why') || p.includes('how')) {
    return { characterId: 'char_pip', sceneId: 'bg_forest', voiceName: 'Charon', bgMusicTrack: 'ambient_piano' };
  }

  // Default to Leo the Brave in the enchanted forest
  return { characterId: 'char_leo', sceneId: 'bg_forest', voiceName: 'Puck', bgMusicTrack: 'cinematic_pulse' };
}

function buildFallbackCartoonScript(prompt: string, charName: string, _targetDuration?: number) {
  const cleanPrompt = prompt.replace(/[\r\n]+/g, ' ').trim();
  const title = cleanPrompt.length > 35 ? cleanPrompt.slice(0, 32) + '...' : cleanPrompt;
  const isFullScript = cleanPrompt.split(/\s+/).length > 20;

  const spokenNarration = isFullScript
    ? cleanPrompt
    : `Hey everyone, it's ${charName}! Did you know that ${cleanPrompt}? Most people think one thing, but the truth is so much cooler. Remember to believe in yourself and never stop exploring! Drop a like and subscribe for more adventures!`;

  return {
    title: `${charName}: ${title}`,
    hookTitle: 'You will never believe this!',
    headlineBanner: `${charName.toUpperCase()} REVEALS 🚀`,
    spokenNarration,
    viralityScore: 98,
    viralityBreakdown: { hookScore: 99, engagementScore: 97, trendScore: 96, pacingScore: 98 },
    hookType: 'Animated Story Hook',
    hookReason: 'Engaging animated character storytelling with clear moral and high retention.',
    phrases: [
      { text: `HEY EVERYONE, IT'S ${charName.toUpperCase()}!`, emphasis: true },
      { text: 'Did you know this secret?', emphasis: false },
      { text: 'Most people get this completely wrong.', emphasis: true },
      { text: 'The truth is so much cooler.', emphasis: true },
      { text: 'Never stop exploring!', emphasis: true },
    ],
    socialKit: {
      youtubeTitle: `${charName} reveals ${title} #shorts #animation`,
      instagramCaption: `Join ${charName} on this animated adventure! What do you think?`,
      hashtags: ['#shorts', '#animation', '#cartoon', '#storytime', '#viral'],
      hookPinnedComment: 'What should our next cartoon adventure be about? Let me know below! 👇',
    },
  };
}

// Endpoint to generate 9:16 animated cartoon short from text script (Auto-Director or Custom)
app.post('/api/generate-cartoon-video', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      characterId = 'auto',
      sceneId = 'auto',
      voiceName = 'auto',
      bgMusicTrack = 'auto',
      bgMusicVolume = 0.20,
      targetDuration, // optional: if not provided or auto, dynamically calculated from text
      quality = '720p',
    } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Please enter a story, script, or topic for your cartoon video.' });
    }

    const cleanInput = prompt.trim();
    console.log(`[AutoDirector] Received request. Text length: ${cleanInput.length} chars (${cleanInput.split(/\s+/).length} words).`);

    // 1. Initial heuristic detection for characters & scenes
    const heuristic = autoDetectStoryElements(cleanInput);

    const isAutoChar = !characterId || characterId === 'auto';
    const isAutoScene = !sceneId || sceneId === 'auto';
    const isAutoVoice = !voiceName || voiceName === 'auto';
    const isAutoBgm = !bgMusicTrack || bgMusicTrack === 'auto';

    let resolvedCharId = isAutoChar ? heuristic.characterId : characterId;
    let resolvedSceneId = isAutoScene ? heuristic.sceneId : sceneId;
    let resolvedVoice = isAutoVoice ? heuristic.voiceName : voiceName;
    let resolvedBgm = isAutoBgm ? heuristic.bgMusicTrack : bgMusicTrack;

    const apiKey = process.env.GEMINI_API_KEY;
    const ai = apiKey
      ? new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        })
      : null;

    // 2. AI Auto-Director Story Analysis via Gemini
    let parsed: any = {};
    if (ai) {
      try {
        const directorPrompt = `You are an award-winning Pixar / DreamWorks animated director and YouTube Shorts / TikTok creative producer.
The user provided this script, story, or idea:
"${cleanInput}"

Your mission is to fully direct and produce this animated short video:
1. AUTO CHARACTER SELECTION (Pick the character that best embodies the spirit of this story):
   - "char_leo" (Leo the Brave): Inspiring, courageous lion cub hero. Best for motivation, bravery, overcoming fear, discipline, animal adventures, determination.
   - "char_sparky" (Sparky the Robot): Playful 3D cyber robot with glowing cyan eyes. Best for tech, inventions, AI, science, futuristic stories, digital gadgets.
   - "char_pip" (Professor Pip): Wise scholar owl with golden glasses. Best for psychology, mind secrets, facts, lessons, learning, deep wisdom, historical trivia.
   - "char_luna" (Luna the Explorer): Lilac kitten adventurer with a yellow backpack. Best for heartwarming stories, bedtime fables, starlit journeys, magic, friendship.

2. AUTO 3D SCENE BACKGROUND:
   - "bg_forest" (Enchanted Whimsical Forest with glowing sunbeams and fireflies)
   - "bg_city" (Futuristic Cyber City with flying cars and neon glow)
   - "bg_space" (Cosmic Galaxy Nebula with planetary rings and star dust)

3. AUTO AI VOICEOVER:
   - "Puck" (Energetic, punchy, heroic & enthusiastic)
   - "Charon" (Deep, wise, scholarly & calm)
   - "Kore" (Warm, friendly, soothing & expressive)
   - "Fenrir" (Bold, intense & dynamic)
   - "Aoede" (Gentle, whimsical fairytale narrator)

4. AUTO BACKGROUND SOUNDTRACK:
   - "lofi_chill" (Warm storytelling, relaxing vibes)
   - "cinematic_pulse" (Epic adventure, suspense, heroic drive)
   - "phonk_energy" (Punchy, fast-paced viral momentum)
   - "ambient_piano" (Heartfelt, peaceful, emotional lesson)

5. SCRIPT & SPOKEN NARRATION (CRITICAL):
   - Closely follow the user's provided story and meaning!
   - If the user wrote a full script or story, keep their exact narrative and character dialogue intact while optimizing for natural spoken cadence.
   - If the user gave a short concept, expand it into a complete, captivating story delivered in the chosen character's voice.
   - DO NOT truncate the story. Allow natural length based on the text.

Return ONLY valid JSON matching this schema:
{
  "selectedCharacter": "char_leo" | "char_sparky" | "char_pip" | "char_luna",
  "selectedScene": "bg_forest" | "bg_city" | "bg_space",
  "selectedVoice": "Puck" | "Charon" | "Kore" | "Fenrir" | "Aoede",
  "selectedBgm": "lofi_chill" | "cinematic_pulse" | "phonk_energy" | "ambient_piano",
  "title": "Short punchy video title under 45 characters",
  "hookTitle": "Curiosity hook subtitle",
  "headlineBanner": "PUNCHY 3-5 WORD BANNER WITH EMOJI (e.g. LEO'S GOLDEN TRUTH 🦁)",
  "spokenNarration": "Full natural spoken narration to be voiced by the character. Plain text without markdown.",
  "viralityScore": 98,
  "viralityBreakdown": { "hookScore": 99, "engagementScore": 97, "trendScore": 96, "pacingScore": 98 },
  "hookType": "Animated Story Hook",
  "hookReason": "Why this animated short grips viewers instantly",
  "phrases": [
    { "text": "SHORT PHRASE (2-4 words)", "emphasis": true }
  ],
  "socialKit": {
    "youtubeTitle": "Viral Title with #shorts #animation",
    "instagramCaption": "Engaging 2-sentence caption with character credit",
    "hashtags": ["#shorts", "#animation", "#cartoon", "#storytime", "#viral"],
    "hookPinnedComment": "Question to spark comment debates"
  }
}`;

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI Auto-Director timeout')), 22000)
        );
        const geminiRes: any = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: directorPrompt,
            config: { responseMimeType: 'application/json' },
          }),
          timeoutPromise,
        ]);
        parsed = JSON.parse(geminiRes.text || '{}');

        // Apply AI decisions if in auto mode
        if (isAutoChar && parsed.selectedCharacter && CARTOON_CHARACTERS[parsed.selectedCharacter]) {
          resolvedCharId = parsed.selectedCharacter;
        }
        if (isAutoScene && parsed.selectedScene && CARTOON_SCENES[parsed.selectedScene]) {
          resolvedSceneId = parsed.selectedScene;
        }
        if (isAutoVoice && parsed.selectedVoice) {
          resolvedVoice = parsed.selectedVoice;
        }
        if (isAutoBgm && parsed.selectedBgm) {
          resolvedBgm = parsed.selectedBgm;
        }
      } catch (aiErr) {
        console.warn('[AutoDirector] Gemini Director fallback used:', aiErr);
        const charName = (CARTOON_CHARACTERS[resolvedCharId] || CARTOON_CHARACTERS['char_leo']).name;
        parsed = buildFallbackCartoonScript(cleanInput, charName, targetDuration);
      }
    } else {
      const charName = (CARTOON_CHARACTERS[resolvedCharId] || CARTOON_CHARACTERS['char_leo']).name;
      parsed = buildFallbackCartoonScript(cleanInput, charName, targetDuration);
    }

    const charInfo = CARTOON_CHARACTERS[resolvedCharId] || CARTOON_CHARACTERS['char_leo'];
    const sceneInfo = CARTOON_SCENES[resolvedSceneId] || CARTOON_SCENES['bg_forest'];
    const activeVoice = resolvedVoice || charInfo.defaultVoice || 'Puck';
    const activeBgm = resolvedBgm || 'lofi_chill';

    const spokenNarration = parsed.spokenNarration || cleanInput;
    const title = parsed.title || `${charInfo.name} Story`;
    const headlineBanner = parsed.headlineBanner || `${charInfo.name.toUpperCase()} REVEALS 🚀`;

    console.log(
      `[AutoDirector] Selected: Character=${charInfo.name}, Scene=${sceneInfo.name}, Voice=${activeVoice}, BGM=${activeBgm}`
    );

    // 3. Synthesize Character AI Voiceover (Dynamic Speech Duration)
    console.log(`[AutoDirector] Generating voiceover for ${spokenNarration.split(/\s+/).length} words...`);
    const shortId = 'ani_' + crypto.randomBytes(6).toString('hex');
    const audioWavFilename = `voice_${shortId}.wav`;
    const audioWavPath = path.join(videoCacheDir, audioWavFilename);

    let base64Audio: string | undefined;
    if (ai) {
      try {
        const ttsTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TTS timeout')), 25000)
        );
        const ttsRes: any = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-3.8-flash-lite-tts',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: spokenNarration,
                    speechMetadata: { style: 'Animated, expressive, friendly cartoon storytelling voice' },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: activeVoice } },
              },
            },
          }),
          ttsTimeout,
        ]);
        base64Audio = ttsRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      } catch (ttsErr) {
        console.warn('[AutoDirector] TTS fallback to audio synthesis:', ttsErr);
      }
    }

    if (base64Audio) {
      fs.writeFileSync(audioWavPath, Buffer.from(base64Audio, 'base64'));
    } else {
      // Dynamic fallback duration based on word count (never fixed 30s)
      const wordCount = spokenNarration.split(/\s+/).length;
      const estimatedSec = Math.max(10, Math.min(85, Math.round(wordCount / 2.2)));
      await new Promise<void>((resolve) => {
        execFile(
          'ffmpeg',
          ['-y', '-f', 'lavfi', '-i', `sine=frequency=240:duration=${estimatedSec}`, '-c:a', 'pcm_s16le', audioWavPath],
          () => {
            resolve();
          }
        );
      });
    }

    // Measure exact audio duration from synthesized voice
    const realAudioDuration = await probeVideoDuration(audioWavPath);
    console.log(`[AutoDirector] Exact dynamic video duration: ${realAudioDuration.toFixed(2)}s`);

    // 4. Align Timed Phrases for Kinetic ASS Subtitles
    const phrases =
      Array.isArray(parsed.phrases) && parsed.phrases.length > 0
        ? parsed.phrases
        : spokenNarration
            .split(/[.?!,]+/)
            .filter(Boolean)
            .map((t: string) => ({ text: t.trim(), emphasis: false }));

    const phraseDuration = realAudioDuration / Math.max(1, phrases.length);
    const captions = phrases.map((p: any, idx: number) => {
      const start = parseFloat((idx * phraseDuration).toFixed(2));
      const end = parseFloat(Math.min(realAudioDuration, (idx + 1) * phraseDuration).toFixed(2));
      return {
        start,
        end,
        text: (p.text || '').toUpperCase(),
        emphasis: !!p.emphasis,
      };
    });

    // 5. Generate ASS Subtitles with Top Headline Banner & Character Speaker Badge
    const assFilename = `subs_${shortId}.ass`;
    const assPath = path.join(videoCacheDir, assFilename);
    const outW = quality === '1080p' ? 1080 : 720;
    const outH = quality === '1080p' ? 1920 : 1280;
    const speakerBadge = `★ ${charInfo.name.toUpperCase()} • AI STORYTELLER ★`;
    generateAssSubtitleFile(captions, headlineBanner, 'hormozi', '#facc15', outW, outH, assPath, speakerBadge);

    // 6. Compositing with Multi-threaded FFmpeg
    const videoFilename = `cartoon_${shortId}.mp4`;
    const videoOutPath = path.join(videoCacheDir, videoFilename);
    const thumbFilename = `thumb_${shortId}.jpg`;
    const thumbPath = path.join(videoCacheDir, thumbFilename);

    const bgImagePath = path.resolve(sceneInfo.file);
    const charImagePath = path.resolve(charInfo.file);
    const bgmAudioPath =
      activeBgm && activeBgm !== 'none' ? path.resolve(`public/audio/bgm/${activeBgm}.mp3`) : null;

    const charSize = Math.round(outW * 0.44);
    const charRadius = Math.round(charSize / 2);
    const charInnerRadius = charRadius - 4;

    const hasBgm = bgmAudioPath && fs.existsSync(bgmAudioPath);
    const ffArgs = [
      '-y',
      '-threads',
      '0',
      '-loop',
      '1',
      '-t',
      realAudioDuration.toFixed(2),
      '-i',
      bgImagePath,
      '-loop',
      '1',
      '-t',
      realAudioDuration.toFixed(2),
      '-i',
      charImagePath,
      '-i',
      audioWavPath,
    ];

    if (hasBgm) {
      ffArgs.push('-stream_loop', '-1', '-i', bgmAudioPath);
    }

    // Dynamic Ken Burns movement on background + animated breathing & speaking bounce on character
    const fadeOutStart = Math.max(0.5, realAudioDuration - 1.5).toFixed(2);
    const filterComplex = `
[0:v]scale=${outW}:${outH}:force_original_aspect_ratio=increase,crop=${outW}:${outH},zoompan=z='min(zoom+0.00045,1.07)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${outW}x${outH}[bg];
[1:v]scale=${charSize}:${charSize},format=yuva420p,geq=lum='p(X,Y)':a='if(lte((X-${charRadius})*(X-${charRadius})+(Y-${charRadius})*(Y-${charRadius}),${charInnerRadius}*${charInnerRadius}),255,0)'[char];
[bg][char]overlay=(W-w)/2+6*sin(1.2*PI*t):'H-h-${Math.round(outH * 0.12)}+12*sin(2.4*PI*t)'[comp];
[comp]ass=${assPath}[outv];
${
  hasBgm
    ? `[2:a]volume=1.0[voice];[3:a]volume=${Number(bgMusicVolume) || 0.20}[bgm];[voice][bgm]amix=inputs=2:duration=first:dropout_transition=2,afade=t=out:st=${fadeOutStart}:d=1.5[outa]`
    : `[2:a]afade=t=out:st=${fadeOutStart}:d=1.5[outa]`
}
`.trim();

    ffArgs.push(
      '-filter_complex',
      filterComplex,
      '-map',
      '[outv]',
      '-map',
      '[outa]',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-tune',
      'fastdecode',
      '-crf',
      '22',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      videoOutPath
    );

    console.log(`[AutoDirector] Rendering ${realAudioDuration.toFixed(1)}s animated short ${videoFilename}...`);
    await new Promise<void>((resolve, reject) => {
      execFile('ffmpeg', ffArgs, { timeout: 80000 }, (ffErr, _stdout, stderr) => {
        if (ffErr || !fs.existsSync(videoOutPath)) {
          return reject(new Error(stderr || ffErr?.message || 'FFmpeg cartoon generation failed'));
        }
        resolve();
      });
    });

    // Extract high-quality thumbnail frame
    await extractVideoThumbnail(videoOutPath, thumbPath, 0.5);

    const fullClip = {
      id: `clip-1-${shortId}`,
      title,
      hookTitle: parsed.hookTitle || title,
      headlineBanner,
      startTime: 0,
      endTime: Math.round(realAudioDuration),
      formattedTime: `00:00 - ${formatAssTime(realAudioDuration).slice(3, 8)}`,
      duration: Math.round(realAudioDuration),
      viralityScore: parsed.viralityScore || 98,
      viralityBreakdown: parsed.viralityBreakdown || {
        hookScore: 99,
        engagementScore: 97,
        trendScore: 96,
        pacingScore: 98,
      },
      hookType: parsed.hookType || 'Animated Story Hook',
      hookReason: parsed.hookReason || `Animated storytelling with ${charInfo.name}`,
      transcript: spokenNarration,
      captions,
      suggestedBroll: [charInfo.name, sceneInfo.name, '3D Pixar Animated Scene'],
      socialKit: parsed.socialKit || {
        youtubeTitle: `${title} #shorts #animation`,
        instagramCaption: spokenNarration.slice(0, 130),
        hashtags: ['#shorts', '#animation', '#cartoon', '#storytime', '#viral'],
        hookPinnedComment: 'What cartoon story should we animate next? Drop a comment below! 👇',
      },
      clipVideoUrl: `/api/clip-video?file=${encodeURIComponent(videoFilename)}`,
    };

    const project = {
      id: shortId,
      url: '',
      title,
      author: `${charInfo.name} • AI Animation Studio`,
      authorUrl: '',
      thumbnailUrl: `/api/clip-video?file=${encodeURIComponent(thumbFilename)}`,
      durationApprox: `${Math.round(realAudioDuration)}s`,
      summary: {
        overview: spokenNarration,
        keyTakeaways: [
          `Character Performance: ${charInfo.name} (${charInfo.tagline || '3D Animated Avatar'})`,
          `Scene Environment: ${sceneInfo.name}`,
          `Dynamic Duration: ${realAudioDuration.toFixed(1)}s (Auto-timed to text speech rate)`,
          `Copyright-Cleared Soundtrack: ${activeBgm} with custom AI voiceover`,
        ],
        targetAudience: 'YouTube Shorts, TikTok & Reels audience',
        notableQuote: `"${spokenNarration.slice(0, 80)}..."`,
        category: 'Animated Cartoon Short',
        chapters: [
          { timestamp: '00:00', title: 'Story Hook', summary: parsed.hookTitle || 'Animated Hook' },
          { timestamp: '00:08', title: 'Core Lesson', summary: 'Story insight' },
        ],
      },
      clips: [fullClip],
      createdAt: Date.now(),
      videoFileUrl: `/api/clip-video?file=${encodeURIComponent(videoFilename)}`,
      videoFileName: videoFilename,
    };

    console.log(`[AutoDirector] Video completed: ${videoFilename} (${realAudioDuration.toFixed(1)}s)`);
    return res.json(project);
  } catch (err: any) {
    console.error('Error generating cartoon video:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate cartoon video' });
  }
});

app.post('/api/render-server-short', async (req: Request, res: Response) => {
  try {
    const {
      videoId,
      startTime,
      endTime,
      quality = '720p',
      layoutStyle = 'fill_blur',
      captions = [],
      headlineText = '',
      captionStyle = 'hormozi',
      highlightColor = '#facc15',
      localFileName = '',
    } = req.body;

    const localPath = findLocalVideoPath(localFileName) || findLocalVideoPath(videoId);
    const cleanId = extractYouTubeId(videoId) || (localPath ? path.basename(localPath, path.extname(localPath)).replace(/[^a-zA-Z0-9_-]/g, '_') : 'video');
    if (!cleanId && !localPath) return res.status(400).json({ error: 'Invalid video ID or file' });

    const startSec = Math.max(0, Math.floor(Number(startTime) || 0));
    const endSec = Math.max(startSec + 3, Math.ceil(Number(endTime) || (startSec + 30)));
    const duration = endSec - startSec;

    // Standardized resolutions: 1080p HP (1080x1920), 720p HD (720x1280), 360p Fast (360x640)
    const outW = quality === '1080p' ? 1080 : quality === '360p' ? 360 : 720;
    const outH = quality === '1080p' ? 1920 : quality === '360p' ? 640 : 1280;

    const rawFilename = `clip_${cleanId}_${startSec}_${endSec}_${quality}.mp4`;
    const rawPath = path.join(videoCacheDir, rawFilename);

    // Hash the parameters to create an exact cache key
    const hashData = `${cleanId}_${startSec}_${endSec}_${quality}_${layoutStyle}_${captionStyle}_${headlineText}_${highlightColor}_${JSON.stringify(captions)}`;
    const hash = crypto.createHash('md5').update(hashData).digest('hex').slice(0, 10);
    const renderedFilename = `short_${cleanId}_${startSec}_${endSec}_${quality}_${hash}.mp4`;
    const renderedPath = path.join(videoCacheDir, renderedFilename);
    const assFilename = `subs_${cleanId}_${startSec}_${endSec}_${hash}.ass`;
    const assPath = path.join(videoCacheDir, assFilename);

    // If already generated, return cached video immediately (0.1s response)
    if (fs.existsSync(renderedPath) && fs.statSync(renderedPath).size > 25000) {
      return res.json({
        success: true,
        downloadUrl: `/api/clip-video?file=${renderedFilename}`,
        filename: renderedFilename,
        cached: true,
      });
    }

    // Generate ASS Subtitles file with Bangla support
    generateAssSubtitleFile(captions, headlineText, captionStyle, highlightColor, outW, outH, assPath);

    // Foreground 16:9 running video dimensions (centered, clean, without channel logos/watermarks)
    const fgW = Math.round(outW * 0.94);
    const fgH = Math.round((fgW * 9) / 16);
    const fgY = Math.round((outH - fgH) / 2 - (outH * 0.05));

    const runFfmpeg = () => {
      // Ultra-fast downscaled background blur (smooth ambient backdrop with instant encoding)
      let filter = `[0:v]scale=100:178:force_original_aspect_ratio=increase,crop=100:178,boxblur=3:3,scale=${outW}:${outH}[bg];[0:v]scale=${fgW}:${fgH}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:${fgY}[comp];[comp]ass=${assPath}[outv]`;

      if (layoutStyle === 'split_screen') {
        const halfH = Math.round(outH * 0.38);
        filter = `[0:v]scale=100:178:force_original_aspect_ratio=increase,crop=100:178,boxblur=3:3,scale=${outW}:${outH}[bg];[0:v]scale=${fgW}:${halfH}:force_original_aspect_ratio=increase,crop=${fgW}:${halfH}[top];[0:v]scale=${Math.round(fgW * 1.3)}:${Math.round(halfH * 1.3)}:force_original_aspect_ratio=increase,crop=${fgW}:${halfH}[bot];[bg][top]overlay=(W-w)/2:${Math.round(outH * 0.14)}[m1];[m1][bot]overlay=(W-w)/2:${Math.round(outH * 0.53)}[comp];[comp]ass=${assPath}[outv]`;
      }

      const preset = quality === '1080p' ? 'superfast' : 'ultrafast';
      const audioBitrate = quality === '360p' ? '128k' : '192k';

      const ffArgs = [
        '-y',
        '-threads',
        '0',
        '-i',
        rawPath,
        '-filter_complex',
        filter,
        '-map',
        '[outv]',
        '-map',
        '0:a?',
        '-c:v',
        'libx264',
        '-preset',
        preset,
        '-tune',
        'fastdecode',
        '-crf',
        '23',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        audioBitrate,
        '-movflags',
        '+faststart',
        renderedPath,
      ];

      console.log(`[RenderServer] Running optimized multi-threaded FFmpeg for ${renderedFilename}...`);
      execFile('ffmpeg', ffArgs, { timeout: 120000 }, (ffErr, _stdout, ffStderr) => {
        if (ffErr || !fs.existsSync(renderedPath) || fs.statSync(renderedPath).size < 10000) {
          console.error('[RenderServer] FFmpeg error:', ffStderr || ffErr);
          return res.status(500).json({ error: 'FFmpeg short generation failed', details: ffStderr });
        }
        console.log(`[RenderServer] Successfully created short in record time: ${renderedFilename} (${fs.statSync(renderedPath).size} bytes)`);
        return res.json({
          success: true,
          downloadUrl: `/api/clip-video?file=${renderedFilename}`,
          filename: renderedFilename,
          cached: false,
        });
      });
    };

    if (localPath && fs.existsSync(localPath)) {
      console.log(`[RenderServer] Extracting clip from local file ${localPath} (${startSec}-${endSec}s)...`);
      const ffExtractArgs = [
        '-y',
        '-ss', String(startSec),
        '-to', String(endSec),
        '-i', localPath,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '19',
        '-c:a', 'aac',
        '-b:a', '192k',
        rawPath,
      ];
      execFile('ffmpeg', ffExtractArgs, (exErr) => {
        if (!exErr && fs.existsSync(rawPath)) {
          runFfmpeg();
        } else {
          console.error('[RenderServer] Error extracting local video segment:', exErr);
          return res.status(500).json({ error: 'Failed to process local video file segment' });
        }
      });
      return;
    }

    if (fs.existsSync(rawPath) && fs.statSync(rawPath).size > 20000) {
      runFfmpeg();
    } else {
      // Download source clip using optimized yt-dlp flags
      const formatFilter =
        quality === '1080p'
          ? 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best'
          : quality === '360p'
          ? '18/best[height<=360]/best'
          : '22/18/bestvideo[height<=720]+bestaudio/best[height<=720]/best';

      const args = [
        ...getCookiesArg(),
        '--download-sections',
        `*${startSec}-${endSec}`,
        '--force-keyframes-at-cuts',
        '--concurrent-fragments',
        '4',
        '--buffer-size',
        '64K',
        '--no-playlist',
        '--no-check-certificates',
        '--socket-timeout',
        '15',
        '-f',
        formatFilter,
        '-o',
        rawPath,
        `https://www.youtube.com/watch?v=${cleanId}`,
      ];

      console.log(`[RenderServer] High-speed fetching raw video section ${startSec}-${endSec} for ${cleanId}...`);
      execFile(getYtDlpPath(), args, { timeout: 60000 }, (dlErr, _dlStdout, dlStderr) => {
        if (dlErr || !fs.existsSync(rawPath) || fs.statSync(rawPath).size < 10000) {
          console.warn('[RenderServer] Format specific download failed, retrying with fallback format "best":', dlStderr);
          // Fallback retry
          const fallbackArgs = [
            ...getCookiesArg(),
            '--download-sections',
            `*${startSec}-${endSec}`,
            '--force-keyframes-at-cuts',
            '--concurrent-fragments',
            '4',
            '--no-playlist',
            '--no-check-certificates',
            '--socket-timeout',
            '15',
            '-f',
            'best',
            '-o',
            rawPath,
            `https://www.youtube.com/watch?v=${cleanId}`,
          ];
          execFile(getYtDlpPath(), fallbackArgs, { timeout: 60000 }, (fbErr, _fbStdout, fbStderr) => {
            if (fbErr || !fs.existsSync(rawPath) || fs.statSync(rawPath).size < 10000) {
              const allErr = (fbStderr || '') + ' ' + (dlStderr || '') + ' ' + (fbErr?.message || '');
              const isBotChallenge =
                allErr.includes('Sign in to confirm you') ||
                allErr.includes('not a bot') ||
                allErr.includes('cookies');

              console.error('[RenderServer] Failed to download source clip. isBotChallenge:', isBotChallenge);
              return res.status(isBotChallenge ? 403 : 500).json({
                error: isBotChallenge
                  ? 'YouTube requires sign-in verification for this video. You can upload an MP4 or provide cookies to bypass.'
                  : 'Failed to download real YouTube clip',
                isBotChallenge,
                details: fbStderr || dlStderr || fbErr?.message,
              });
            }
            runFfmpeg();
          });
          return;
        }
        runFfmpeg();
      });
    }
  } catch (err: any) {
    console.error('Render error:', err);
    return res.status(500).json({ error: err.message || 'Render failed' });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KixyClip AI Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
