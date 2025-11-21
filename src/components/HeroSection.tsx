import React from 'react';
import { Zap, Package, DollarSign } from 'lucide-react';

interface HeroSectionProps {
  onLogoClick?: () => void;
}

export function HeroSection({ onLogoClick }: HeroSectionProps) {
  return (
    <div className="relative min-h-[60vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Instant Pre-Approval Letters</span>
        </div>

        {/* Main heading */}
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent leading-tight">
          Get Your
          <br />
          <span className="text-foreground">Pre-Approval Letter</span>
          <br />
          In Seconds
        </h1>

        {/* Description */}
        <p className="text-xl md:text-2xl text-muted-foreground mb-12">
          That's the Bolt experience!
        </p>

        {/* Features - Hide in iframe or stack vertically on mobile */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          <div className="flex items-center gap-3 px-6 py-3 rounded-lg bg-card border border-border">
            <Package className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Products</span>
          </div>
          <div className="flex items-center gap-3 px-6 py-3 rounded-lg bg-card border border-border">
            <Zap className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Process</span>
          </div>
          <div className="flex items-center gap-3 px-6 py-3 rounded-lg bg-card border border-border">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Pricing</span>
          </div>
        </div>
      </div>
    </div>
  );
}
