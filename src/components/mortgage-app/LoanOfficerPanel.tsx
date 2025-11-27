import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, Phone, MapPin } from 'lucide-react';

export const LoanOfficerPanel = () => {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarImage src="https://zpsvatonxakysnbqnfcc.supabase.co/storage/v1/object/public/pics/ym%20circle%20headshot.JPG" alt="Yousif Mohamed" />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg">YM</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Yousif Mohamed</h3>
            <p className="text-sm text-muted-foreground">Senior Loan Officer</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a href="mailto:yousif@mortgagebolt.com" className="text-foreground hover:text-primary transition-colors">
              yousif@mortgagebolt.com
            </a>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href="tel:+13523289828" className="text-foreground hover:text-primary transition-colors">
              (352) 328-9828
            </a>
          </div>
          
          <div className="text-sm text-muted-foreground">
            NMLS#: 1390971
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <h4 className="font-semibold text-foreground mb-2">Mortgage Bolt</h4>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p>848 Brickell Avenue</p>
              <p>Suite 840</p>
              <p>Miami, Florida 33131</p>
            </div>
          </div>
          
          <div className="mt-6 flex gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy & Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">ADA Disclaimer</a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
