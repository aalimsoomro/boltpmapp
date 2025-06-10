import React, { createContext, useContext, useEffect, useState } from 'react';
    import { User } from '@supabase/supabase-js';
    import { supabase } from '@/lib/supabaseClient';

    interface AuthContextType {
      user: User | null;
      loading: boolean;
    }

    const AuthContext = createContext<AuthContextType | undefined>(undefined);

    export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      const [user, setUser] = useState<User | null>(null);
      const [loading, setLoading] = useState(true);

      useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (_event, session) => { // Renamed 'event' to '_event' to indicate it's unused
            setUser(session?.user || null);
            setLoading(false);
          }
        );

        // Initial check
        supabase.auth.getUser().then(({ data: { user } }) => {
          setUser(user);
          setLoading(false);
        });

        return () => {
          authListener?.subscription.unsubscribe();
        };
      }, []);

      return (
        <AuthContext.Provider value={{ user, loading }}>
          {children}
        </AuthContext.Provider>
      );
    };

    export const useAuth = () => {
      const context = useContext(AuthContext);
      if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
      }
      return context;
    };
