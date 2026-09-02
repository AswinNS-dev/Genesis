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

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />
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
