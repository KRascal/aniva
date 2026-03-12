'use client';

import { HeroSection } from "@/components/landing/HeroSection";
import { GuestChatDemoSection, LiveDemoSection } from "@/components/landing/ChatDemoSection";
import { StatsSection, FeaturesSection } from "@/components/landing/FeatureSections";
import { GachaPreviewSection } from "@/components/landing/GachaPreviewSection";
import { FCSection, RelationshipSection, TestimonialsSection, FAQSection } from "@/components/landing/SocialProofSections";
import { FooterCTASection, Footer } from "@/components/landing/FooterSection";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <HeroSection />
      <GuestChatDemoSection />
      <StatsSection />
      <FeaturesSection />
      <LiveDemoSection />
      <GachaPreviewSection />
      <FCSection />
      <RelationshipSection />
      <TestimonialsSection />
      <FAQSection />
      <FooterCTASection />
      <Footer />
    </div>
  );
}
