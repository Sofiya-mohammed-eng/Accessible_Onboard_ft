import React from 'react';
import {
  ArrowRight,
  Captions,
  Contrast,
  Globe,
  Keyboard,
  Languages,
  List,
  Mic,
  Search,
  Volume2,
  type LucideIcon,
} from 'lucide-react';
import { getLocalizedCopy } from '../engines/i18n';
import { getPageCopy } from '../engines/pageCopy';
import { NavigationView, PreferredLanguage } from '../types/accessbridge';
import heroWorkspaceImg from '../assets/images/home-hero.jpg';

type Item = { title: string; body: string; icon: LucideIcon };

type Story = {
  notes: string[];
  supportTitle: string;
  supportLead: string;
  supports: Item[];
  problemTitle: string;
  problemLead: string;
  problems: Item[];
  stepsTitle: string;
  stepsLead: string;
  steps: Item[];
  closeTitle: string;
  closeBody: string;
};

const EN_STORY: Story = {
  notes: ['Ethiopia to the world', 'English and Amharic', 'Equal opportunities'],
  supportTitle: 'Ways you can use AllWays',
  supportLead: 'The purpose is a fair chance at work. These supports stay with you while you look and apply.',
  supports: [
    { icon: Volume2, title: 'Listen to information', body: 'Offer read-aloud support and work well with screen readers.' },
    { icon: Contrast, title: 'Adjust visual display', body: 'Make text larger, improve contrast, and support zoom.' },
    { icon: Captions, title: 'Use captions and text', body: 'Show captions, transcripts, and important information in text.' },
    { icon: Keyboard, title: 'Navigate without a mouse', body: 'Support keyboard, switch devices, and other alternative controls.' },
    { icon: Mic, title: 'Use voice input', body: 'Allow speech as an optional way to enter information.' },
    { icon: List, title: 'Show simpler information', body: 'Use clear wording, step-by-step guidance, and explain unfamiliar terms.' },
  ],
  problemTitle: 'The work is out there. The way in is not always open.',
  problemLead: 'People in Ethiopia look for roles at home and far beyond it. A listing can be visible while the application still shuts people out.',
  problems: [
    { icon: Globe, title: 'From here to anywhere', body: 'A job in Addis Ababa and a job abroad should not ask for a different kind of person before the application even starts.' },
    { icon: Keyboard, title: 'One narrow door', body: 'When a form works for only one way of seeing, hearing, or moving, qualified people stop before they begin.' },
    { icon: List, title: 'No clear next step', body: 'A crowded page does not say what to do first, and it does not wait while you answer.' },
  ],
  stepsTitle: 'How you move through it',
  stepsLead: 'AllWays does not choose the job for you. It keeps the path open, from the first word to a finished application.',
  steps: [
    { icon: Languages, title: 'Start in your language', body: 'Choose English or Amharic. From then on, the page speaks and listens in that language.' },
    { icon: Search, title: 'Look from Ethiopia outward', body: 'Sign in, then search for work close to home and opportunities beyond Ethiopia.' },
    { icon: Mic, title: 'Apply in your own way', body: 'One question at a time. Hear it, read it, or say it. Add your file when you are ready, then finish.' },
  ],
  closeTitle: 'Your next role can start here',
  closeBody: 'Choose your language and sign in. Then look for work from Ethiopia to the world, with support beside you.',
};

const AM_STORY: Story = {
  notes: ['ከኢትዮጵያ እስከ ዓለም', 'እንግሊዝኛ እና አማርኛ', 'እኩል እድሎች'],
  supportTitle: 'AllWays የሚደግፋቸው መንገዶች',
  supportLead: 'ዓላማው ለሥራ እኩል እድል ነው። ሲፈልጉ እና ሲያመለክቱ እነዚህ ድጋፎች ከእርስዎ ጋር ይቆያሉ።',
  supports: [
    { icon: Volume2, title: 'መረጃን ያዳምጡ', body: 'ጮክ ብሎ ማንበብ እና ከማያ አንባቢዎች ጋር በደንብ መስራት።' },
    { icon: Contrast, title: 'እይታን ያስተካክሉ', body: 'ጽሑፍን ያሳድጉ፣ ንፅፅርን ያሻሽሉ፣ እና ማጉላትን ይደግፉ።' },
    { icon: Captions, title: 'መግለጫ እና ጽሑፍ', body: 'መግለጫ ጽሑፍ፣ ግልባጭ፣ እና አስፈላጊ መረጃ በጽሑፍ ይታያል።' },
    { icon: Keyboard, title: 'ያለ መዳፊት ይንቀሳቀሱ', body: 'የቁልፍ ሰሌዳ፣ መቀየሪያ መሣሪያ፣ እና ሌሎች አማራጭ መቆጣጠሪያዎች።' },
    { icon: Mic, title: 'በድምፅ ያስገቡ', body: 'መረጃን ለማስገባት ንግግር እንደ አማራጭ መንገድ።' },
    { icon: List, title: 'ቀለል ያለ መረጃ', body: 'ግልጽ ቃላት፣ ደረጃ በደረጃ መመሪያ፣ እና ያልታወቁ ቃላት ማብራሪያ።' },
  ],
  problemTitle: 'ሥራው አለ። መግቢያው ግን ሁልጊዜ ክፍት አይደለም።',
  problemLead: 'በኢትዮጵያ ያሉ ሰዎች በአገር ውስጥ እና በሩቅ ሥራ ይፈልጋሉ። ማስታወቂያው ሊታይ ይችላል፣ ማመልከቻው ግን ሰዎችን ሊያግድ ይችላል።',
  problems: [
    { icon: Globe, title: 'ከዚህ እስከ የትም', body: 'በአዲስ አበባ ያለ ሥራ እና በውጭ ያለ ሥራ፣ ማመልከቻው ከመጀመሩ በፊት የተለየ ሰው ሊጠይቅ አይገባም።' },
    { icon: Keyboard, title: 'ጠባብ በር', body: 'ቅጽ የሚሠራው በአንድ የማየት፣ የመስማት ወይም የመንቀሳቀስ መንገድ ብቻ ከሆነ፣ ብቁ ሰዎች ከመጀመራቸው በፊት ያቆማሉ።' },
    { icon: List, title: 'ግልጽ ቀጣይ ደረጃ የለም', body: 'የተጨናነቀ ገጽ መጀመሪያ ምን እንደሚደረግ አይናገርም፣ እርስዎም ሲመልሱ አይጠብቅም።' },
  ],
  stepsTitle: 'እንዴት እንደሚሄዱ',
  stepsLead: 'AllWays ሥራውን ለእርስዎ አይመርጥም። ከመጀመሪያው ቃል እስከ የተጠናቀቀ ማመልከቻ መንገዱን ክፍት ያደርጋል።',
  steps: [
    { icon: Languages, title: 'በቋንቋዎ ይጀምሩ', body: 'እንግሊዝኛ ወይም አማርኛ ይምረጡ። ከዚያ ገጹ በዚያ ቋንቋ ይናገራል እና ያዳምጣል።' },
    { icon: Search, title: 'ከኢትዮጵያ ወደ ውጭ ይመልከቱ', body: 'ይግቡ፣ ከዚያ በአቅራቢያ ያለ ሥራ እና ከኢትዮጵያ ውጭ ያሉ እድሎችን ይፈልጉ።' },
    { icon: Mic, title: 'በራስዎ መንገድ ያመልክቱ', body: 'አንድ ጥያቄ በአንድ ጊዜ። ይስሙት፣ ያንብቡት፣ ወይም ይናገሩት። ሲዘጋጁ ፋይልዎን ያክሉ እና ይጨርሱ።' },
  ],
  closeTitle: 'ቀጣዩ ሥራዎ ከዚህ ሊጀምር ይችላል',
  closeBody: 'ቋንቋዎን ይምረጡ እና ይግቡ። ከዚያ ከኢትዮጵያ እስከ ዓለም ሥራ ይፈልጉ፣ ድጋፍ ከጎንዎ ሆኖ።',
};

interface LandingPageProps {
  onNavigate: (view: NavigationView) => void;
  onGetStarted: () => void;
  hasCompletedOnboarding: boolean;
  language: PreferredLanguage;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  language,
}) => {
  const copy = getLocalizedCopy(language);
  const page = getPageCopy(language);
  const story = language === 'am' ? AM_STORY : EN_STORY;
  const stageRef = React.useRef<HTMLDivElement>(null);
  const problemSectionRef = React.useRef<HTMLElement>(null);
  const problemTrackRef = React.useRef<HTMLDivElement>(null);
  const [cardsPlaying, setCardsPlaying] = React.useState(false);
  const [problemIndex, setProblemIndex] = React.useState(0);
  const [problemSlide, setProblemSlide] = React.useState(0);
  const [problemPlaying, setProblemPlaying] = React.useState(false);
  const [problemPaused, setProblemPaused] = React.useState(false);

  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches || document.documentElement.classList.contains('reduced-motion')) {
      setCardsPlaying(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setCardsPlaying(true);
      },
      { threshold: 0.28 },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const showProblem = (index: number) => {
    const count = story.problems.length;
    setProblemIndex((index + count) % count);
  };

  React.useEffect(() => {
    const section = problemSectionRef.current;
    if (!section) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches || document.documentElement.classList.contains('reduced-motion')) return;
    const observer = new IntersectionObserver(
      ([entry]) => setProblemPlaying(Boolean(entry?.isIntersecting)),
      { threshold: 0.35 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!problemPlaying || problemPaused) return;
    const count = story.problems.length;
    const timer = window.setInterval(() => {
      setProblemIndex((index) => (index + 1) % count);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [problemPlaying, problemPaused, story.problems.length]);

  React.useLayoutEffect(() => {
    const measure = () => {
      const card = problemTrackRef.current?.querySelector('article');
      if (!card) return;
      setProblemSlide(card.offsetWidth + 16);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [language]);

  return (
    <div className="bg-transparent high-contrast:bg-black">
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
          <div className="flex flex-col justify-center lg:col-span-6">
            <p className="text-sm font-semibold text-[#0056B3] high-contrast:text-cyan-300">
              {page.homeKicker}
            </p>
            <h1
              className="mt-3 font-display font-bold tracking-tight text-[#001F3F] high-contrast:text-white"
              style={{ fontSize: 'clamp(2.25rem, 4vw, 3.35rem)', lineHeight: 1.12, textWrap: 'balance' }}
            >
              {copy.heroHeadline}
            </h1>
            <p className="mt-5 text-lg font-medium text-slate-700 high-contrast:text-slate-200">
              {copy.heroSubheading}
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 high-contrast:text-slate-300">
              {page.homeBody}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onGetStarted}
                className="inline-flex items-center gap-2.5 rounded-full bg-[#1a73e8] px-7 py-4 text-base font-semibold text-white transition hover:-translate-y-0.5 high-contrast:bg-yellow-300 high-contrast:text-black"
              >
                {copy.navGetStarted}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-600 high-contrast:text-slate-300">
              {story.notes.map((note) => (
                <span key={note} className="rounded-full bg-white/80 px-3 py-1 ring-1 ring-[#d5e6f7]">
                  {note}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[420px] overflow-hidden rounded-3xl border border-white/80 bg-white/40 shadow-[0_30px_80px_-36px_rgba(26,115,232,0.55)] ring-1 ring-[#d5e6f7] high-contrast:border-white high-contrast:bg-neutral-900">
              <img
                src={heroWorkspaceImg}
                alt="A woman in a striped shirt working on a laptop in a quiet booth beside a window."
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/70 bg-white/35 py-14 backdrop-blur-sm high-contrast:border-white high-contrast:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="font-display text-2xl font-bold text-[#001F3F] sm:text-3xl high-contrast:text-white">
              {story.supportTitle}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600 high-contrast:text-slate-300">
              {story.supportLead}
            </p>
          </div>
          <div
            ref={stageRef}
            className={`motion-stage mt-10 rounded-[2rem] px-3 py-8 sm:px-6 sm:py-12 high-contrast:bg-black${cardsPlaying ? ' motion-play' : ''}`}
          >
            <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-4 lg:gap-y-2">
              {story.supports.map((item, index) => {
                const look = [
                  { face: 'motion-line', place: 'lg:col-span-5 lg:mt-6', drift: 'motion-drift-1', z: 2 },
                  { face: 'motion-ink', place: 'lg:col-span-4 lg:-mt-2', drift: 'motion-drift-2', z: 4 },
                  { face: 'motion-sky', place: 'lg:col-span-3 lg:mt-10', drift: 'motion-drift-3', z: 3 },
                  { face: 'motion-ink', place: 'lg:col-span-4 lg:-mt-6', drift: 'motion-drift-4', z: 3 },
                  { face: 'motion-sky', place: 'lg:col-span-3 lg:mt-4', drift: 'motion-drift-5', z: 5 },
                  { face: 'motion-line', place: 'lg:col-span-5 lg:-mt-8', drift: 'motion-drift-6', z: 2 },
                ][index];
                const ink = look.face === 'motion-ink';
                return (
                  <article
                    key={item.title}
                    className={`motion-card ${look.face} ${look.drift} ${look.place} rounded-[1.75rem] border border-white/70 p-6 shadow-[0_28px_50px_-28px_rgba(8,40,90,0.55)] backdrop-blur-md high-contrast:border-white high-contrast:bg-black`}
                    style={{ zIndex: look.z }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`grid h-11 w-11 place-items-center rounded-2xl ${ink ? 'bg-white/20 text-white' : 'bg-[#e7f3ff] text-[#0d4f9e]'}`}
                        aria-hidden="true"
                      >
                        <item.icon className="h-5 w-5" />
                      </span>
                      <span className={`font-display text-3xl font-bold leading-none ${ink ? 'text-white/80' : 'text-[#1a73e8]'}`}>
                        0{index + 1}
                      </span>
                    </div>
                    <h3 className={`mt-6 font-display text-2xl font-bold leading-tight ${ink ? 'text-white' : 'text-[#001F3F]'} high-contrast:text-white`}>
                      {item.title}
                    </h3>
                    <p className={`mt-3 text-sm leading-relaxed ${ink ? 'text-white/90' : 'text-slate-600'} high-contrast:text-white`}>
                      {item.body}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section
        ref={problemSectionRef}
        className="border-t border-white/70 py-14 high-contrast:border-white high-contrast:bg-black"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="font-display text-2xl font-bold text-[#001F3F] sm:text-3xl high-contrast:text-white">
              {story.problemTitle}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600 high-contrast:text-slate-300">
              {story.problemLead}
            </p>
          </div>
          <div
            className="mt-8 overflow-hidden"
            onMouseEnter={() => setProblemPaused(true)}
            onMouseLeave={() => setProblemPaused(false)}
            onFocus={() => setProblemPaused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setProblemPaused(false);
            }}
          >
            <div
              ref={problemTrackRef}
              className="flex gap-4 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ transform: `translate3d(-${problemIndex * problemSlide}px, 0, 0)` }}
            >
            {story.problems.map((item, index) => {
              const face = ['motion-line', 'motion-ink', 'motion-sky'][index] || 'motion-line';
              const ink = face === 'motion-ink';
              const active = index === problemIndex;
              return (
                <article
                  key={item.title}
                  className={`${face} w-[88%] shrink-0 snap-start rounded-[1.75rem] border border-white/70 p-7 shadow-[0_24px_50px_-30px_rgba(8,40,90,0.45)] transition-transform duration-500 sm:w-[72%] sm:p-9 high-contrast:border-white high-contrast:bg-black ${active ? 'scale-100' : 'scale-[0.97]'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className={`font-display text-5xl font-bold leading-none ${ink ? 'text-white' : 'text-[#1a73e8]'}`}>
                      0{index + 1}
                    </p>
                    <item.icon className={`h-6 w-6 ${ink ? 'text-white' : 'text-[#0d4f9e]'}`} aria-hidden="true" />
                  </div>
                  <h3 className={`mt-8 font-display text-3xl font-bold leading-tight ${ink ? 'text-white' : 'text-[#001F3F]'} high-contrast:text-white`}>
                    {item.title}
                  </h3>
                  <p className={`mt-4 max-w-xl text-base leading-relaxed ${ink ? 'text-white/90' : 'text-slate-600'} high-contrast:text-white`}>
                    {item.body}
                  </p>
                </article>
              );
            })}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {story.problems.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => showProblem(index)}
                aria-current={index === problemIndex ? 'true' : undefined}
                className={`rounded-full px-3 py-1 text-sm font-bold ${index === problemIndex ? 'bg-[#1a73e8] text-white' : 'text-[#0d4f9e] high-contrast:text-white'}`}
              >
                0{index + 1}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/70 bg-white/35 py-14 high-contrast:border-white high-contrast:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="font-display text-2xl font-bold text-[#001F3F] sm:text-3xl high-contrast:text-white">
              {story.stepsTitle}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600 high-contrast:text-slate-300">
              {story.stepsLead}
            </p>
          </div>
          <ol className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {story.steps.map((item, index) => (
              <li
                key={item.title}
                className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-[0_18px_50px_-28px_rgba(26,115,232,0.45)] high-contrast:border-white high-contrast:bg-black"
              >
                <item.icon className="h-6 w-6 text-[#1a73e8]" aria-hidden="true" />
                <p className="mt-4 text-sm font-bold text-[#1a73e8]">0{index + 1}</p>
                <h3 className="mt-1 font-display text-xl font-semibold text-[#001F3F] high-contrast:text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 high-contrast:text-slate-300">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-white/70 py-14 high-contrast:border-white high-contrast:bg-black">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-[#0d4f9e] via-[#1a73e8] to-[#4aa3f0] p-7 text-white shadow-[0_22px_50px_-28px_rgba(26,115,232,0.55)]">
            <h2 className="font-display text-2xl font-bold">{story.closeTitle}</h2>
            <p className="mt-3 text-base leading-relaxed text-white/90">{story.closeBody}</p>
            <button
              type="button"
              onClick={onGetStarted}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#0e2a4a]"
            >
              {copy.navGetStarted}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
