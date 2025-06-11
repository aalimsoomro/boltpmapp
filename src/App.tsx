import { Suspense } from 'react';
import { lazy } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
// Removed: import '@supabase/auth-js/styles.css'; // This import caused a build error
// Removed duplicate import: import './globals.css'; // Already imported in main.tsx

const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NewProject = lazy(() => import('./pages/NewProject'));
const ProjectList = lazy(() => import('./pages/ProjectList'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const EditProject = lazy(() => import('./pages/EditProject'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Files = lazy(() => import('./pages/Files'));
const Reports = lazy(() => import('./pages/Reports'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Redirect unauthenticated users to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} />;
  }

  // Basic check for user approval (assuming 'approved' is a column in the 'users' table)
  // You would need to fetch the user's 'approved' status from your 'users' table
  // For now, we'll assume authenticated means approved for routing purposes,
  // but actual feature access should check the 'role' and 'approved' status.
  // if (user && !user.user_metadata?.approved) {
  //   return <div>Your account is pending admin approval.</div>; // Or redirect to a pending page
  // }


  return children;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthenticatedLayout>
      {children}
    </AuthenticatedLayout>
  );
}

export default function App() {
  return (
    <Router>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />} >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects/new" element={<NewProject />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/projects/:id/edit" element={<EditProject />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/projects/:id/files" element={<Files />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin/settings" element={<Settings />} />
          </Route>

          {/* Redirect root to dashboard if authenticated, otherwise to login */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
