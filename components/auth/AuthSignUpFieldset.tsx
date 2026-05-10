'use client';

import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';

import { BlurFade } from '@/components/auth/BlurFade';
import { GlassButton } from '@/components/auth/GlassAuthButton';
import { cn } from '@/lib/utils';

const GitHubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="h-6 w-6">
    <path
      fill="currentColor"
      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
    />
  </svg>
);

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="h-6 w-6">
    <g fillRule="evenodd" fill="none">
      <g fillRule="nonzero" transform="translate(3, 2)">
        <path
          fill="#4285F4"
          d="M57.8123233,30.1515267 C57.8123233,27.7263183 57.6155321,25.9565533 57.1896408,24.1212666 L29.4960833,24.1212666 L29.4960833,35.0674653 L45.7515771,35.0674653 C45.4239683,37.7877475 43.6542033,41.8844383 39.7213169,44.6372555 L39.6661883,45.0037254 L48.4223791,51.7870338 L49.0290201,51.8475849 C54.6004021,46.7020943 57.8123233,39.1313952 57.8123233,30.1515267"
        />
        <path
          fill="#34A853"
          d="M29.4960833,58.9921667 C37.4599129,58.9921667 44.1456164,56.3701671 49.0290201,51.8475849 L39.7213169,44.6372555 C37.2305867,46.3742596 33.887622,47.5868638 29.4960833,47.5868638 C21.6960582,47.5868638 15.0758763,42.4415991 12.7159637,35.3297782 L12.3700541,35.3591501 L3.26524241,42.4054492 L3.14617358,42.736447 C7.9965904,52.3717589 17.959737,58.9921667 29.4960833,58.9921667"
        />
        <path
          fill="#FBBC05"
          d="M12.7159637,35.3297782 C12.0932812,33.4944915 11.7329116,31.5279353 11.7329116,29.4960833 C11.7329116,27.4640054 12.0932812,25.4976752 12.6832029,23.6623884 L12.6667095,23.2715173 L3.44779955,16.1120237 L3.14617358,16.2554937 C1.14708246,20.2539019 0,24.7439491 0,29.4960833 C0,34.2482175 1.14708246,38.7380388 3.14617358,42.736447 L12.7159637,35.3297782"
        />
        <path
          fill="#EB4335"
          d="M29.4960833,11.4050769 C35.0347044,11.4050769 38.7707997,13.7975244 40.9011602,15.7968415 L49.2255853,7.66898166 C44.1130815,2.91684746 37.4599129,0 29.4960833,0 C17.959737,0 7.9965904,6.62018183 3.14617358,16.2554937 L12.6832029,23.6623884 C15.0758763,16.5505675 21.6960582,11.4050769 29.4960833,11.4050769"
        />
      </g>
    </g>
  </svg>
);

const stepEase = { duration: 0.3, ease: 'easeOut' as const };

export function AuthSignUpFieldset({
  disabled,
  ariaBusy,
  reduceMotion,
  authStep,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  isEmailValid,
  isPasswordValid,
  isConfirmPasswordValid,
  handleProgressStep,
  handleKeyDown,
  handleGoBack,
  handleFinalSubmit,
  passwordInputRef,
  confirmPasswordInputRef,
  oauthSoon,
  signUpFooter = 'sign-in-cta',
}: {
  disabled: boolean;
  ariaBusy: boolean;
  reduceMotion: boolean;
  authStep: 'email' | 'password' | 'confirmPassword';
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (v: boolean) => void;
  isEmailValid: boolean;
  isPasswordValid: boolean;
  isConfirmPasswordValid: boolean;
  handleProgressStep: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleGoBack: () => void;
  handleFinalSubmit: (e: React.FormEvent) => void;
  passwordInputRef: React.RefObject<HTMLInputElement | null>;
  confirmPasswordInputRef: React.RefObject<HTMLInputElement | null>;
  oauthSoon: () => void;
  /** `sign-in-cta`: link to /login. `back-to-welcome`: legacy footer link to /welcome. */
  signUpFooter?: 'sign-in-cta' | 'back-to-welcome';
}) {
  const t = reduceMotion ? { duration: 0 } : stepEase;
  const exitBlur = reduceMotion ? { opacity: 0 } : { opacity: 0, filter: 'blur(4px)' };

  return (
    <fieldset
      disabled={disabled}
      {...(ariaBusy ? { 'aria-busy': 'true' as const } : {})}
      className="relative z-10 mx-auto flex w-full max-w-[min(320px,100vw-2rem)] flex-col items-center gap-8 p-4"
    >
      <AnimatePresence mode="wait">
        {authStep === 'email' && (
          <motion.div
            key="email-content"
            initial={reduceMotion ? false : { y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={t}
            className="flex w-full flex-col items-center gap-4"
          >
            <BlurFade delay={0.25 * 1} className="w-full">
              <div className="text-center">
                <p className="text-foreground text-balance px-1 font-serif text-3xl font-light tracking-tight sm:text-5xl md:text-6xl">
                  Create your Durgas OS account
                </p>
              </div>
            </BlurFade>
            <BlurFade delay={0.25 * 2}>
              <p className="text-muted-foreground text-sm font-medium">Or continue with</p>
            </BlurFade>
            <BlurFade delay={0.25 * 3}>
              <div className="flex w-full max-w-[300px] flex-wrap items-center justify-center gap-3 sm:gap-4">
                <GlassButton
                  type="button"
                  aria-label="Continue with Google"
                  contentClassName="flex items-center justify-center gap-2"
                  size="sm"
                  onClick={oauthSoon}
                >
                  <GoogleIcon />
                  <span className="text-foreground font-semibold">Google</span>
                </GlassButton>
                <GlassButton
                  type="button"
                  aria-label="Continue with GitHub"
                  contentClassName="flex items-center justify-center gap-2"
                  size="sm"
                  onClick={oauthSoon}
                >
                  <GitHubIcon />
                  <span className="text-foreground font-semibold">GitHub</span>
                </GlassButton>
              </div>
            </BlurFade>
            <BlurFade delay={0.25 * 4} className="w-full max-w-[300px]">
              <div className="flex w-full items-center gap-2 py-2">
                <hr className="border-border w-full" />
                <span className="text-muted-foreground text-xs font-semibold">OR</span>
                <hr className="border-border w-full" />
              </div>
            </BlurFade>
          </motion.div>
        )}
        {authStep === 'password' && (
          <motion.div
            key="password-title"
            initial={reduceMotion ? false : { y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={t}
            className="flex w-full flex-col items-center gap-4 text-center"
          >
            <BlurFade delay={0} className="w-full">
              <div className="text-center">
                <p className="text-foreground text-balance px-1 font-serif text-3xl font-light tracking-tight sm:text-5xl">
                  Choose a password
                </p>
              </div>
            </BlurFade>
            <BlurFade delay={0.25 * 1}>
              <p className="text-muted-foreground text-sm font-medium">
                Use at least 6 characters. You will use this to unlock Durgas OS.
              </p>
            </BlurFade>
          </motion.div>
        )}
        {authStep === 'confirmPassword' && (
          <motion.div
            key="confirm-title"
            initial={reduceMotion ? false : { y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={t}
            className="flex w-full flex-col items-center gap-4 text-center"
          >
            <BlurFade delay={0} className="w-full">
              <div className="text-center">
                <p className="text-foreground text-balance px-1 font-serif text-3xl font-light tracking-tight sm:text-5xl">
                  Almost there
                </p>
              </div>
            </BlurFade>
            <BlurFade delay={0.25 * 1}>
              <p className="text-muted-foreground text-sm font-medium">
                Confirm your password to finish creating your account
              </p>
            </BlurFade>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleFinalSubmit} className="w-full max-w-[300px] space-y-6">
        <AnimatePresence>
          {authStep !== 'confirmPassword' && (
            <motion.div
              key="email-password-fields"
              exit={exitBlur}
              transition={t}
              className="w-full space-y-6"
            >
              <BlurFade
                delay={authStep === 'email' ? 0.25 * 5 : 0}
                inView={true}
                className="w-full"
              >
                <div className="relative w-full">
                  <AnimatePresence>
                    {authStep === 'password' && (
                      <motion.div
                        initial={reduceMotion ? false : { y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={reduceMotion ? { duration: 0 } : { duration: 0.3, delay: 0.4 }}
                        className="absolute -top-6 left-4 z-10"
                      >
                        <label className="text-muted-foreground text-xs font-semibold">Email</label>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="glass-input-wrap w-full">
                    <div className="glass-auth-input-shell">
                      <div
                        className={cn(
                          'relative z-10 flex flex-shrink-0 items-center justify-center overflow-hidden transition-all duration-300 ease-in-out',
                          email.length > 20 && authStep === 'email' ? 'w-0 px-0' : 'w-10 pl-2'
                        )}
                      >
                        <Mail className="text-foreground/80 h-5 w-5 flex-shrink-0" />
                      </div>
                      <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className={cn(
                          'text-foreground placeholder:text-foreground/60 relative z-10 h-full w-0 flex-grow bg-transparent transition-[padding-right] delay-300 duration-300 ease-in-out focus:outline-none',
                          isEmailValid && authStep === 'email' ? 'pr-2' : 'pr-0'
                        )}
                      />
                      <div
                        className={cn(
                          'relative z-10 flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out',
                          isEmailValid && authStep === 'email' ? 'w-10 pr-1' : 'w-0'
                        )}
                      >
                        <GlassButton
                          type="button"
                          onClick={handleProgressStep}
                          size="icon"
                          aria-label="Continue with email"
                          contentClassName="text-foreground/80 hover:text-foreground"
                        >
                          <ArrowRight className="h-5 w-5" />
                        </GlassButton>
                      </div>
                    </div>
                  </div>
                </div>
              </BlurFade>
              <AnimatePresence>
                {authStep === 'password' && (
                  <BlurFade key="password-field" className="w-full">
                    <div className="relative w-full">
                      <AnimatePresence>
                        {password.length > 0 && (
                          <motion.div
                            initial={reduceMotion ? false : { y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={reduceMotion ? { duration: 0 } : { duration: 0.3 }}
                            className="absolute -top-6 left-4 z-10"
                          >
                            <label className="text-muted-foreground text-xs font-semibold">
                              Password
                            </label>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div className="glass-input-wrap w-full">
                        <div className="glass-auth-input-shell">
                          <div className="relative z-10 flex w-10 flex-shrink-0 items-center justify-center pl-2">
                            {isPasswordValid ? (
                              <button
                                type="button"
                                aria-label="Toggle password visibility"
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-foreground/80 hover:text-foreground rounded-full p-2 transition-colors"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </button>
                            ) : (
                              <Lock className="text-foreground/80 h-5 w-5 flex-shrink-0" />
                            )}
                          </div>
                          <input
                            ref={passwordInputRef}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="text-foreground placeholder:text-foreground/60 relative z-10 h-full w-0 flex-grow bg-transparent focus:outline-none"
                          />
                          <div
                            className={cn(
                              'relative z-10 flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out',
                              isPasswordValid ? 'w-10 pr-1' : 'w-0'
                            )}
                          >
                            <GlassButton
                              type="button"
                              onClick={handleProgressStep}
                              size="icon"
                              aria-label="Submit password"
                              contentClassName="text-foreground/80 hover:text-foreground"
                            >
                              <ArrowRight className="h-5 w-5" />
                            </GlassButton>
                          </div>
                        </div>
                      </div>
                    </div>
                    <BlurFade inView delay={0.2}>
                      <button
                        type="button"
                        onClick={handleGoBack}
                        className="text-foreground/70 hover:text-foreground mt-4 flex items-center gap-2 text-sm transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" /> Go back
                      </button>
                    </BlurFade>
                  </BlurFade>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {authStep === 'confirmPassword' && (
            <BlurFade key="confirm-password-field" className="w-full">
              <div className="relative w-full">
                <AnimatePresence>
                  {confirmPassword.length > 0 && (
                    <motion.div
                      initial={reduceMotion ? false : { y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={reduceMotion ? { duration: 0 } : { duration: 0.3 }}
                      className="absolute -top-6 left-4 z-10"
                    >
                      <label className="text-muted-foreground text-xs font-semibold">
                        Confirm password
                      </label>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="glass-input-wrap w-full max-w-[300px]">
                  <div className="glass-auth-input-shell">
                    <div className="relative z-10 flex w-10 flex-shrink-0 items-center justify-center pl-2">
                      {isConfirmPasswordValid ? (
                        <button
                          type="button"
                          aria-label="Toggle confirm password visibility"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-foreground/80 hover:text-foreground rounded-full p-2 transition-colors"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      ) : (
                        <Lock className="text-foreground/80 h-5 w-5 flex-shrink-0" />
                      )}
                    </div>
                    <input
                      ref={confirmPasswordInputRef}
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="text-foreground placeholder:text-foreground/60 relative z-10 h-full w-0 flex-grow bg-transparent focus:outline-none"
                    />
                    <div
                      className={cn(
                        'relative z-10 flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out',
                        isConfirmPasswordValid ? 'w-10 pr-1' : 'w-0'
                      )}
                    >
                      <GlassButton
                        type="submit"
                        size="icon"
                        aria-label="Finish sign-up"
                        contentClassName="text-foreground/80 hover:text-foreground"
                      >
                        <ArrowRight className="h-5 w-5" />
                      </GlassButton>
                    </div>
                  </div>
                </div>
              </div>
              <BlurFade inView delay={0.2}>
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="text-foreground/70 hover:text-foreground mt-4 flex items-center gap-2 text-sm transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Go back
                </button>
              </BlurFade>
            </BlurFade>
          )}
        </AnimatePresence>
      </form>
      <p className="text-muted-foreground relative z-10 text-center text-xs">
        {signUpFooter === 'sign-in-cta' ? (
          <>
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <Link href="/welcome" className="text-primary underline-offset-4 hover:underline">
            Back to welcome
          </Link>
        )}
      </p>
    </fieldset>
  );
}
