import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Briefcase,
  Users,
  Presentation,
  BarChart3,
  UserCog,
  LogOut,
  Menu,
  X,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { checkApiHealth } from '../services/apiClient.ts';
import type { AppSection } from '../types/kaizen.ts';

interface AppShellProps {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: AppSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'coach', label: 'AI Soft Skills Coach', icon: MessageSquare },
  { id: 'interviews', label: 'Mock Interviews', icon: Briefcase },
  { id: 'scenarios', label: 'Workplace Scenarios', icon: Users },
  { id: 'presentations', label: 'Presentation Practice', icon: Presentation },
  { id: 'progress', label: 'Progress & Analytics', icon: BarChart3 },
  { id: 'profile', label: 'Profile & Settings', icon: UserCog },
];

export function AppShell({ activeSection, onNavigate, children }: AppShellProps) {
  const { user, profile, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aiSetupWarning, setAiSetupWarning] = useState<string | null>(null);

  useEffect(() => {
    checkApiHealth()
      .then((res) => {
        setAiSetupWarning(res.aiConfigured ? null : res.setupNotice);
      })
      .catch(() => {
        // Keep silent if transient health check fails
      });
  }, []);

  const currentItem = NAV_ITEMS.find((i) => i.id === activeSection) || NAV_ITEMS[0];
  const displayName =
    profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Learner';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar (260px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-slate-200 z-20">
        <div className="h-16 px-6 flex items-center border-b border-slate-200">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            KAIZEN
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeSection;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="px-2 py-1.5">
            <div className="text-sm font-semibold text-slate-900 truncate">{displayName}</div>
            <div className="text-xs text-slate-500 truncate">
              {profile?.preferredDifficulty || 'Intermediate'} Track
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-2 w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[82vw] bg-white border-r border-slate-200 flex flex-col z-50">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
              <span className="text-lg font-bold tracking-tight text-slate-900">KAIZEN</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === activeSection;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => void logout()}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Log Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Workspace Header (Breadcrumb left, 1 primary action right) */}
        <header className="sticky top-0 z-10 h-16 bg-white/95 backdrop-blur border-b border-slate-200 px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline">Workspace</span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-slate-900 truncate">{currentItem.label}</span>
            </div>
          </div>

          <div className="flex items-center shrink-0">
            {activeSection !== 'coach' ? (
              <button
                type="button"
                onClick={() => onNavigate('coach')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Open AI Coach</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('interviews')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Start Mock Interview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </header>

        {aiSetupWarning && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-3 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{aiSetupWarning}</span>
          </div>
        )}

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
