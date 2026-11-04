export interface SampleVideo {
  title: string;
  author: string;
  url: string;
  videoId: string;
  category: string;
  description: string;
  thumbnailUrl: string;
  isRealVideo?: boolean;
}

export const SAMPLE_VIDEOS: SampleVideo[] = [
  {
    title: 'একুশে সংবাদ - এইচএসসি ও সমমান পরীক্ষার ফল প্রকাশ (Ekushey ETV News Broadcast)',
    author: 'একুশে টেলিভিশন (ETV HD)',
    url: '/assets/aistudio/videoplayback_b06f7cb2.mp4',
    videoId: 'videoplayback_b06f7cb2',
    category: 'News & Education',
    description: 'এইচএসসি ও সমমান পরীক্ষার ফলাফল প্রকাশ, গড় পাসের হার ৫২.১২% ও শিক্ষামন্ত্রীর গুরুত্বপূর্ণ বক্তব্য।',
    thumbnailUrl: '/assets/aistudio/videoplayback_b06f7cb2_thumb.jpg',
    isRealVideo: true,
  },
  {
    title: 'Alex Hormozi - How To Make Money In Your 20s (Step By Step)',
    author: 'Alex Hormozi',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoId: 'dQw4w9WgXcQ',
    category: 'Business & Wealth',
    description: 'The exact framework to build high-income skills and escape the rat race in your 20s.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Sam Altman & Lex Fridman - The Future of Artificial Intelligence',
    author: 'Lex Fridman Podcast',
    url: 'https://www.youtube.com/watch?v=jvqFAi7vkBc',
    videoId: 'jvqFAi7vkBc',
    category: 'AI & Tech',
    description: 'OpenAI CEO discusses AGI, compute limits, human creativity, and the next decade of tech.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Andrew Huberman - Optimize Your Sleep & Energy (Neuroscience Masterclass)',
    author: 'Huberman Lab',
    url: 'https://www.youtube.com/watch?v=nm1TxQj9IsQ',
    videoId: 'nm1TxQj9IsQ',
    category: 'Health & Focus',
    description: 'Protocols for sunlight exposure, dopamine reset, temperature control, and deep REM sleep.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'MrBeast - How I Direct Videos That Get 100 Million Views',
    author: 'MrBeast',
    url: 'https://www.youtube.com/watch?v=0e3GPea1Tyg',
    videoId: '0e3GPea1Tyg',
    category: 'Viral Growth',
    description: 'The secret pacing formulas, high-stakes storytelling, and pacing tricks for 100M+ views.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
  },
];
