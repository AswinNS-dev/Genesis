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

export const AppRouter: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('dashboard');

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
      <Navbar />
      <div className="flex flex-1">
        <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />
        <main className="flex-1 p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};
