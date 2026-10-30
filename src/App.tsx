import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import {
  subscribeFeedbackReports,
  subscribeLearningActivities,
  subscribeSkillScores,
} from './services/firestoreService.ts';
import { LandingPage } from './components/LandingPage.tsx';
import { AuthView } from './components/AuthView.tsx';
import { AppShell } from './components/AppShell.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { CoachView } from './components/CoachView.tsx';
import { MockInterviewView } from './components/MockInterviewView.tsx';
import { ScenariosView } from './components/ScenariosView.tsx';
import { PresentationView } from './components/PresentationView.tsx';
import { ProgressView } from './components/ProgressView.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import type {
  AppSection,
  FeedbackReport,
  LearningActivity,
  SkillScore,
} from './types/kaizen.ts';

function KaizenWorkspaceRouter() {
  const { user, profile, authReady } = useAuth();
  const [publicView, setPublicView] = useState<'landing' | 'auth'>('landing');
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('signup');
  const [activeSection, setActiveSection] = useState<AppSection>('dashboard');

  const [activities, setActivities] = useState<LearningActivity[]>([]);
  const [skillScores, setSkillScores] = useState<SkillScore[]>([]);
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      setActivities([]);
      setSkillScores([]);
      setReports([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    let loadedCount = 0;
    const markReady = () => {
      loadedCount += 1;
      if (loadedCount >= 3) setDataLoading(false);
    };

    const unsubActivities = subscribeLearningActivities(user.uid, (items) => {
      setActivities(items);
      markReady();
    });

    const unsubSkills = subscribeSkillScores(user.uid, (items) => {
      setSkillScores(items);
      markReady();
    });

    const unsubReports = subscribeFeedbackReports(user.uid, (items) => {
      setReports(items);
      markReady();
    });

    return () => {
      unsubActivities();
      unsubSkills();
      unsubReports();
    };
  }, [authReady, user?.uid, user?.emailVerified]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-sm font-medium text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Loading KAIZEN workspace...</span>
        </div>
      </div>
    );
  }

  // Unauthenticated routes -> Landing Page or Auth Screen
  if (!user) {
    if (publicView === 'auth') {
      return (
        <AuthView
          initialMode={authInitialMode}
          onBackToLanding={() => setPublicView('landing')}
        />
      );
    }
    return (
      <LandingPage
        onGetStarted={(mode = 'signup') => {
          setAuthInitialMode(mode);
          setPublicView('auth');
        }}
      />
    );
  }

  // Authenticated but email not yet verified -> Verification gate
  if (!user.emailVerified) {
    return (
      <AuthView
        initialMode="login"
        onBackToLanding={() => setPublicView('landing')}
      />
    );
  }

  // Authenticated & Verified Workspace
  return (
    <AppShell activeSection={activeSection} onNavigate={setActiveSection}>
      {activeSection === 'dashboard' && (
        <DashboardView
          profile={profile}
          activities={activities}
          skillScores={skillScores}
          reports={reports}
          loading={dataLoading}
          onNavigate={setActiveSection}
        />
      )}
      {activeSection === 'coach' && <CoachView onNavigate={setActiveSection} />}
      {activeSection === 'interviews' && (
        <MockInterviewView reports={reports} onNavigate={setActiveSection} />
      )}
      {activeSection === 'scenarios' && <ScenariosView onNavigate={setActiveSection} />}
      {activeSection === 'presentations' && (
        <PresentationView onNavigate={setActiveSection} />
      )}
      {activeSection === 'progress' && (
        <ProgressView
          profile={profile}
          activities={activities}
          skillScores={skillScores}
          reports={reports}
          onNavigate={setActiveSection}
        />
      )}
      {activeSection === 'profile' && (
        <ProfileView profile={profile} activities={activities} />
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <KaizenWorkspaceRouter />
    </AuthProvider>
  );
}
