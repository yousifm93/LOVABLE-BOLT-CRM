import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBorrowerAuth, BorrowerAuthProvider } from '@/hooks/useBorrowerAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

function BorrowerAuthContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signUp, signIn, resendVerificationEmail, updateEmail, session, emailVerified, verificationChecked } = useBorrowerAuth();
  const { toast } = useToast();
  const [view, setView] = useState<'signup' | 'signin' | 'verify'>('signup');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

  // Check for error query params
  const errorParam = searchParams.get('error');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (errorParam === 'invalid_token') {
      setErrorMessage('This verification link is invalid or missing required information.');
    } else if (errorParam === 'already_verified') {
      setErrorMessage('This verification link has expired or has already been used.');
    } else if (errorParam === 'verification_failed') {
      setErrorMessage('An error occurred while verifying your email. Please try again or contact support.');
    }
  }, [errorParam]);

  // Check URL params for initial view
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'signin') {
      setView('signin');
    }
  }, [searchParams]);

  // Redirect authenticated users with verified emails to application
  useEffect(() => {
    if (!verificationChecked) return; // Wait for verification check
    
    if (user && emailVerified) {
      navigate('/apply', { replace: true });
    }
  }, [user, emailVerified, verificationChecked, navigate]);

  // Show verification view if user is signed in but not verified
  useEffect(() => {
    if (!verificationChecked) return; // Wait for verification check
    
    if (user && !emailVerified) {
      setView('verify');
      setPendingEmail(user.email || '');
    }
  }, [user, emailVerified, verificationChecked]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await signUp(email, password, firstName, lastName);
    
    if (!error) {
      setView('verify');
      setPendingEmail(email);
    }
    setIsLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await signIn(email, password);
    
    setIsLoading(false);
    // Redirect is handled by useEffect
  };

  const handleResendVerification = async () => {
    setIsLoading(true);
    await resendVerificationEmail(pendingEmail);
    setIsLoading(false);
  };

  const handleChangeEmail = async () => {
    const newEmail = prompt('Enter your new email address:');
    if (newEmail && newEmail !== pendingEmail) {
      setIsLoading(true);
      await updateEmail(newEmail);
      setPendingEmail(newEmail);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <Card className="border-2 shadow-2xl overflow-hidden">
          <div className="grid md:grid-cols-2">
            {/* Left side - Image */}
            <div className="hidden md:block bg-gradient-to-br from-primary to-primary/80 p-12 text-primary-foreground">
              <div className="h-full flex flex-col justify-between">
                <div>
                  <h2 className="text-4xl font-bold mb-4">Mortgage Bolt</h2>
                  <p className="text-lg opacity-90">Your trusted partner in home financing</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                      <span className="text-2xl">🏡</span>
                    </div>
                    <p className="text-sm">Fast pre-approval process</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                      <span className="text-2xl">💰</span>
                    </div>
                    <p className="text-sm">Competitive rates</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                      <span className="text-2xl">✅</span>
                    </div>
                    <p className="text-sm">Expert guidance every step</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Form */}
            <div className="p-8 md:p-12">
              {errorMessage && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              
              {view === 'signup' && (
                <>
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-3xl font-bold">Welcome to Mortgage Bolt</CardTitle>
                    <CardDescription className="text-lg mt-2">Apply Now</CardDescription>
                  </CardHeader>
                  <CardContent className="px-0">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="first-name">First Name</Label>
                          <Input
                            id="first-name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="last-name">Last Name</Label>
                          <Input
                            id="last-name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Choose Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                      </div>
                      <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                        {isLoading ? 'Creating Account...' : 'CREATE ACCOUNT'}
                      </Button>
                    </form>
                    
                    <div className="mt-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => setView('signin')}
                          className="text-primary font-semibold hover:underline"
                        >
                          Sign In
                        </button>
                      </p>
                    </div>
                  </CardContent>
                </>
              )}

              {view === 'signin' && (
                <>
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-3xl font-bold">Sign In</CardTitle>
                    <CardDescription className="text-lg mt-2">Continue your application</CardDescription>
                  </CardHeader>
                  <CardContent className="px-0">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email</Label>
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signin-password">Password</Label>
                        <Input
                          id="signin-password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                        {isLoading ? 'Signing In...' : 'SIGN IN'}
                      </Button>
                    </form>
                    
                    <div className="mt-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        Don't have an account?{' '}
                        <button
                          type="button"
                          onClick={() => setView('signup')}
                          className="text-primary font-semibold hover:underline"
                        >
                          Apply Now
                        </button>
                      </p>
                    </div>
                  </CardContent>
                </>
              )}

              {view === 'verify' && (
                <>
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-3xl font-bold">Verify Your Account</CardTitle>
                  </CardHeader>
                  <CardContent className="px-0">
                    <div className="space-y-6">
                      <div className="bg-muted/50 border border-border rounded-lg p-6 space-y-4">
                        <p className="text-sm">
                          A verification email with a secure link has been sent to your registered email address{' '}
                          <span className="font-semibold">{pendingEmail}</span>.{' '}
                          <button
                            type="button"
                            onClick={handleChangeEmail}
                            className="text-primary font-semibold hover:underline"
                          >
                            Change Email
                          </button>
                        </p>
                        
                        <div className="text-sm text-muted-foreground space-y-2">
                          <p>Please check your inbox and click the verification link to activate your account.</p>
                          <p className="text-xs">If you don't see the email, please check your Spam or Junk folder.</p>
                        </div>
                      </div>

                      <Button 
                        onClick={handleResendVerification} 
                        variant="outline" 
                        className="w-full"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Sending...' : 'RESEND VERIFICATION EMAIL'}
                      </Button>
                    </div>
                  </CardContent>
                </>
              )}

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground space-y-2">
                <p>NMLS #1390971 | Licensed in FL</p>
                <div className="flex justify-center gap-4">
                  <a href="#" className="hover:text-primary">Privacy Policy</a>
                  <a href="#" className="hover:text-primary">Terms</a>
                  <a href="#" className="hover:text-primary">ADA Disclaimer</a>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function BorrowerAuth() {
  return (
    <BorrowerAuthProvider>
      <BorrowerAuthContent />
    </BorrowerAuthProvider>
  );
}
