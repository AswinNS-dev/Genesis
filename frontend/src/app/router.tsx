import React, { useState } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { DashboardView } from '../features/dashboard/DashboardView';
import { CasesView } from '../features/cases/CasesView';
import { EntitiesView } from '../features/entities/EntitiesView';
import { AnalysisView } from '../features/analysis/AnalysisView';
import { DataWorkspaceView } from '../features/data-workspace/DataWorkspaceView';
import { BlockchainView } from '../features/blockchain/BlockchainView';
import { ReportsView } from '../features/reports/ReportsView';
import { SecurityView } from '../features/security/SecurityView';
import { LoginView } from '../features/auth/LoginView';
import { useAuth } from './providers';

export const AppRouter: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Initializing CrimeIntel…
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'cases':
        return <CasesView />;
      case 'entities':
        return <EntitiesView />;
      case 'analysis':
        return <AnalysisView />;
      case 'data-workspace':
        return <DataWorkspaceView />;
      case 'blockchain':
        return <BlockchainView />;
      case 'reports':
        return <ReportsView />;
      case 'security':
        return <SecurityView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar user={user} />
      <div className="flex flex-1">
        <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />
        <main className="flex-1 p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};
