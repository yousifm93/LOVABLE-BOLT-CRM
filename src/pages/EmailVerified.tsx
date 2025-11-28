import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EmailVerified() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      navigate('/apply', { replace: true });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center shadow-2xl">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-green-600 mb-4">
          Email Verified!
        </h1>
        
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Your email has been successfully verified. You can now access your mortgage application.
        </p>
        
        <p className="text-sm text-muted-foreground mb-6">
          Redirecting you to the application...
        </p>
        
        <Button 
          onClick={() => navigate('/apply', { replace: true })}
          className="w-full"
          size="lg"
        >
          Continue to Application
        </Button>
      </Card>
    </div>
  );
}
