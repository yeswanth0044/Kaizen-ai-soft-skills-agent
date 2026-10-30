import {
  InterviewCategory,
  PresentationTopic,
  ScenarioDefinition,
  SkillKey,
} from '../types/kaizen.ts';

export const SKILL_DEFINITIONS: { key: SkillKey; label: string; description: string }[] = [
  {
    key: 'communication',
    label: 'Workplace Communication',
    description: 'Clarity, conciseness, and audience-appropriate tone in professional dialogue.',
  },
  {
    key: 'interview',
    label: 'Interview Readiness',
    description: 'Structured STAR storytelling, concrete evidence, and role alignment.',
  },
  {
    key: 'english_fluency',
    label: 'Written English Mechanics',
    description: 'Grammatical precision, natural phrasing, and professional vocabulary.',
  },
  {
    key: 'presentation',
    label: 'Presentation & Pitching',
    description: 'Executive hooks, logical transitions, persuasive framing, and strong closings.',
  },
  {
    key: 'leadership',
    label: 'Leadership Presence',
    description: 'Ownership language, decisive framing, and constructive team alignment.',
  },
  {
    key: 'teamwork',
    label: 'Cross-Functional Teamwork',
    description: 'Active acknowledgment, shared credit, and collaborative problem-solving.',
  },
  {
    key: 'conflict_management',
    label: 'Conflict Navigation',
    description: 'De-escalation, objective fact-framing, and mutually workable trade-offs.',
  },
  {
    key: 'problem_solving',
    label: 'Structured Problem-Solving',
    description: 'Breaking ambiguous problems into clear options, risks, and recommendations.',
  },
];

export const INTERVIEW_CATEGORIES: {
  category: InterviewCategory;
  focus: string;
  typicalRoles: string;
  sampleCriteria: string[];
}[] = [
  {
    category: 'HR Interview',
    focus: 'Career motivation, culture alignment, adaptability, and self-awareness.',
    typicalRoles: 'All graduate & early-career tracks',
    sampleCriteria: ['Role motivation clarity', 'Self-reflection honesty', 'Professional composure'],
  },
  {
    category: 'Technical Interview',
    focus: 'Explaining engineering trade-offs, system architecture decisions, and debugging steps clearly.',
    typicalRoles: 'Software, Data, Product & Analytics',
    sampleCriteria: ['Structured trade-off framing', 'Jargon-to-impact clarity', 'Edge-case reasoning'],
  },
  {
    category: 'Behavioral Interview',
    focus: 'STAR-method evidence across ownership, ambiguity, deadlines, and stakeholder alignment.',
    typicalRoles: 'Product, Consulting, Engineering & Operations',
    sampleCriteria: ['STAR structure completeness', 'Quantified outcome', 'Individual contribution clarity'],
  },
  {
    category: 'Internship Interview',
    focus: 'Academic projects, fast learning mindset, curiosity, and foundational collaboration.',
    typicalRoles: 'Summer & semester internships',
    sampleCriteria: ['Project learning articulation', 'Coachability', 'Concise background pitch'],
  },
  {
    category: 'Placement Interview',
    focus: 'Campus-to-corporate readiness, capstone impact, teamwork, and workplace reliability.',
    typicalRoles: 'University campus placements & graduate schemes',
    sampleCriteria: ['Capstone ownership', 'Problem-to-solution clarity', 'Professional vocabulary'],
  },
  {
    category: 'Leadership Interview',
    focus: 'Influencing without authority, mentoring peers, resolving bottlenecks, and strategic prioritization.',
    typicalRoles: 'Team Lead, Product Lead & Student Organization Heads',
    sampleCriteria: ['Decision rationale', 'Accountability under pressure', 'Stakeholder empathy'],
  },
];

export const COMMUNICATION_SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'intro-self',
    title: 'Introducing Yourself Professionally',
    category: 'First Impressions',
    counterpartRole: 'Hiring Manager at Networking Mixer',
    counterpartName: 'Elena Vance, VP of Product',
    difficulty: 'Beginner',
    targetSkill: 'communication',
    situation:
      'You meet the VP of Product from a company you admire during a 3-minute coffee break at an industry career forum.',
    userObjective:
      'Deliver a crisp 60-second introduction connecting your current background, a concrete strength, and why their team interests you.',
    openingLine:
      "Hi there—great session earlier, wasn't it? I don't think we've met yet. I'm Elena from the Product group. What brings you to today's forum?",
    evaluationCriteria: [
      'Concise hook without rambling',
      'Specific project or academic evidence',
      'Natural curiosity question at the end',
    ],
  },
  {
    id: 'talk-colleagues',
    title: 'Talking with Colleagues on a Shared Sprint',
    category: 'Teamwork',
    counterpartRole: 'Frontend Engineer Teammate',
    counterpartName: 'Marcus Chen, Senior Frontend Developer',
    difficulty: 'Beginner',
    targetSkill: 'teamwork',
    situation:
      'You joined a project team two weeks ago and need to coordinate API payload changes with a busy teammate before Friday.',
    userObjective:
      'Explain what changed clearly, respect your colleague’s current workload, and agree on a concrete sync plan.',
    openingLine:
      'Hey! I saw your message about updating the checkout endpoint schema. My plate is pretty full before Thursday—what exactly needs to change on my side?',
    evaluationCriteria: [
      'Clear summary of dependencies',
      'Collaborative rather than demanding tone',
      'Concrete next step and timeline',
    ],
  },
  {
    id: 'comm-managers',
    title: 'Communicating a Timeline Risk to Your Manager',
    category: 'Upward Communication',
    counterpartRole: 'Engineering Manager',
    counterpartName: 'Priya Nair, Engineering Manager',
    difficulty: 'Intermediate',
    targetSkill: 'problem_solving',
    situation:
      'A third-party dataset has unexpected schema errors that will delay your Friday deliverable unless you descope one secondary chart.',
    userObjective:
      'Surface the blocker early without making excuses, present two clear options with trade-offs, and recommend a path forward.',
    openingLine:
      'Hi—thanks for flagging a quick check-in. How is Friday’s client analytics deliverable tracking right now?',
    evaluationCriteria: [
      'Headline-first status framing',
      'Presents concrete options instead of just problems',
      'Clear ownership and mitigation plan',
    ],
  },
  {
    id: 'ask-questions',
    title: 'Asking Clarifying Questions Professionally',
    category: 'Workplace Clarity',
    counterpartRole: 'Project Lead',
    counterpartName: 'David Okafor, Engagement Lead',
    difficulty: 'Beginner',
    targetSkill: 'english_fluency',
    situation:
      'Your project lead assigned a research brief with ambiguous success metrics and an unclear target persona.',
    userObjective:
      'Ask structured, thoughtful clarifying questions that show preparation rather than passivity.',
    openingLine:
      'I just shared the one-pager for the Q4 onboarding audit. Let me know if everything makes sense before you dive in.',
    evaluationCriteria: [
      'Demonstrates prior reading of the brief',
      'Groups questions logically',
      'Proposes a default assumption to save time',
    ],
  },
  {
    id: 'group-discussion',
    title: 'Participating in a Group Discussion',
    category: 'Group Dynamics',
    counterpartRole: 'Cross-Functional Panel Facilitator',
    counterpartName: 'Hannah Brooks, Strategy Lead',
    difficulty: 'Intermediate',
    targetSkill: 'leadership',
    situation:
      'During a 4-person campus placement or product roundtable, two participants are debating speed versus quality in circles.',
    userObjective:
      'Acknowledge both viewpoints concisely, synthesize the core trade-off, and introduce a practical middle-ground framework.',
    openingLine:
      'We seem split between launching the beta next week with rough edges or waiting a full month to polish every workflow. Where do you stand on this?',
    evaluationCriteria: [
      'Validates existing points diplomatically',
      'Reframes debate around user impact',
      'Advances discussion toward a decision',
    ],
  },
  {
    id: 'handle-disagreements',
    title: 'Handling Workplace Disagreements',
    category: 'Conflict Management',
    counterpartRole: 'Marketing Partner',
    counterpartName: 'Lucas Meyer, Growth Manager',
    difficulty: 'Advanced',
    targetSkill: 'conflict_management',
    situation:
      'A partner wants to promise a feature in tomorrow’s campaign email that your team has not finished testing.',
    userObjective:
      'Push back firmly on the unverified claim while preserving trust and offering a credible alternative angle for the campaign.',
    openingLine:
      'Look, if we don’t announce automated exports in tomorrow’s newsletter, our launch numbers will fall flat. Can’t your team just patch any bugs over the weekend?',
    evaluationCriteria: [
      'Calm, non-defensive boundary setting',
      'Explains customer trust risk objectively',
      'Offers a constructive alternative for their goal',
    ],
  },
  {
    id: 'constructive-feedback',
    title: 'Giving Constructive Peer Feedback',
    category: 'Leadership & Mentoring',
    counterpartRole: 'Junior Project Teammate',
    counterpartName: 'Sora Takahashi, Associate Analyst',
    difficulty: 'Advanced',
    targetSkill: 'leadership',
    situation:
      'Your teammate worked late on a client slide deck, but the slides are text-heavy and bury the main recommendation until slide 14.',
    userObjective:
      'Recognize their effort genuinely while giving specific, actionable structural feedback before the afternoon rehearsal.',
    openingLine:
      'I stayed up until midnight pulling all the survey tables into the deck! What do you think—ready for the director review at 3 PM?',
    evaluationCriteria: [
      'Specific praise anchored in real effort',
      'Focuses critique on document impact, not person',
      'Actionable restructuring suggestion',
    ],
  },
  {
    id: 'explain-ideas',
    title: 'Explaining Complex Technical Ideas Clearly',
    category: 'Executive Clarity',
    counterpartRole: 'Non-Technical Operations Director',
    counterpartName: 'Claire Bennett, Director of Operations',
    difficulty: 'Intermediate',
    targetSkill: 'presentation',
    situation:
      'An operations director asks why migrating legacy spreadsheets to an automated validation pipeline takes three weeks instead of two days.',
    userObjective:
      'Translate technical complexity into plain business outcomes, risk reduction, and time saved without condescending jargon.',
    openingLine:
      'Help me understand—we already have all the customer rows in Excel. Why does building this new data pipeline take three weeks instead of just importing the file?',
    evaluationCriteria: [
      'Zero unexplained technical jargon',
      'Uses concrete everyday analogy or example',
      'Links timeline directly to business reliability',
    ],
  },
  {
    id: 'workplace-conversations',
    title: 'Navigating Scope Creep in Everyday Conversations',
    category: 'Workplace Boundaries',
    counterpartRole: 'Cross-Team Stakeholder',
    counterpartName: 'Ryan Patel, Account Executive',
    difficulty: 'Intermediate',
    targetSkill: 'communication',
    situation:
      'An account executive messages you casually asking for "just one quick custom dashboard" for a prospect call tomorrow morning.',
    userObjective:
      'Clarify realistic effort politely, protect committed sprint priorities, and offer either a lightweight workaround or proper intake.',
    openingLine:
      'Hey! Quick favor—I have a demo with Acme Corp at 10 AM tomorrow. Could you spin up a custom ROI view with their sample CSV tonight? Should only take 20 minutes, right?',
    evaluationCriteria: [
      'Polite, confident expectation setting',
      'Transparent trade-off explanation',
      'Provides an immediate low-lift option',
    ],
  },
];

export const PRESENTATION_TOPICS: PresentationTopic[] = [
  {
    id: 'capstone-pitch',
    title: '3-Minute Capstone or Portfolio Project Pitch',
    audience: 'Hiring panel of engineering and product managers',
    recommendedDurationMinutes: 3,
    difficulty: 'Beginner',
    context:
      'Present a technical, academic, or operational project you built—focusing on the real problem, key decisions you made, and measurable results.',
    keyPointsToCover: [
      'Compelling opening problem statement',
      'Why existing approaches fell short',
      'Your specific architecture or workflow decisions',
      'Quantified result and key lesson learned',
    ],
  },
  {
    id: 'quarterly-review',
    title: 'Sprint / Internship Mid-Point Progress Briefing',
    audience: 'Department head, mentor, and cross-functional peers',
    recommendedDurationMinutes: 4,
    difficulty: 'Intermediate',
    context:
      'Deliver a structured progress update highlighting milestones shipped, one obstacle overcome, and priorities for the next four weeks.',
    keyPointsToCover: [
      'Executive summary of current status against goals',
      'Key metrics or deliverables completed',
      'Root cause and resolution of one key challenge',
      'Next milestones and resource requests',
    ],
  },
  {
    id: 'process-proposal',
    title: 'Proposing a Workflow Improvement to Leadership',
    audience: 'Operations & team leadership group',
    recommendedDurationMinutes: 5,
    difficulty: 'Intermediate',
    context:
      'Persuade leadership to adopt a new tool, checklist, or automation step that saves team hours and reduces recurring errors.',
    keyPointsToCover: [
      'Quantified cost of the current manual bottleneck',
      'Proposed workflow change in 3 simple steps',
      'Rollout effort and risk mitigation',
      'Expected ROI and concrete pilot proposal',
    ],
  },
  {
    id: 'incident-postmortem',
    title: 'Blameless Post-Mortem & Recovery Presentation',
    audience: 'Cross-functional engineering and customer support leads',
    recommendedDurationMinutes: 5,
    difficulty: 'Advanced',
    context:
      'Walk stakeholders through what caused a missed deadline or outage, how customer impact was contained, and systemic safeguards added.',
    keyPointsToCover: [
      'Clear, accountable impact summary',
      'Objective timeline and root cause (no blame)',
      'What worked well during containment',
      'Concrete preventive action items with owners',
    ],
  },
  {
    id: 'first-90-days',
    title: 'First 30-60-90 Day Plan for a Target Role',
    audience: 'Final-round hiring committee',
    recommendedDurationMinutes: 4,
    difficulty: 'Advanced',
    context:
      'Outline how you would onboard, build stakeholder trust, deliver an early win, and scale impact in your first three months.',
    keyPointsToCover: [
      'Days 1-30: Listening, context gathering, and baseline audit',
      'Days 31-60: Executing a scoped high-confidence win',
      'Days 61-90: Scaling impact and measurable KPIs',
      'How you will solicit feedback along the way',
    ],
  },
];
