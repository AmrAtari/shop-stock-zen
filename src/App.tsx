import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./integrations/supabase/client"; // your existing client
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Loading from "./components/ui/Loading";

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if a session exists
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <Loading />;

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
        {/* Add more protected routes here */}
      </Routes>
    </Router>
  );
};

export default App;
