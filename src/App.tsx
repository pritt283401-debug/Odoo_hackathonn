import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/auth/Login';
import { Signup } from './components/auth/Signup';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Settings } from './pages/Settings';
import { Receipts } from './pages/Receipts';
import { Deliveries } from './pages/Deliveries';
import { Transfers } from './pages/Transfers';
import { Adjustments } from './pages/Adjustments';
import { MoveHistory } from './pages/MoveHistory';
import { Profile } from './pages/Profile';

function AuthenticatedApp() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <Products />;
      case 'receipts':
        return <Receipts />;
      case 'deliveries':
        return <Deliveries />;
      case 'transfers':
        return <Transfers />;
      case 'adjustments':
        return <Adjustments />;
      case 'moves':
        return <MoveHistory />;
      case 'settings':
        return <Settings />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <MainLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </MainLayout>
  );
}

function AuthFlow() {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');

  if (authMode === 'signup') {
    return <Signup onToggleMode={() => setAuthMode('login')} />;
  }

  if (authMode === 'forgot') {
    return <ForgotPassword onBack={() => setAuthMode('login')} />;
  }

  return (
    <Login
      onToggleMode={() => setAuthMode('signup')}
      onForgotPassword={() => setAuthMode('forgot')}
    />
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return user ? <AuthenticatedApp /> : <AuthFlow />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
