import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, Phone, MapPin } from 'lucide-react';

export const LoanOfficerPanel = () => {
  return (
    <Card className="bg-card border-border h-full">
      <CardContent className="p-6 flex flex-col min-h-full">
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

        <div className="space-y-3 mb-6">
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

        <div className="border-t border-border pt-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <Avatar className="h-16 w-16">
              <AvatarImage src="https://zpsvatonxakysnbqnfcc.supabase.co/storage/v1/object/public/pics/sal%20circle%20headshot.JPG" alt="Salma Mohamed" />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">SM</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Salma Mohamed</h3>
              <p className="text-sm text-muted-foreground">Loan Officer</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href="mailto:salma@mortgagebolt.com" className="text-foreground hover:text-primary transition-colors">
                salma@mortgagebolt.com
              </a>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href="tel:+13522132980" className="text-foreground hover:text-primary transition-colors">
                (352) 213-2980
              </a>
            </div>
            
            <div className="text-sm text-muted-foreground">
              NMLS#: 1390971
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <Avatar className="h-16 w-16">
              <AvatarImage src="https://zpsvatonxakysnbqnfcc.supabase.co/storage/v1/object/public/pics/HD%20headshot.JPG" alt="Herman Daza" />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">HD</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Herman Daza</h3>
              <p className="text-sm text-muted-foreground">Operations Manager</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href="mailto:herman@mortgagebolt.com" className="text-foreground hover:text-primary transition-colors">
                herman@mortgagebolt.com
              </a>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href="tel:+13056197959" className="text-foreground hover:text-primary transition-colors">
                (305) 619-7959
              </a>
            </div>
            
            <div className="text-sm text-muted-foreground">
              NMLS#: 1390971
            </div>
          </div>
        </div>

        <div className="mt-auto pt-12 border-t border-border">
          <div className="text-center mb-8">
            <h4 className="font-semibold text-foreground mb-3">Mortgage Bolt</h4>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <div>
                <p>848 Brickell Avenue, Suite 840</p>
                <p>Miami, Florida 33131</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center gap-4 text-xs text-muted-foreground pb-4">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy & Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">ADA Disclaimer</a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
