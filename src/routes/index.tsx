import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

// The KUMO storefront reads localStorage/window on first render, so it runs client-only.
const KumoApp = lazy(() => import("../kumo/App.jsx"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KUMO · Japan, a little closer." },
      {
        name: "description",
        content:
          "Discover Japanese ramen, chocolate and beauty essentials in Sri Lanka. Curated by KUMO, ordered on WhatsApp.",
      },
      { name: "theme-color", content: "#b92e29" },
      { property: "og:title", content: "KUMO · Japan, a little closer." },
      {
        property: "og:description",
        content:
          "Japanese ramen, chocolate and beauty essentials in Sri Lanka, ordered on WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientOnly
      fallback={
        <div role="status" aria-live="polite" className="p-8 text-center">
          Loading KUMO…
        </div>
      }
    >
      <Suspense
        fallback={
          <div role="status" aria-live="polite" className="p-8 text-center">
            Loading KUMO…
          </div>
        }
      >
        <KumoApp />
      </Suspense>
    </ClientOnly>
  );
}
