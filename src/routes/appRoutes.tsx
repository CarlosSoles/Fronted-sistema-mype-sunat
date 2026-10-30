import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleProtectedRoute } from './RoleProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { getDefaultRouteForRole } from './roleNavigation';
import { Loader2 } from 'lucide-react';

// Carga perezosa (Route-based Code Splitting)
const LoginPage = React.lazy(() => import('@/modules/auth/pages/LoginPage'));
const RegisterPage = React.lazy(() => import('@/modules/auth/pages/RegisterPage'));
const ProfilePage = React.lazy(() => import('@/modules/auth/pages/ProfilePage'));
const SecurityPage = React.lazy(() => import('@/modules/auth/pages/SecurityPage'));

const InvoicesListPage = React.lazy(() => import('@/modules/invoices/InvoiceList'));
const InvoiceEmissionPage = React.lazy(() => import('@/modules/invoices/pages/InvoiceEmissionPage'));
const ResilienceDashboardPage = React.lazy(() => import('@/modules/resilience/pages/ResilienceDashboardPage'));
const CustomsDashboardPage = React.lazy(() => import('@/modules/customs/pages/CustomsDashboardPage'));
const ShipmentsListPage = React.lazy(() => import('@/modules/customs/pages/ShipmentsListPage'));
const ShipmentDetailPage = React.lazy(() => import('@/modules/customs/pages/ShipmentDetailPage'));
const DuaRegistrationWizardPage = React.lazy(() => import('@/modules/customs/pages/DuaRegistrationWizardPage'));
const CustomsLiquidationPage = React.lazy(() => import('@/modules/customs/pages/CustomsLiquidationPage'));
const LandedCostSheetPage = React.lazy(() => import('@/modules/customs/pages/LandedCostSheetPage'));
const KardexPermanentPage = React.lazy(() => import('@/modules/customs/pages/KardexPermanentPage'));
const SireExportAuditPage = React.lazy(() => import('@/modules/customs/pages/SireExportAuditPage'));
const DuaCalculatorPage = React.lazy(() => import('@/modules/customs/pages/DuaCalculatorPage'));
const SireReconciliationPage = React.lazy(() => import('@/modules/sire/pages/SireReconciliationPage'));
const SireImportPage = React.lazy(() => import('@/modules/sire/pages/SireImportPage'));
const SireClosurePage = React.lazy(() => import('@/modules/sire/pages/SireClosurePage'));
const SireHistoryPage = React.lazy(() => import('@/modules/sire/pages/SireHistoryPage'));

// Submódulos de Contabilidad PCGE (M4)
const AccountingEntriesPage = React.lazy(() => import('@/modules/accounting/pages/AccountingEntriesPage'));
const AccountingPlanCuentasPage = React.lazy(() => import('@/modules/accounting/pages/AccountingPlanCuentasPage'));
const AccountingPlePage = React.lazy(() => import('@/modules/accounting/pages/AccountingPlePage'));

// Fallback de carga durante la descarga del chunk
const PageLoadingFallback = () => (
  <div className="h-[60vh] flex flex-col items-center justify-center gap-3 text-muted-foreground">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
    <span className="text-xs font-medium">Cargando módulo...</span>
  </div>
);

// Redirección dinámica al módulo correspondiente según la Matriz RBAC del rol activo
const RoleHomeRedirect = () => {
  const { user } = useAuth();
  const target = getDefaultRouteForRole(user?.role);
  return <Navigate to={target} replace />;
};

export const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Rutas Protegidas bajo Layout Principal */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<RoleHomeRedirect />} />

            {/* Módulo de Identidad & Perfil */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings/security" element={<SecurityPage />} />

            {/* [M1: Facturación] ADMIN, OPERADOR_FACTURACION, CONTADOR, AUDITOR */}
            <Route path="/invoices" element={<Navigate to="/invoices/facturas" replace />} />
            <Route
              path="/invoices/facturas"
              element={
                <RoleProtectedRoute
                  allowedRoles={['ADMIN', 'OPERADOR_FACTURACION', 'CONTADOR', 'AUDITOR', 'OPERATOR', 'ACCOUNTANT']}
                >
                  <InvoicesListPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/invoices/emision"
              element={
                <RoleProtectedRoute
                  allowedRoles={['ADMIN', 'OPERADOR_FACTURACION', 'CONTADOR', 'AUDITOR', 'OPERATOR', 'ACCOUNTANT']}
                >
                  <InvoiceEmissionPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/invoices/notas"
              element={
                <RoleProtectedRoute
                  allowedRoles={['ADMIN', 'OPERADOR_FACTURACION', 'CONTADOR', 'AUDITOR', 'OPERATOR', 'ACCOUNTANT']}
                >
                  <InvoicesListPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/invoices/bajas"
              element={
                <RoleProtectedRoute
                  allowedRoles={['ADMIN', 'OPERADOR_FACTURACION', 'CONTADOR', 'AUDITOR', 'OPERATOR', 'ACCOUNTANT']}
                >
                  <InvoicesListPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/invoices/monitor"
              element={
                <RoleProtectedRoute
                  allowedRoles={['ADMIN', 'OPERADOR_FACTURACION', 'CONTADOR', 'AUDITOR', 'OPERATOR', 'ACCOUNTANT']}
                >
                  <InvoicesListPage />
                </RoleProtectedRoute>
              }
            />

            {/* [M2: Resiliencia] ADMIN, AUDITOR */}
            <Route
              path="/resilience"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}>
                  <ResilienceDashboardPage />
                </RoleProtectedRoute>
              }
            />

            {/* [M3: Suite Aduanera e Inventarios] ADMIN, OPERADOR_ADUANAS, CONTADOR, AUDITOR */}
            <Route
              path="/customs"
              element={
                <RoleProtectedRoute
                  allowedRoles={['ADMIN', 'OPERADOR_ADUANAS', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT']}
                >
                  <CustomsDashboardPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/customs/dashboard"
              element={
                <RoleProtectedRoute
                  allowedRoles={['ADMIN', 'OPERADOR_ADUANAS', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT']}
                >
                  <CustomsDashboardPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/customs/shipments"
              element={
                <RoleProtectedRoute
                  allowedRoles={['ADMIN', 'OPERADOR_ADUANAS', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT']}
                >
                  <ShipmentsListPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/customs/shipments/:id"
              element={
                <RoleProtectedRoute
                  allowedRoles={['ADMIN', 'OPERADOR_ADUANAS', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT']}
                >
                  <ShipmentDetailPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/customs/declarations/new"
              element={
                <RoleProtectedRoute
                  allowedRoles={['ADMIN', 'OPERADOR_ADUANAS', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT']}
                >
                  <DuaRegistrationWizardPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/customs/settlements"
              element={
                <RoleProtectedRoute
                  allowedRoles={['ADMIN', 'OPERADOR_ADUANAS', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT']}
                >
                  <CustomsLiquidationPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/customs/landed-cost"
              element={
                <RoleProtectedRoute
                  allowedRoles={['ADMIN', 'OPERADOR_ADUANAS', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT']}
                >
                  <LandedCostSheetPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/customs/shipments/:id/landed-cost"
              element={
                <RoleProtectedRoute
                  allowedRoles={['ADMIN', 'OPERADOR_ADUANAS', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT']}
                >
                  <LandedCostSheetPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/customs/inventory/kardex"
              element={
                <RoleProtectedRoute
                  allowedRoles={['ADMIN', 'OPERADOR_ADUANAS', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT']}
                >
                  <KardexPermanentPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/customs/reports/fiscal-sire"
              element={
                <RoleProtectedRoute
                  allowedRoles={['ADMIN', 'OPERADOR_ADUANAS', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT']}
                >
                  <SireExportAuditPage />
                </RoleProtectedRoute>
              }
            />
            {/* Ruta legacy de retrocompatibilidad */}
            <Route
              path="/customs/legacy"
              element={
                <RoleProtectedRoute
                  allowedRoles={['ADMIN', 'OPERADOR_ADUANAS', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT']}
                >
                  <DuaCalculatorPage />
                </RoleProtectedRoute>
              }
            />

            {/* [M4: SIRE] ADMIN, CONTADOR, AUDITOR */}
            <Route
              path="/sire"
              element={<Navigate to="/sire/conciliacion" replace />}
            />
            <Route
              path="/sire/importar"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT']}>
                  <SireImportPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/sire/conciliacion"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT']}>
                  <SireReconciliationPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/sire/cierre"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT']}>
                  <SireClosurePage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/sire/historial"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT']}>
                  <SireHistoryPage />
                </RoleProtectedRoute>
              }
            />

            {/* [M5: Contabilidad PCGE] ADMIN, CONTADOR, AUDITOR */}
            <Route
              path="/accounting"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT']}>
                  <AccountingEntriesPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/accounting/plan-cuentas"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT']}>
                  <AccountingPlanCuentasPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/accounting/ple"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN', 'CONTADOR', 'AUDITOR', 'ACCOUNTANT']}>
                  <AccountingPlePage />
                </RoleProtectedRoute>
              }
            />
          </Route>
        </Route>

        {/* Ruta comodín con redirección según rol */}
        <Route path="*" element={<RoleHomeRedirect />} />
      </Routes>
    </Suspense>
  );
};