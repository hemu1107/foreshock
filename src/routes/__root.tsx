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
import { Toaster } from '@/components/ui/sonner';

function NotFoundComponent() {
  return <main className="page"><WorkspaceState title="Page not found" description="This Smoke page does not exist or is no longer available."><Button asChild><Link to="/">Back to Trace</Link></Button></WorkspaceState></main>;
}
function ErrorComponent({error,reset}:ErrorComponentProps) {
  const router=useRouter();
  useEffect(()=>{reportLovableError(error,{boundary:'tanstack_root_error_component'});},[error]);
  return <main className="page"><WorkspaceState kind="error" title="Smoke could not load this page" description="Your saved evidence is unchanged. Try again or return to your traces."><Button onClick={()=>{void router.invalidate();reset();}}>Try again</Button><Button variant="outline" asChild><a href="/">Back to Trace</a></Button></WorkspaceState></main>;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    // Replace these placeholders with the app's name and description when first building the app.
    // Each content route, / included, must still set its own head(). Never add og:image or
    // twitter:image here: every page without its own would inherit the root's preview image.
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Smoke — Rumor intelligence" },
      { name: "description", content: "Find the smoke before the fire. Trace rumor origins and independent evidence." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Smoke — Rumor intelligence" },
      { property: "og:description", content: "Find the smoke before the fire. Evidence-first rumor intelligence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Newsreader:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap' },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
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
        <HeadContent />
      </head>
      <body>
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
