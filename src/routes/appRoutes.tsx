import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { Loader2 } from 'lucide-react';

// Carga perezosa (Route-based Code Splitting) para rendimiento < 200 KB
const LoginPage = React.lazy(() => import('@/modules/auth/pages/LoginPage'));
const InvoicesListPage = React.lazy(() => import('@/modules/invoices/pages/InvoicesListPage'));
const ResilienceDashboardPage = React.lazy(() => import('@/modules/resilience/pages/ResilienceDashboardPage'));
const DuaCalculatorPage = React.lazy(() => import('@/modules/customs/pages/DuaCalculatorPage'));
const SireReconciliationPage = React.lazy(() => import('@/modules/sire/pages/SireReconciliationPage'));
const AccountingEntriesPage = React.lazy(() => import('@/modules/accounting/pages/AccountingEntriesPage'));

// Componente de carga elegante mientras se descarga el chunk del módulo
const PageLoadingFallback = () => (
  <div className="h-[60vh] flex flex-col items-center justify-center gap-3 text-muted-foreground">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
    <span className="text-xs font-medium">Cargando módulo vertical...</span>
  </div>
);

export const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        {/* Ruta Pública: Login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas Privadas / Protegidas con Layout Maestro */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/invoices" replace />} />
            
            {/* [M1: Jhordy] Facturación UBL 2.1 */}
            <Route path="/invoices" element={<InvoicesListPage />} />

            {/* [M2: Oliver] Resiliencia SUNAT & Circuit Breaker */}
            <Route path="/resilience" element={<ResilienceDashboardPage />} />

            {/* [M3: Carlos] Aduanas DUA/DAM & Kardex */}
            <Route path="/customs" element={<DuaCalculatorPage />} />

            {/* [M4: Diego] Conciliación Fiscal SIRE */}
            <Route path="/sire" element={<SireReconciliationPage />} />

            {/* [M5: Michael] Contabilidad PCGE & Libros PLE */}
            <Route path="/accounting" element={<AccountingEntriesPage />} />
          </Route>
        </Route>

        {/* Ruta comodín: Redirección al módulo principal */}
        <Route path="*" element={<Navigate to="/invoices" replace />} />
      </Routes>
    </Suspense>
  );
};
