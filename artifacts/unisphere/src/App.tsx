import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import {
  ClerkProvider,
    AuthenticateWithRedirectCallback,
  Show,
  useClerk,
  useAuth,
  useUser,
} from "@clerk/react";

import { shadcn } from "@clerk/themes";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/Landing";
import Feed from "@/pages/Feed";
import Messages from "@/pages/Messages";
import Societies from "@/pages/Societies";
import Events from "@/pages/Events";
import Calendar from "@/pages/Calendar";
import CampusMap from "@/pages/CampusMap";
import Jobs from "@/pages/Jobs";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import Notifications from "@/pages/Notifications";
import Search from "@/pages/Search";


const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const queryClient = new QueryClient();

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(217, 91%, 60%)",
    colorForeground: "hsl(222, 47%, 11%)",
    colorMutedForeground: "hsl(215, 16%, 47%)",
    colorDanger: "hsl(0, 84%, 60%)",
    colorBackground: "hsl(0, 0%, 100%)",
    colorInput: "hsl(0, 0%, 100%)",
    colorInputForeground: "hsl(222, 47%, 11%)",
    colorNeutral: "hsl(214, 32%, 91%)",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-900 text-2xl font-semibold",
    headerSubtitle: "text-slate-600",
    socialButtonsBlockButton: "border border-slate-200 hover:bg-slate-50",
    socialButtonsBlockButtonText: "text-slate-900 font-medium",
    formFieldLabel: "text-slate-700 font-medium",
    formFieldInput: "border-slate-200 text-slate-900 bg-white",
    formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
    footerActionLink: "text-blue-600 hover:text-blue-700 font-medium",
    footerActionText: "text-slate-600",
    dividerLine: "bg-slate-200",
    dividerText: "text-slate-500",
    identityPreviewEditButton: "text-blue-600",
    formFieldSuccessText: "text-green-600",
    alertText: "text-slate-900",
    logoBox: "justify-center mb-2",
    logoImage: "h-10",
    footerAction: "",
    alert: "",
    otpCodeFieldInput: "border-slate-200 text-slate-900",
    formFieldRow: "",
    main: "",
  },
};

function isUolEmail(email?: string | null) {
  const normalized = (email ?? "").trim().toLowerCase();
  return normalized.endsWith("@uol.edu.pk") || normalized.endsWith(".uol.edu.pk");
}
function SignInPage() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/feed" /></Show>
      <Show when="signed-out"><Landing mode="sign-in" /></Show>
    </>
  );
}

function SignUpPage() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/feed" /></Show>
      <Show when="signed-out"><Landing mode="sign-up" /></Show>
    </>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/feed" /></Show>
      <Show when="signed-out"><Landing mode="sign-in" /></Show>
    </>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const email = user?.primaryEmailAddress?.emailAddress;

  if (isLoaded && user && !isUolEmail(email)) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-white px-6">
        <div className="w-full max-w-sm rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
            <i className="fas fa-triangle-exclamation"></i>
          </div>
          <h1 className="text-lg font-semibold text-slate-900">UOL email required</h1>
          <p className="mt-2 text-sm text-slate-600">
            Please use your official UOL email address ending with uol.edu.pk.
          </p>
          <button
            type="button"
            onClick={() => signOut({ redirectUrl: basePath || "/" })}
            className="mt-5 w-full h-11 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
          >
            Sign out and try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out"><Redirect to="/" /></Show>
    </>
  );
}

function SSOCallbackPage() {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />

        <h1 className="text-lg font-semibold text-slate-900">
          Completing Google sign-in
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Please wait while Unisphere verifies your account.
        </p>

        <AuthenticateWithRedirectCallback />

        <div id="clerk-captcha" />
      </div>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);
  return null;
}
function ClerkApiTokenConnector() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}    
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back to Unisphere",
            subtitle: "Sign in to your campus community",
          },
        },
        signUp: {
          start: {
            title: "Join Unisphere",
            subtitle: "Create your account to get started",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <ClerkApiTokenConnector />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/sso-callback" component={SSOCallbackPage} />
            <Route path="/sign-up/sso-callback" component={SSOCallbackPage} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/feed">{() => <Protected><Feed /></Protected>}</Route>
            <Route path="/messages">{() => <Protected><Messages /></Protected>}</Route>
            <Route path="/societies">{() => <Protected><Societies /></Protected>}</Route>
            <Route path="/events">{() => <Protected><Events /></Protected>}</Route>
            <Route path="/calendar">{() => <Protected><Calendar /></Protected>}</Route>
            <Route path="/campus-map">{() => <Protected><CampusMap /></Protected>}</Route>
            <Route path="/jobs">{() => <Protected><Jobs /></Protected>}</Route>
            <Route path="/profile">{() => <Protected><Profile /></Protected>}</Route>
            <Route path="/profile/:id">{() => <Protected><Profile /></Protected>}</Route>
            <Route path="/settings">{() => <Protected><Settings /></Protected>}</Route>
            <Route path="/notifications">{() => <Protected><Notifications /></Protected>}</Route>
            <Route path="/search">{() => <Protected><Search /></Protected>}</Route>
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;

