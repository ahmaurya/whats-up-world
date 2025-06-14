
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Input validation utilities
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
};

const validatePassword = (password: string): boolean => {
  return password.length >= 6 && password.length <= 128;
};

const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Log security events
        if (event === 'SIGNED_IN') {
          console.log('User signed in successfully');
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Input validation and sanitization
      const sanitizedEmail = sanitizeInput(email).toLowerCase();
      const sanitizedPassword = sanitizeInput(password);
      
      if (!validateEmail(sanitizedEmail)) {
        return { error: { message: 'Please enter a valid email address' } };
      }
      
      if (!validatePassword(sanitizedPassword)) {
        return { error: { message: 'Password must be between 6 and 128 characters' } };
      }

      console.log('Attempting sign in for user:', sanitizedEmail);
      
      const { error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: sanitizedPassword,
      });
      
      if (error) {
        console.error('Sign in error:', error.message);
      }
      
      return { error };
    } catch (error) {
      console.error('Unexpected sign in error:', error);
      return { error: { message: 'An unexpected error occurred' } };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      // Input validation and sanitization
      const sanitizedEmail = sanitizeInput(email).toLowerCase();
      const sanitizedPassword = sanitizeInput(password);
      const sanitizedFullName = fullName ? sanitizeInput(fullName) : undefined;
      
      if (!validateEmail(sanitizedEmail)) {
        return { error: { message: 'Please enter a valid email address' } };
      }
      
      if (!validatePassword(sanitizedPassword)) {
        return { error: { message: 'Password must be between 6 and 128 characters' } };
      }
      
      if (sanitizedFullName && sanitizedFullName.length > 100) {
        return { error: { message: 'Full name must be less than 100 characters' } };
      }

      const redirectUrl = `${window.location.origin}/`;
      
      console.log('Attempting sign up for user:', sanitizedEmail);
      
      const { error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password: sanitizedPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: sanitizedFullName ? { full_name: sanitizedFullName } : undefined,
        }
      });
      
      if (error) {
        console.error('Sign up error:', error.message);
      }
      
      return { error };
    } catch (error) {
      console.error('Unexpected sign up error:', error);
      return { error: { message: 'An unexpected error occurred' } };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      console.log('Attempting Google sign in');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        }
      });
      
      if (error) {
        console.error('Google sign in error:', error.message);
      }
      
      return { error };
    } catch (error) {
      console.error('Unexpected Google sign in error:', error);
      return { error: { message: 'An unexpected error occurred' } };
    }
  };

  const signOut = async () => {
    try {
      console.log('User signing out');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error.message);
      }
      
      return { error };
    } catch (error) {
      console.error('Unexpected sign out error:', error);
      return { error: { message: 'An unexpected error occurred' } };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
