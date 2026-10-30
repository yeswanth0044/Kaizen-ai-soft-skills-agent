import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { ResilientImage } from './ResilientImage.tsx';

interface LandingPageProps {
  onGetStarted: (initialMode?: 'signup' | 'login') => void;
}

const HERO_IMAGE = '/src/assets/images/kaizen_hero_coaching_1793341868415.jpg';
const INTERVIEW_IMAGE = '/src/assets/images/kaizen_interview_studio_1793341868054.jpg';
const PRESENTATION_IMAGE = '/src/assets/images/kaizen_presentation_stage_1793341868798.jpg';

const SAMPLE_TESTIMONIALS = [
  {
    name: 'Aarav Mehta',
    role: 'Final-Year B.Tech Computer Science',
    org: 'Campus Placement Track (Sample Profile)',
    quote:
      'Before practicing here, my behavioral answers wandered for four minutes without stating my personal contribution. After six structured STAR mock interviews, I cut filler hedging and explained my distributed cache project with clear metrics.',
    outcome: '+24 pts in Interview Structure across 6 sessions',
  },
  {
    name: 'Sofia Lindqvist',
    role: 'Junior Product Analyst',
    org: 'Early-Career Transition (Sample Profile)',
    quote:
      'Pushing back on unrealistic stakeholder deadlines used to make me freeze up. Role-playing upward timeline negotiations gave me concrete phrasing to present options calmly instead of apologizing.',
    outcome: '9 workplace scenarios practiced over 3 weeks',
  },
  {
    name: 'Daniel Osei',
    role: 'MSc Business Analytics Candidate',
    org: 'Graduate Internship Cohort (Sample Profile)',
    quote:
      'Submitting my capstone pitch script before rehearsal highlighted passive verbs and buried conclusions. Moving my headline finding to the first 30 seconds transformed how faculty responded.',
    outcome: 'Presentation score improved from 64 to 88/100',
  },
];

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 h-16">
          <a
            href="#top"
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            KAIZEN
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#features"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#benefits"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Benefits
            </a>
            <a
              href="#testimonials"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Testimonials
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onGetStarted('signup')}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-14 pb-16 lg:pt-20 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:col-span-6 flex flex-col justify-center"
            >
              <p className="text-xs font-medium text-indigo-600 mb-4">
                AI Soft Skills &amp; Career Readiness Mentor
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.35rem] font-bold tracking-tight text-slate-900 leading-[1.1] [text-wrap:balance]">
                Build Confidence. Master Communication. Grow Every Day.
              </h1>
              <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Practice real-world interviews, workplace conversations, leadership scenarios, and
                presentations with a personal AI mentor that evaluates written clarity, grammar,
                and structure—and tracks measurable improvement over time.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => onGetStarted('signup')}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('features')}
                  className="px-5 py-3 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Explore Features
                </button>
                <button
                  type="button"
                  onClick={() => onGetStarted('login')}
                  className="px-3 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Sign in to existing account
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>6 Mock Interview Tracks</span>
                <span aria-hidden="true">·</span>
                <span>9 Workplace Role-Play Scenarios</span>
                <span aria-hidden="true">·</span>
                <span>8-Part Criterion Feedback</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="lg:col-span-6 flex"
            >
              <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <ResilientImage
                  src={HERO_IMAGE}
                  alt="Young professional presenting ideas clearly in a sunlit modern conference studio"
                  fallbackLabel="KAIZEN Interactive Communication Studio"
                  className="w-full h-full min-h-[300px] lg:h-full object-cover aspect-video"
                />
              </div>
            </motion.div>
          </div>

          {/* Full-width 4-column capability metrics strip below hero */}
          <div className="mt-14 pt-10 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-slate-900">
                10
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Core soft skills evaluated across workplace &amp; interview contexts
              </p>
            </div>
            <div>
              <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-slate-900">
                6 Tracks
              </div>
              <p className="mt-1 text-sm text-slate-600">
                HR, Technical, Behavioral, Internship, Placement &amp; Leadership interviews
              </p>
            </div>
            <div>
              <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-slate-900">
                5-Stage
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Agent workflow from context memory to targeted skill recommendations
              </p>
            </div>
            <div>
              <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-slate-900">
                0–100
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Explicit rubric scoring grounded strictly in written communication evidence
              </p>
            </div>
          </div>
        </section>

        {/* Asymmetric Bento Feature Showcase */}
        <section id="features" className="bg-slate-50 border-y border-slate-200 py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-medium text-indigo-600 mb-2">Platform Modules</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
                Every environment you need to rehearse high-stakes communication
              </h2>
              <p className="mt-3 text-base text-slate-600 leading-relaxed">
                Move beyond passive video courses. Practice active responses, inspect line-by-line
                upgrades, and measure progress across every session.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Feature 1: Col-span-2 */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-8 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-slate-500 mb-2">
                    <span>Conversational Mentor</span>
                    <span className="mx-2" aria-hidden="true">·</span>
                    <span>Context Memory &amp; Inline Rewrites</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    01. AI Soft Skills Coach with Written Evidence Analysis
                  </h3>
                  <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
                    Hold multi-turn coaching dialogues on difficult emails, stakeholder pushback,
                    English phrasing, or career narratives. Every message you write receives
                    instant grammar notes, clarity diagnostics, and an improved professional
                    rewrite without breaking conversation flow.
                  </p>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-semibold text-slate-900">Grammar &amp; Mechanics</div>
                    <p className="text-xs text-slate-500 mt-1">
                      Pinpoints tense shifts, run-on clauses, and informal wording.
                    </p>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Confidence Phrasing</div>
                    <p className="text-xs text-slate-500 mt-1">
                      Flags excessive hedging and models direct ownership verbs.
                    </p>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Session Persistence</div>
                    <p className="text-xs text-slate-500 mt-1">
                      Resume or review any past coaching thread across devices.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 2: Col-span-1 with Interview Studio image */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
                <ResilientImage
                  src={INTERVIEW_IMAGE}
                  alt="Candidate and hiring manager in a structured mock interview"
                  fallbackLabel="Mock Interview Simulator"
                  className="w-full h-48 object-cover border-b border-slate-100"
                />
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-slate-500 mb-2">
                      <span>Beginner · Intermediate · Advanced</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      02. Mock Interview Simulator
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      Answer one realistic question at a time across HR, Technical, Behavioral,
                      Internship, Placement, and Leadership interviews, culminating in a complete
                      readiness report.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 3: Col-span-1 with Workplace Collaboration image */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
                <ResilientImage
                  src={PRESENTATION_IMAGE}
                  alt="Professionals collaborating in a workplace roundtable scenario"
                  fallbackLabel="Workplace Role-Play Scenarios"
                  className="w-full h-48 object-cover border-b border-slate-100"
                />
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-slate-500 mb-2">
                      <span>9 Counterpart Personas</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      03. Workplace Role-Play Scenarios
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      Practice negotiating deadlines with managers, resolving team disagreements,
                      giving constructive peer feedback, and explaining technical ideas to
                      non-technical leaders.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 4: Col-span-2 */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-8 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-slate-500 mb-2">
                    <span>Presentation Studio</span>
                    <span className="mx-2" aria-hidden="true">·</span>
                    <span>Longitudinal Skill Analytics</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    04. Presentation Script Review &amp; Continuous Skill Tracking
                  </h3>
                  <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
                    Draft capstone pitches, 30-60-90 day plans, or leadership proposals. Receive a
                    full sample improved script, structural pacing guidance, and interactive weekly
                    and monthly charts tracking your growth across eight soft skill dimensions.
                  </p>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                  <div className="text-xs text-slate-500">
                    <span>Overall Score out of 100</span>
                    <span className="mx-2" aria-hidden="true">·</span>
                    <span>Vocabulary Upgrades</span>
                    <span className="mx-2" aria-hidden="true">·</span>
                    <span>Suggested Next Exercise</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onGetStarted('signup')}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>Start your first practice session</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-medium text-indigo-600 mb-2">Structured Workflow</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
                How KAIZEN turns deliberate practice into career readiness
              </h2>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="pt-6 border-t border-slate-200">
                <div className="font-mono tabular-nums text-sm font-semibold text-indigo-600">
                  01. Select Context
                </div>
                <h3 className="mt-2 text-base font-bold text-slate-900">
                  Pick an interview, scenario, or pitch
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Choose your target difficulty tier from Beginner to Advanced and review explicit
                  evaluation criteria upfront.
                </p>
              </div>

              <div className="pt-6 border-t border-slate-200">
                <div className="font-mono tabular-nums text-sm font-semibold text-indigo-600">
                  02. Practice Actively
                </div>
                <h3 className="mt-2 text-base font-bold text-slate-900">
                  Respond in realistic dialogue
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Engage with an AI hiring manager, colleague, or executive mentor that remembers
                  context and probes vague claims.
                </p>
              </div>

              <div className="pt-6 border-t border-slate-200">
                <div className="font-mono tabular-nums text-sm font-semibold text-indigo-600">
                  03. Inspect Rewrites
                </div>
                <h3 className="mt-2 text-base font-bold text-slate-900">
                  Compare your draft to an exemplar
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Review your 8-part feedback report with grammar fixes, stronger vocabulary, and a
                  polished version of your exact answer.
                </p>
              </div>

              <div className="pt-6 border-t border-slate-200">
                <div className="font-mono tabular-nums text-sm font-semibold text-indigo-600">
                  04. Compound Gains
                </div>
                <h3 className="mt-2 text-base font-bold text-slate-900">
                  Follow data-driven next steps
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Maintain your daily learning streak and launch recommended exercises targeting
                  your lowest-scoring dimension.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="benefits" className="py-20 bg-slate-50 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5">
              <p className="text-xs font-medium text-indigo-600 mb-2">Why Students &amp; Job Seekers Choose KAIZEN</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
                Honest, evidence-based feedback without guesswork
              </h2>
              <p className="mt-4 text-base text-slate-600 leading-relaxed">
                Generic chatbots flatter every answer. KAIZEN grades against transparent workplace
                rubrics—evaluating what is actually written on the page so you know exactly how to
                improve.
              </p>
            </div>

            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
              {[
                {
                  title: 'Explicit Criterion Scoring',
                  desc: 'Weighted sub-scores across Clarity, Grammar, Logical Structure, Professional Vocabulary, and Written Confidence Phrasing.',
                },
                {
                  title: 'Safe Space to Rehearse High-Friction Moments',
                  desc: 'Practice pushing back on scope creep, explaining delays to managers, or navigating group discussion deadlocks before they happen at work.',
                },
                {
                  title: 'Actionable Side-by-Side Exemplars',
                  desc: 'Every session shows how your own ideas sound when tightened into crisp, executive-ready sentences.',
                },
                {
                  title: 'Real Database Progress & History',
                  desc: 'Every interview transcript, scenario score, feedback report, and daily streak is saved to your personal account.',
                },
              ].map((item) => (
                <div key={item.title} className="p-6 flex items-start gap-4">
                  <div className="mt-0.5 w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section (Clearly Marked Sample Content) */}
        <section id="testimonials" className="py-20 bg-white border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-xs font-medium text-slate-500 mb-2">
                  Sample Learner Stories · Illustrative Use Cases
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
                  How structured rehearsal changes real-world communication
                </h2>
              </div>
              <p className="text-xs text-slate-500 max-w-sm">
                Note: The profiles below are clearly marked sample personas illustrating how
                students and job seekers use KAIZEN workflows.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              {SAMPLE_TESTIMONIALS.map((t) => (
                <div
                  key={t.name}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="text-xs text-slate-500 mb-3">
                      <span>Sample Persona</span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-indigo-700">{t.outcome}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-200/80">
                    <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {t.role} · {t.org}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Conversion CTA Block */}
            <div className="mt-16 bg-slate-900 rounded-2xl p-8 sm:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="max-w-xl">
                <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight [text-wrap:balance]">
                  Ready to practice your next interview or presentation?
                </h3>
                <p className="mt-2 text-sm sm:text-base text-slate-300 tracking-wide">
                  Create your account in seconds and receive structured coaching feedback on your
                  very first response.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onGetStarted('signup')}
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-slate-900 bg-white rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Start Practicing Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900">KAIZEN</span>
            <p className="mt-1 text-xs text-slate-500">
              AI-Powered Soft Skills &amp; Professional Communication Mentor
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500">
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
              How It Works
            </a>
            <a href="#benefits" className="hover:text-slate-900 transition-colors">
              Benefits
            </a>
            <button
              type="button"
              onClick={() => onGetStarted('login')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <span>&copy; {new Date().getFullYear()} KAIZEN</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
