import { useState } from "react";
import { useLocation } from "wouter";
import { useSignIn, useSignUp } from "@clerk/react/legacy";

const HERO_IMG =
  "https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&auto=format&fit=crop&w=1500&q=80";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Mode = "sign-in" | "sign-up";

export default function Landing({ mode = "sign-in" }: { mode?: Mode }) {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col md:flex-row bg-white md:overflow-hidden">
      {/* Left hero */}
      <section
        className="relative md:flex-1 min-h-[34vh] md:h-[100dvh] flex flex-col justify-between gap-6 p-6 sm:p-8 md:p-10 lg:p-14 text-white overflow-hidden bg-indigo-900"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(67,56,202,0.55) 0%, rgba(49,46,129,0.45) 50%, rgba(30,27,75,0.65) 100%), url('${HERO_IMG}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex items-center gap-3">
          <i className="fa-solid fa-atom text-2xl md:text-3xl"></i>
          <span className="text-lg md:text-xl font-semibold tracking-tight">
            Unisphere
          </span>
        </div>

        <div className="max-w-md">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold leading-tight">
            Welcome to
            <br />
            Unisphere
          </h1>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base md:text-lg text-white/85">
            Connect with students, share your campus life, and discover
            opportunities.
          </p>
        </div>

        <blockquote className="hidden sm:block max-w-md border-l-2 border-white/40 pl-4 italic text-sm text-white/70">
          "Education is the most powerful weapon which you can use to change
          the world."
        </blockquote>
      </section>

      {/* Right auth form */}
      <section className="hide-scrollbar flex-1 md:h-[100dvh] flex items-center justify-center p-6 sm:p-8 md:p-10 overflow-y-auto bg-white">
        {mode === "sign-in" ? <SignInForm /> : <SignUpForm />}
      </section>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A9 9 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A9 9 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z" />
    </svg>
  );
}


function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-900 mb-1.5">
      {children}
    </label>
  );
}

const inputClass =
  "w-full h-11 px-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

function SocialButtons({ onClick, disabled }: { onClick: (s: "oauth_google") => void; disabled: boolean }) {
  return (
    <>
      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs font-semibold tracking-wider text-slate-500">OR CONTINUE WITH</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onClick("oauth_google")}
          disabled={disabled}
          className="w-full h-11 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-900 font-medium transition-colors flex items-center justify-center gap-3"
        >
          <GoogleIcon /> Google
        </button>
        </div>
    </>
  );
}

function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
      {message}
    </div>
  );
}

function pickErrorMessage(err: unknown, fallback: string): string {
  return (err as { errors?: { message?: string }[] })?.errors?.[0]?.message ?? fallback;
}

function SignInForm() {
  const [, setLocation] = useLocation();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn.create({ identifier, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setLocation("/feed");
      } else {
        setError("Additional verification required.");
      }
    } catch (err) {
      setError(pickErrorMessage(err, "Invalid username or password."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOAuth(strategy: "oauth_google" | "oauth_microsoft") {
    if (!isLoaded || !signIn) return;
    setError(null);
    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: `${basePath}/sign-in/sso-callback`,
        redirectUrlComplete: `${basePath}/feed`,
      });
    } catch (err) {
      setError(pickErrorMessage(err, "Sign-in provider unavailable."));
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900">Sign In</h2>
        <p className="mt-2 text-sm text-slate-600">Welcome back! Please enter your details.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <FieldLabel htmlFor="identifier">Email</FieldLabel>
          <input
            id="identifier"
            type="email"
            autoComplete="email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Enter your email"
            className={inputClass}
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputClass}
            required
          />
        </div>
        <ErrorBox message={error} />
        <div id="clerk-captcha" />
        <button
          type="submit"
          disabled={submitting || !isLoaded}
          className="w-full h-11 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white font-semibold transition-colors"
        >
          {submitting ? "Signing in..." : "Login"}
        </button>
      </form>

      <SocialButtons onClick={handleOAuth} disabled={!isLoaded} />

      <p className="mt-6 text-center text-sm text-slate-600">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={() => setLocation("/sign-up")}
          className="text-indigo-600 hover:text-indigo-700 font-semibold"
        >
          Create Account
        </button>
      </p>
    </div>
  );
}

function SignUpForm() {
  const [, setLocation] = useLocation();
  const { isLoaded, signUp, setActive } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
  e.preventDefault();
  if (!isLoaded || !signUp || !setActive) return;

  setError(null);
  setSubmitting(true);

  try {
    const result = await signUp.create({
      emailAddress: email,
      password,
    });

    if (result.status === "complete" && result.createdSessionId) {
      await setActive({ session: result.createdSessionId });
      window.location.href = "/";
      return;
    }

    setError("Account created, but sign-in could not be completed automatically. Please try logging in.");
  } catch (err) {
    setError(pickErrorMessage(err, "Could not create account."));
  } finally {
    setSubmitting(false);
  }
}

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setLocation("/feed");
      } else {
        setError("Verification incomplete.");
      }
    } catch (err) {
      setError(pickErrorMessage(err, "Invalid verification code."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOAuth(strategy: "oauth_google") {
    if (!isLoaded || !signUp) return;
    setError(null);
    try {
      await signUp.authenticateWithRedirect({
        strategy,
        redirectUrl: `${basePath}/sign-up/sso-callback`,
        redirectUrlComplete: `${basePath}/feed`,
      });
    } catch (err) {
      setError(pickErrorMessage(err, "Sign-up provider unavailable."));
    }
  }

  if (pendingVerification) {
    return (
      <div className="w-full max-w-sm">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900">Verify Email</h2>
          <p className="mt-2 text-sm text-slate-600">
            We sent a 6-digit code to <strong>{email}</strong>.
          </p>
        </div>
        <form onSubmit={handleVerify} className="mt-8 space-y-4">
          <div>
            <FieldLabel htmlFor="code">Verification code</FieldLabel>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className={inputClass}
              required
            />
          </div>
          <ErrorBox message={error} />
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold transition-colors"
          >
            {submitting ? "Verifying..." : "Verify Email"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900">Create Account</h2>
        <p className="mt-2 text-sm text-slate-600">Join Unisphere — your campus community.</p>
      </div>

      <form onSubmit={handleCreate} className="mt-8 space-y-4">
        <div>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
            className={inputClass}
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="newpassword">Password</FieldLabel>
          <input
            id="newpassword"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className={inputClass}
            required
            minLength={8}
          />
        </div>
        <ErrorBox message={error} />
        <div id="clerk-captcha" />
        <button
          type="submit"
          disabled={submitting || !isLoaded}
          className="w-full h-11 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white font-semibold transition-colors"
        >
          {submitting ? "Creating..." : "Create Account"}
        </button>
      </form>

      <SocialButtons onClick={handleOAuth} disabled={!isLoaded} />

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => setLocation("/sign-in")}
          className="text-indigo-600 hover:text-indigo-700 font-semibold"
        >
          Sign In
        </button>
      </p>
    </div>
  );
}
