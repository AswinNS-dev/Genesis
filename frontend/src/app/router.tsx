import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar user={user} />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export const AppRouter: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">Initializing CrimeIntel...</div>;
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardView />} />
          <Route path="/cases" element={<CasesView />} />
          <Route path="/entities" element={<EntitiesView />} />
          <Route path="/analysis" element={<AnalysisView />} />
          <Route path="/data-workspace" element={<DataWorkspaceView />} />
          <Route path="/blockchain" element={<BlockchainView />} />
          <Route path="/reports" element={<ReportsView />} />
          <Route path="/security" element={<SecurityView />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
};
