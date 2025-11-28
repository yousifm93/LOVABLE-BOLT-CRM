import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BorrowerAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  emailVerified: boolean;
  verificationChecked: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<{ error: any }>;
  updateEmail: (newEmail: string) => Promise<{ error: any }>;
}

const BorrowerAuthContext = createContext<BorrowerAuthContextType | undefined>(undefined);

export function BorrowerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationChecked, setVerificationChecked] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Check email verification status from application_users
        if (session?.user) {
          setTimeout(() => {
            checkEmailVerification(session.user.id);
          }, 0);
        } else {
          setEmailVerified(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Check email verification status
      if (session?.user) {
        setTimeout(() => {
          checkEmailVerification(session.user.id);
        }, 0);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkEmailVerification = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('application_users')
        .select('email_verified')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setEmailVerified(data.email_verified);
      }
    } catch (error) {
      console.error('Error checking email verification:', error);
    } finally {
      setVerificationChecked(true);
    }
  };

  // Mark verification as checked if no user
  useEffect(() => {
    if (!loading && !user) {
      setVerificationChecked(true);
    }
  }, [loading, user]);

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/apply`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      // Insert into application_users with email_verified = false
      if (data.user) {
        const { error: insertError } = await supabase
          .from('application_users')
          .insert({
            id: data.user.id,
            email: email,
            first_name: firstName || null,
            last_name: lastName || null,
            email_verified: false,
          });

        if (insertError) {
          console.error('Error inserting application user:', insertError);
        }

        // Send verification email via edge function
        try {
          const { error: emailError } = await supabase.functions.invoke('send-verification-email', {
            body: { userId: data.user.id, email: email, firstName: firstName },
          });

          if (emailError) {
            console.error('Error sending verification email:', emailError);
          }
        } catch (emailError) {
          console.error('Error calling send-verification-email:', emailError);
        }
      }

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });

      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Welcome back!",
        description: "Your saved application has been loaded.",
      });

      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Sign out failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Signed out",
          description: "Your progress is saved and you can sign back in anytime.",
        });
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      // Get user by email from application_users
      const { data: appUser, error: fetchError } = await supabase
        .from('application_users')
        .select('id, first_name')
        .eq('email', email)
        .single();

      if (fetchError || !appUser) {
        toast({
          title: "Failed to resend email",
          description: "Could not find user with this email",
          variant: "destructive",
        });
        return { error: fetchError };
      }

      // Send verification email via edge function
      const { error } = await supabase.functions.invoke('send-verification-email', {
        body: { userId: appUser.id, email: email, firstName: appUser.first_name },
      });

      if (error) {
        toast({
          title: "Failed to resend email",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Verification email sent",
        description: "Please check your inbox for the verification link.",
      });

      return { error: null };
    } catch (error) {
      console.error('Resend verification error:', error);
      return { error };
    }
  };

  const updateEmail = async (newEmail: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) {
        toast({
          title: "Failed to update email",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Email updated",
        description: "A new verification email has been sent to your new address.",
      });

      return { error: null };
    } catch (error) {
      console.error('Update email error:', error);
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    emailVerified,
    verificationChecked,
    signUp,
    signIn,
    signOut,
    resendVerificationEmail,
    updateEmail,
  };

  return <BorrowerAuthContext.Provider value={value}>{children}</BorrowerAuthContext.Provider>;
}

export function useBorrowerAuth() {
  const context = useContext(BorrowerAuthContext);
  if (context === undefined) {
    throw new Error('useBorrowerAuth must be used within a BorrowerAuthProvider');
  }
  return context;
}
