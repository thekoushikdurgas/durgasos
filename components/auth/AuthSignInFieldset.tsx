'use client';

import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import Link from 'next/link';

import { BlurFade } from '@/components/auth/BlurFade';
import { GlassButton } from '@/components/auth/GlassAuthButton';

export function AuthSignInFieldset({
  disabled,
  ariaBusy,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  busy,
  isEmailValid,
  isPasswordValid,
  onSubmit,
}: {
  disabled: boolean;
  ariaBusy: boolean;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  busy: boolean;
  isEmailValid: boolean;
  isPasswordValid: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <fieldset
      disabled={disabled}
      {...(ariaBusy ? { 'aria-busy': 'true' as const } : {})}
      className="relative z-10 mx-auto flex w-full max-w-sm flex-col gap-6 p-6"
    >
      <BlurFade className="w-full">
        <div className="text-center">
          <p className="text-foreground font-serif text-4xl font-light tracking-tight sm:text-5xl">
            Welcome back
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            Sign in to Durgas OS with your email and password
          </p>
        </div>
      </BlurFade>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="glass-input-wrap w-full">
          <div className="glass-auth-input-shell w-full">
            <div className="relative z-10 flex w-10 flex-shrink-0 items-center justify-center pl-2">
              <Mail className="text-foreground/80 h-5 w-5 flex-shrink-0" />
            </div>
            <input
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-foreground placeholder:text-foreground/60 relative z-10 h-11 w-0 flex-grow bg-transparent focus:outline-none"
            />
          </div>
        </div>
        <div className="glass-input-wrap w-full">
          <div className="glass-auth-input-shell w-full">
            <div className="relative z-10 flex w-10 flex-shrink-0 items-center justify-center pl-2">
              <Lock className="text-foreground/80 h-5 w-5 flex-shrink-0" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-foreground placeholder:text-foreground/60 relative z-10 h-11 w-0 flex-grow bg-transparent focus:outline-none"
            />
            <button
              type="button"
              className="text-foreground/80 hover:text-foreground relative z-10 p-2"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <GlassButton
          type="submit"
          className="w-full justify-center"
          disabled={!isEmailValid || !isPasswordValid || busy}
        >
          Sign in
        </GlassButton>
        <p className="text-muted-foreground text-center text-xs">
          <Link href="/welcome" className="text-primary underline-offset-4 hover:underline">
            Back to welcome
          </Link>
        </p>
      </form>
    </fieldset>
  );
}
