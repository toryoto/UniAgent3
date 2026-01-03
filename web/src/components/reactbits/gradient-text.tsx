'use client';

import { cn } from '@/lib/utils/cn';

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  gradient?: string;
}

export function GradientText({
  children,
  className = '',
  gradient = 'from-purple-400 via-pink-400 to-blue-400',
}: GradientTextProps) {
  return (
    <span
      className={cn(
        'bg-gradient-to-r bg-clip-text text-transparent',
        gradient,
        className
      )}
    >
      {children}
    </span>
  );
}

