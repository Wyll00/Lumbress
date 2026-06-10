import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import MiniPlayer from './components/MiniPlayer';
import './App.css';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const MyLibrary = lazy(() => import('./pages/MyLibrary'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Settings = lazy(() => import('./pages/Settings'));
const Community = lazy(() => import('./pages/Community'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));
const Podcasts = lazy(() => import('./pages/Podcasts'));
const VenderLibro = lazy(() => import('./pages/VenderLibro'));
const Chat = lazy(() => import('./pages/Chat'));
const TallerNovela = lazy(() => import('./pages/TallerNovela'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const PublicShelf = lazy(() => import('./pages/PublicShelf'));
const Reader = lazy(() => import('./pages/Reader'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <div className="loading-spinner" />
  </div>
);

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/u/:username" element={<PublicShelf />} />

        <Route path="/*" element={
          <ProtectedRoute>
            <div className="app-layout">
              <Sidebar />
              <main className="main-content">
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/library" element={<MyLibrary />} />
                    <Route path="/reader/:bookId" element={<Reader />} />
                    <Route path="/statistics" element={<Statistics />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/community" element={<Community />} />
                    <Route path="/podcasts" element={<Podcasts />} />
                    <Route path="/vender" element={<VenderLibro />} />
                    <Route path="/mensajes" element={<Chat />} />
                    <Route path="/taller" element={<TallerNovela />} />
                    <Route path="/subscriptions" element={<Subscriptions />} />
                  </Routes>
                </Suspense>
              </main>
              <MiniPlayer />
            </div>
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
