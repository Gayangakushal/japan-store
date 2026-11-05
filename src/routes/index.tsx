import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { storeQuery } from "@/lib/store";
import KumoLoading from "@/components/KumoLoading";
import type { LocalStore } from "@/lib/local-catalogue";
import type { CategoryStatus } from "@/lib/storefront-config";

// The KUMO storefront reads localStorage/window on first render, so it runs client-only.
const KumoApp = lazy(async () => ({
  default: (await import("../kumo/App.jsx")).default as ComponentType<{
    previewStore: LocalStore;
    categoryStatus: CategoryStatus;
  }>,
}));

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
    <ClientOnly fallback={<KumoLoading />}>
      <Suspense fallback={<KumoLoading />}>
        <ConnectedShop />
      </Suspense>
    </ClientOnly>
  );
}

function ConnectedShop() {
  const { data, isPending, isError, refetch } = useQuery(storeQuery);
  if (isPending) return <KumoLoading />;
  if (!data)
    return (
      <main className="p-12 text-center">
        <h1 className="text-2xl">We could not load the shop</h1>
        <p>
          Please try again shortly. If you are setting up KUMO, run the Supabase setup SQL first.
        </p>
        <button className="mt-4 rounded border px-5 py-3" onClick={() => void refetch()}>
          Try again
        </button>
      </main>
    );
  return (
    <>
      <KumoApp previewStore={data} categoryStatus={data.categories} />
      {isError && <p role="status">Connection interrupted. Showing the last loaded catalogue.</p>}
    </>
  );
}
