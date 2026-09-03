import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { LoginView } from '../features/auth/LoginView';
import { DashboardView } from '../features/dashboard/DashboardView';
import { CasesView } from '../features/cases/CasesView';
import { EntitiesView } from '../features/entities/EntitiesView';
import { AnalysisView } from '../features/analysis/AnalysisView';
import { DataWorkspaceView } from '../features/data-workspace/DataWorkspaceView';
import { BlockchainView } from '../features/blockchain/BlockchainView';
import { ReportsView } from '../features/reports/ReportsView';
import { SecurityView } from '../features/security/SecurityView';
import { VisualizationsView } from '../features/visualizations/VisualizationsView';
import { NetworkGraphView } from '../features/network-graph/NetworkGraphView';
import { LocationAnalysisView } from '../features/locations/LocationAnalysisView';

/**
 * Route guard requiring active authenticated session
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-mono">
        <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs tracking-widest uppercase text-sky-400">Verifying Officer Security Clearance...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

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
      <Routes>
        {/* Public Login Gateway */}
        <Route path="/login" element={<LoginView />} />

        {/* Protected Application Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardView />} />
                  <Route path="/visualizations" element={<VisualizationsView />} />
                  <Route path="/locations" element={<LocationAnalysisView />} />
                  <Route path="/network-graph" element={<NetworkGraphView />} />
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
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};
