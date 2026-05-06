import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SiteProvider } from './context/SiteContext';
import { Navbar } from './components/Navbar';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Search = lazy(() => import('./pages/Search'));
const Play = lazy(() => import('./pages/Play'));
const Douban = lazy(() => import('./pages/Douban'));

function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="spinner" />
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  return <>{children}</>;
}

function AppLayout() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen w-full">
      {isAuthenticated && <Navbar />}
      <main>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<AuthGuard><Home /></AuthGuard>} />
            <Route path="/search" element={<AuthGuard><Search /></AuthGuard>} />
            <Route path="/play" element={<AuthGuard><Play /></AuthGuard>} />
            <Route path="/douban" element={<AuthGuard><Douban /></AuthGuard>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <SiteProvider>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </SiteProvider>
  );
}
