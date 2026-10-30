import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZodError } from 'zod';
import { requireAuth, aiRateLimiter, type AuthenticatedRequest } from './src/server/middleware/auth.ts';
import {
  ChatMessageRequestSchema,
  InterviewStartRequestSchema,
  InterviewAnswerRequestSchema,
  PracticeStartRequestSchema,
  PracticeSubmitRequestSchema,
  PresentationEvaluateRequestSchema,
  SessionReportRequestSchema,
} from './src/server/schemas/apiSchemas.ts';
import {
  GeminiConfigurationError,
  isGeminiConfigured,
} from './src/server/agents/geminiClient.ts';
import {
  runCoachAgentWorkflow,
  startMockInterviewWorkflow,
  evaluateInterviewTurnWorkflow,
  runScenarioTurnWorkflow,
  evaluatePresentationWorkflow,
  generateSessionFeedbackReportWorkflow,
} from './src/server/agents/kaizenGraph.ts';
import {
  COMMUNICATION_SCENARIOS,
  INTERVIEW_CATEGORIES,
  PRESENTATION_TOPICS,
  SKILL_DEFINITIONS,
} from './src/data/scenarios.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Security & CORS configuration
  app.disable('x-powered-by');
  app.use((req: Request, res: Response, next: NextFunction) => {
    const allowedOrigin = process.env.APP_URL || req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: '1mb' }));

  const api = express.Router();

  // Health & AI Readiness Check (never exposes secrets)
  api.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      aiConfigured: isGeminiConfigured(),
      setupNotice: isGeminiConfigured()
        ? null
        : 'Gemini API key is not configured yet. Please select or add GEMINI_API_KEY in the Settings > Secrets panel.',
    });
  });

  // Auth Verification Endpoint (/api/auth/me)
  api.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({
      uid: req.user?.uid,
      email: req.user?.email || '',
      emailVerified: Boolean(req.user?.email_verified),
      name: req.user?.name || '',
    });
  });

  // AI Soft Skills Coach (/api/chat/message & /api/chat/report)
  api.post(
    '/chat/message',
    requireAuth,
    aiRateLimiter,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const payload = ChatMessageRequestSchema.parse(req.body);
        const evaluation = await runCoachAgentWorkflow(payload);
        res.json(evaluation);
      } catch (err) {
        next(err);
      }
    }
  );

  api.post(
    '/chat/report',
    requireAuth,
    aiRateLimiter,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const payload = SessionReportRequestSchema.parse(req.body);
        const report = await generateSessionFeedbackReportWorkflow(payload);
        res.json(report);
      } catch (err) {
        next(err);
      }
    }
  );

  // Mock Interviews (/api/interviews/start & /api/interviews/answer)
  api.post(
    '/interviews/start',
    requireAuth,
    aiRateLimiter,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const payload = InterviewStartRequestSchema.parse(req.body);
        const started = await startMockInterviewWorkflow(payload);
        res.json(started);
      } catch (err) {
        next(err);
      }
    }
  );

  api.post(
    '/interviews/answer',
    requireAuth,
    aiRateLimiter,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const payload = InterviewAnswerRequestSchema.parse(req.body);
        const evaluation = await evaluateInterviewTurnWorkflow(payload);
        res.json(evaluation);
      } catch (err) {
        next(err);
      }
    }
  );

  // Communication & Presentation Practice (/api/practice/* & /api/presentations/*)
  api.get('/practice/scenarios', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      scenarios: COMMUNICATION_SCENARIOS,
      interviewCategories: INTERVIEW_CATEGORIES,
      presentationTopics: PRESENTATION_TOPICS,
      skills: SKILL_DEFINITIONS,
    });
  });

  api.post(
    '/practice/start',
    requireAuth,
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const payload = PracticeStartRequestSchema.parse(req.body);
        const scenario = COMMUNICATION_SCENARIOS.find((s) => s.id === payload.scenarioId);
        if (!scenario) {
          res.status(404).json({ error: 'Selected communication scenario was not found.' });
          return;
        }
        res.json({
          scenario,
          openingMessage: scenario.openingLine,
          difficulty: payload.difficulty || scenario.difficulty,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  api.post(
    '/practice/submit',
    requireAuth,
    aiRateLimiter,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const payload = PracticeSubmitRequestSchema.parse(req.body);
        const evaluation = await runScenarioTurnWorkflow(payload);
        res.json(evaluation);
      } catch (err) {
        next(err);
      }
    }
  );

  api.post(
    '/presentations/evaluate',
    requireAuth,
    aiRateLimiter,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const payload = PresentationEvaluateRequestSchema.parse(req.body);
        const report = await evaluatePresentationWorkflow(payload);
        res.json(report);
      } catch (err) {
        next(err);
      }
    }
  );

  // Mount REST router under /api
  app.use('/api', api);

  // Centralized API Error Handler
  app.use('/api', (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: err.issues.map((i) => i.message).join('; ') || 'Invalid request payload.',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    if (err instanceof GeminiConfigurationError) {
      res.status(err.statusCode).json({
        error: err.message,
        code: err.code,
      });
      return;
    }

    console.error('API Error:', err);
    res.status(500).json({
      error:
        err instanceof Error
          ? err.message
          : 'An unexpected server error occurred while processing your request.',
      code: 'INTERNAL_SERVER_ERROR',
    });
  });

  // Frontend Serving: Vite Middleware in Dev, Static Bundle in Production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KAIZEN full-stack server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start KAIZEN server:', err);
  process.exit(1);
});
