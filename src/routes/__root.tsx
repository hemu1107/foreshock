import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SmokeProvider, Navigation } from '@/components/smoke/workspace';
import { Button } from '@/components/ui/button';
import { WorkspaceState } from '@/components/smoke/state';
import { SignalBackground } from '@/components/smoke/signal-background';
import { Toaster } from '@/components/ui/sonner';

function NotFoundComponent() {
  return <main className="page"><WorkspaceState title="Page not found" description="This Fourshock page does not exist or is no longer available."><Button asChild><Link to="/">Back to Trace</Link></Button></WorkspaceState></main>;
}
function ErrorComponent({error,reset}:ErrorComponentProps) {
  const router=useRouter();
  useEffect(()=>{reportLovableError(error,{boundary:'tanstack_root_error_component'});},[error]);
  return <main className="page"><WorkspaceState kind="error" title="Fourshock could not load this page" description="Your saved evidence is unchanged. Try again or return to your traces."><Button onClick={()=>{void router.invalidate();reset();}}>Try again</Button><Button variant="outline" asChild><a href="/">Back to Trace</a></Button></WorkspaceState></main>;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    // Replace these placeholders with the app's name and description when first building the app.
    // Each content route, / included, must still set its own head(). Never add og:image or
    // twitter:image here: every page without its own would inherit the root's preview image.
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Fourshock — Rumor intelligence" },
      { name: "description", content: "See the signals before the shock. Trace rumor origins and independent evidence." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Fourshock — Rumor intelligence" },
      { property: "og:description", content: "See the signals before the shock. Evidence-first rumor intelligence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap' },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/fourshock-mark.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('fourshock-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}",
          }}
        />
        <HeadContent />
      </head>
      <body>
        <SignalBackground/>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <SmokeProvider><a href="#main-content" className="skip-link">Skip to content</a><Navigation/><main id="main-content" tabIndex={-1}><Outlet/></main><Toaster/></SmokeProvider>
    </QueryClientProvider>
  );
}
