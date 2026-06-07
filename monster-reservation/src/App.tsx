import { useEffect, useState } from 'react';
import ReservationPage from './pages/ReservationPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import PendingPage from './pages/PendingPage';
import { AuthProvider, useAuth } from './lib/AuthContext';
import './App.css';

type View = 'customer' | 'admin';

function readView(): View {
  const p = new URLSearchParams(window.location.search);
  return p.get('view') === 'admin' ? 'admin' : 'customer';
}

function AppShell({ mode }: { mode: View }) {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="boot-screen">
        <div className="boot-spinner" />
        <div className="boot-text">로딩 중...</div>
      </div>
    );
  }

  // 모드별 라우팅
  if (mode === 'admin') {
    if (!user) return <LoginPage mode="admin" />;
    if (user.role !== 'admin') return <LoginPage mode="admin" />;
    return <AdminPage />;
  }

  // customer mode
  if (!user) return <LoginPage mode="customer" />;
  if (user.role === 'admin') {
    // 관리자가 고객 페이지에 들어왔으면 그냥 보여줌 (테스트용)
    return <ReservationPage />;
  }
  if (user.status !== 'approved') return <PendingPage />;
  return <ReservationPage />;
}

function App() {
  const [view, setView] = useState<View>(readView);

  useEffect(() => {
    const onPop = () => setView(readView());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <AuthProvider mode={view}>
      <AppShell mode={view} />
    </AuthProvider>
  );
}

export default App;
