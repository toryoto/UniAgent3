'use client';

import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { LoginPanel } from '@/components/auth/login-panel';
import { TextType } from '@/components/reactbits/text-type';
import { GradientText } from '@/components/reactbits/gradient-text';
import { Particles } from '@/components/reactbits/particles';
import { Wallet } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { authenticated, ready, login } = usePrivy();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) return;
    router.replace('/chat');
  }, [ready, authenticated, router]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[#0F172A] md:flex-row md:h-screen">
      {/* Left Section - Welcome (Full screen on mobile) */}
      <div className="relative flex min-h-screen w-full flex-col justify-center px-6 py-8 md:min-h-0 md:w-3/5 md:px-16 md:py-12">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(139, 92, 246, 0.1) 10px, rgba(139, 92, 246, 0.1) 20px)`,
            }}
          />
        </div>

        {/* Particles Background */}
        <Particles
          className="absolute inset-0"
          count={isMobile ? 150 : 500}
          color="rgba(139, 92, 246, 0.2)"
        />

        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="mb-6 flex items-center gap-2 md:mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#1E40AF] md:h-10 md:w-10">
              <span className="text-lg font-bold text-white md:text-xl">UA</span>
            </div>
            <span className="text-xl font-bold text-[#F1F5F9] md:text-2xl">UniAgent</span>
          </div>

          {/* Main Heading with Type Animation */}
          <h1 className="mb-4 text-3xl font-bold leading-tight text-[#F1F5F9] md:mb-6 md:text-6xl">
            <TextType text="Welcome to UniAgent" speed={50} delay={300} />
          </h1>

          {/* Subtitle with Type Animation */}
          <p className="mb-6 text-base text-[#F1F5F9] md:mb-8 md:text-xl">
            <TextType
              text="Discover and interact with autonomous AI agents in a decentralized marketplace."
              speed={50}
              delay={2000}
            />
          </p>

          {/* Gradient Accent Text */}
          <div className="mt-8 md:mt-12">
            <GradientText
              gradient="from-[#8B5CF6] via-[#5B21B6] to-[#1E40AF]"
              className="text-xl font-semibold md:text-2xl"
            >
              AI Agent Marketplace
            </GradientText>
            <p className="mt-2 text-sm text-slate-400 md:mt-4 md:text-lg">
              Powered by A2A protocol, x402 micropayments, and blockchain technology
            </p>
          </div>

          {/* Mobile Login Section */}
          {!authenticated && (
            <div className="mt-12 space-y-6 md:hidden">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-[#F1F5F9]">Get Started</h2>
                <p className="text-base text-slate-400">
                  Connect your wallet to access the AI Agent Marketplace and discover autonomous
                  agents powered by blockchain technology.
                </p>
              </div>

              <button
                onClick={login}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#1E40AF] px-6 py-4 text-center text-base font-semibold text-white transition-all duration-300 hover:from-[#7C3AED] hover:to-[#1E3A8A] hover:shadow-lg hover:shadow-[#8B5CF6]/50 active:scale-[0.98]"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Connect with Wallet
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6] to-[#1E40AF] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Section - Login Panel (Desktop only) */}
      <div className="hidden w-full border-t border-[#1E293B] md:block md:w-2/5 md:border-l md:border-t-0">
        <LoginPanel />
      </div>
    </div>
  );
}
