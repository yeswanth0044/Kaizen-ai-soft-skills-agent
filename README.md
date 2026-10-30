# KAIZEN – AI-Powered Soft Skills Agent

KAIZEN is a full-stack AI soft skills coach and interview simulator built to help students and job seekers strengthen workplace communication, interview readiness, leadership phrasing, conflict navigation, and presentation clarity.

## Core Modules

1. **Landing Page**: Overview of capabilities, structured coaching methodology, benefits, and clearly marked sample learner profiles.
2. **Authentication & Security**: Google Sign-In (`signInWithPopup`) plus Email/Password registration, login, password reset, email verification enforcement, and protected backend JWT verification.
3. **Personalized Dashboard**: Live database metrics including daily learning streak, total practice sessions, communication score, interview readiness score, skill trajectory chart, recent activities, and dynamic recommendations.
4. **AI Soft Skills Coach**: Multi-turn conversational mentor with context memory, grammar corrections, written clarity/confidence diagnostics, inline rewritten exemplars, and session management.
5. **Mock Interview Simulator**: 6 interview categories (HR, Technical, Behavioral, Internship, Placement, Leadership) across Beginner, Intermediate, and Advanced tiers with one-question-at-a-time progression and complete end-of-interview performance reports.
6. **Workplace Communication Scenarios**: 9 interactive counterpart role-play simulations (managers, colleagues, cross-functional leads) with turn-by-turn phrasing upgrades.
7. **Presentation & Pitch Studio**: Topic briefs, word-count timing estimates, structural pacing guidance, and side-by-side improved script exemplars.
8. **Progress Tracking & Analytics**: Interactive Weekly (7d) and Monthly (30d) charts, 8-dimension skill mastery breakdown, and searchable report archive.
9. **Profile & Preferences**: Personal learning goals, target role headline, daily practice minutes target, preferred difficulty, and priority focus skills.

## Architecture Overview

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Lucide React, Recharts
- **Backend**: Express REST API (`server.ts`) with Zod payload validation, Firebase Admin ID token verification, and sliding-window AI rate limiting
- **AI Agent Workflow**: 5-node Directed StateGraph (`ConversationManager` -> `ScenarioManager` -> `EvaluationAgent` -> `FeedbackAgent` -> `RecommendationAgent`) powered server-side by `@google/genai` with structured JSON schema validation
- **Database**: Cloud Firestore (`firebase-blueprint.json` + Zero-Trust `firestore.rules`)
