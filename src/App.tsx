import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
    import { AuthProvider, useAuth } from '@/context/AuthContext';
    import AuthPage from '@/pages/Auth';
    import DashboardPage from '@/pages/Dashboard';
    import { Toaster } from '@/components/ui/toaster'; // Assuming you have a Toaster component

    function App() {
      return (
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              {/* Redirect root to dashboard if authenticated, otherwise to auth */}
              <Route path="/" element={<AuthRedirect />} />
              {/* Add other routes here later */}
            </Routes>
          </Router>
          <Toaster />
        </AuthProvider>
      );
    }

    // Protected route component
    function ProtectedRoute({ children }: { children: JSX.Element }) {
      const { user, loading } = useAuth();

      if (loading) {
        return <div>Loading...</div>; // Or a loading spinner
      }

      if (!user) {
        return <Navigate to="/auth" replace />;
      }

      return children;
    }

    // Redirect based on auth status
    function AuthRedirect() {
      const { user, loading } = useAuth();

      if (loading) {
        return <div>Loading...</div>; // Or a loading spinner
      }

      return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />;
    }


    export default App;
