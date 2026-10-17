import { useState } from 'react';
import { DuaDashboardView } from '../components/DuaDashboardView';
import { DuaRegistrationView } from '../components/DuaRegistrationView';

export default function DuaCalculatorPage() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'register'>('dashboard');

  return (
    <div className="w-full">
      {currentView === 'dashboard' ? (
        <DuaDashboardView onOpenRegistration={() => setCurrentView('register')} />
      ) : (
        <DuaRegistrationView
          onBack={() => setCurrentView('dashboard')}
          onSuccess={() => setCurrentView('dashboard')}
        />
      )}
    </div>
  );
}
