import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { GDPRProvider } from './contexts/GDPRContext.jsx';
import { SocketProvider } from './contexts/SocketContext';
import App from './App.jsx';
import Spinner from './components/ui/Spinner';
import MainLayout from './components/ui/MainLayout';
import SubNavForum from './components/SubNavForum';
import AdminLayout from './components/AdminLayout';

// Lazy load page components
const IndexPage = lazy(() => import('./pages/IndexPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const DailyPathDashboard = lazy(() => import('./pages/DailyPathDashboard'));
const QuizLobby = lazy(() => import('./pages/QuizLobby'));
import LobbyGroupPage from './pages/LobbyGroupPage';
const QuizPage = lazy(() => import('./pages/QuizPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const VerificationPage = lazy(() => import('./pages/VerificationPage'));
const AIChatPage = lazy(() => import('./pages/AIChatPage'));
const ForumPage = lazy(() => import('./pages/ForumPage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdministratorPage = lazy(() => import('./pages/admin/AdministratorPage'));
const QuizListPage = lazy(() => import('./pages/admin/QuizListPage'));
const EditThemePage = lazy(() => import('./pages/EditThemePage'));
const AddThemePage = lazy(() => import('./pages/AddThemePage'));
const EditQuestionPage = lazy(() => import('./pages/EditQuestionPage'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));
const MaterialPage = lazy(() => import('./pages/MaterialPage'));
const MateriListPage = lazy(() => import('./pages/admin/MateriListPage'));
const MateriSubjectPage = lazy(() => import('./pages/admin/MateriSubjectPage'));

// A wrapper component to provide auth and GDPR context to the app
const Root = () => (
  <AuthProvider>
    <GDPRProvider>
      <SocketProvider>
      <App />
      </SocketProvider>
    </GDPRProvider>
  </AuthProvider>
);

// Wrapper to protect routes that require authentication
const RequireAuth = ({ children }) => {
  const { currentUser, isEmailVerified, loading } = useAuth();
  if (loading) {
    return <Spinner />;
  }
  if (!currentUser) {
    return <Navigate to="/auth" />;
  }
  if (!isEmailVerified) {
    return <Navigate to="/verify-email" />;
  }
  return children;
};

// Wrapper to redirect authenticated users from public pages
const RedirectIfAuth = ({ children }) => {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return <Spinner />;
  }
  if (currentUser) {
    return <Navigate to="/dashboard" />;
  }
  return children;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      {
        index: true,
        element: (
          <RedirectIfAuth>
            <IndexPage />
          </RedirectIfAuth>
        ),
      },
      {
        path: 'auth',
        element: (
          <RedirectIfAuth>
            <AuthPage />
          </RedirectIfAuth>
        ),
      },
      {
        path: 'verify-email',
        element: <VerificationPage />,
      },
      {
        path: 'dashboard',
        element: (
          <RequireAuth>
            <MainLayout>
              <DailyPathDashboard />
            </MainLayout>
          </RequireAuth>
        ),
      },
      {
  path: 'contest/1v1',
  element: (
    <RequireAuth>
      <MainLayout>
        <QuizLobby />
      </MainLayout>
    </RequireAuth>
  ),
},
      {
  path: 'contest/group',
  element: (
    <RequireAuth>
      <MainLayout>
        <LobbyGroupPage />
      </MainLayout>
    </RequireAuth>
  ),
},
{
  path: 'contest/1v1/lobby/:lobbyId',
  element: (
    <RequireAuth>
      <MainLayout>
        <QuizLobby />
      </MainLayout>
    </RequireAuth>
  ),
},
{
  path: 'contest/group/lobby/:roomId',
  element: (
    <RequireAuth>
      <MainLayout>
        <LobbyGroupPage />
      </MainLayout>
    </RequireAuth>
  ),
},
      {
        path: 'quiz',
        element: (
          <RequireAuth>
            <MainLayout>
                <QuizPage />
            </MainLayout>
          </RequireAuth>
        ),
      },
      {
        path: 'profile',
        element: (
          <RequireAuth>
            <MainLayout>
              <ProfilePage />
            </MainLayout>
          </RequireAuth>
        ),
      },
      {
        path: 'leaderboard',
        element: (
          <RequireAuth>
            <MainLayout>
              <LeaderboardPage />
            </MainLayout>
          </RequireAuth>
        ),
      },
      {
        path: 'ai-chat',
        element: (
          <RequireAuth>
            <MainLayout>
              <AIChatPage />
            </MainLayout>
          </RequireAuth>
        ),
      },
      {
        path: 'forum',
        element: (
          <RequireAuth>
            <MainLayout>
              <ForumPage />
            </MainLayout>
          </RequireAuth>
        ),
      },
      {
        path: 'materi/:topicId',
        element: (
          <RequireAuth>
            <MainLayout>
              <MaterialPage />
            </MainLayout>
          </RequireAuth>
        ),
      },
      {
        path: 'admin',
        element: (
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: 'administrator', element: <AdministratorPage /> },
          { path: 'quiz', element: <QuizListPage /> },
          { path: 'quiz/add-theme', element: <AddThemePage /> },
          {
            path: 'quiz/edit-theme/:themeId',
            element: <EditThemePage />,
          },
          {
            path: 'quiz/edit-question/:themeId/:unitId/:questionId',
            element: <EditQuestionPage />,
          },
          { path: 'setting', element: <SettingsPage /> },
          { path: 'materi', element: <MateriListPage /> },
          { path: 'materi/:subjectId', element: <MateriSubjectPage /> },
        ],
      },
      { path: '*', element: <Navigate to="/" /> },
    ],
  },
]);
