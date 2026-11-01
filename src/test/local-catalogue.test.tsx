import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildLocalCatalogue,
  canAddToBag,
  localStoreSnapshot,
  ramenCatalogue,
} from "../lib/local-catalogue";
import App from "../kumo/App.jsx";

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => vi.fn(),
}));
vi.mock("@/lib/sign-out", () => ({ signOut: vi.fn() }));

let host: HTMLDivElement | undefined;
let root: Root | undefined;
let client: QueryClient | undefined;
afterEach(() => {
  if (root) act(() => root?.unmount());
  host?.remove();
  client?.clear();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Local frontend catalogue", () => {
  it("composes all 50 identities without any backend, preserving the eight original LKR products", () => {
    const products = buildLocalCatalogue();
    expect(products).toHaveLength(57);
    const ramen = products.filter((p) => p.ramen);
    expect(ramen).toHaveLength(50);
    expect(new Set(ramen.map((p) => p.ramen?.catalogue_id)).size).toBe(50);
    for (const original of localStoreSnapshot.products) {
      const product = products.find((p) => p.id === original.id)!;
      expect(product.price).toBe(original.price);
      expect(product.old).toBe(original.old);
      expect(product.size).toBe(original.size);
      expect(product.name).toBe(original.name);
    }
    expect(products.filter((p) => p.catalogueOnly)).toHaveLength(49);
    expect(products.filter((p) => p.catalogueOnly).every((p) => !canAddToBag(p))).toBe(true);
    expect(canAddToBag({ ...products.find((p) => p.catalogueOnly)!, price: 900 })).toBe(false);
  });
  it("deduplicates matches by stable catalogue ID, slug or normalized name without replacing commercial values", () => {
    const first = ramenCatalogue[0]!;
    const candidates = [
      {
        id: 201,
        name: "Renamed product",
        category: "Ramen",
        price: 1234,
        image: "/custom.webp",
        ramen: { catalogue_id: first.catalogue_id },
      },
      {
        id: 202,
        name: "Another spelling",
        category: "Ramen",
        price: 2345,
        image: "/custom.webp",
        ramen: { slug: first.slug },
      },
      {
        id: 203,
        name: "  SAMYANG   BULDAK ORIGINAL ",
        category: "Ramen",
        price: 3456,
        image: "/custom.webp",
      },
    ];
    for (const row of candidates) {
      const result = buildLocalCatalogue([row]);
      expect(result).toHaveLength(50);
      const matched = result.find((p) => p.ramen?.catalogue_id === first.catalogue_id)!;
      expect(matched.id).toBe(row.id);
      expect(matched.price).toBe(row.price);
      expect(matched.catalogueOnly).toBe(false);
    }
    expect(buildLocalCatalogue(candidates)).toHaveLength(50);
    const reference = buildLocalCatalogue([])[0]!;
    expect(canAddToBag(buildLocalCatalogue([{ ...reference, price: 999 }])[0]!)).toBe(false);
    expect(
      canAddToBag({
        id: 123,
        name: "Existing free sample",
        category: "Chocolate",
        price: 0,
        image: "/products/chocolate.jpg",
      }),
    ).toBe(true);
    expect(buildLocalCatalogue([]).every((p) => p.catalogueOnly && !canAddToBag(p))).toBe(true);
  });
  it("renders all 50 catalogue cards with zero network calls and keeps local-only bag actions disabled", () => {
    const fetch = vi.fn(() => {
      throw new Error("No network permitted in local catalogue");
    });
    vi.stubGlobal("fetch", fetch);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    act(() =>
      root?.render(
        <QueryClientProvider client={client!}>
          <App />
        </QueryClientProvider>,
      ),
    );
    const cards = host.querySelectorAll('article[data-ramen="true"]');
    expect(cards).toHaveLength(50);
    expect(
      new Set([...cards].map((card) => card.querySelector(".find-name")?.textContent)).size,
    ).toBe(50);
    expect(
      [...cards].filter((card) => (card.querySelector(".find-add") as HTMLButtonElement).disabled),
    ).toHaveLength(49);
    expect(fetch).not.toHaveBeenCalled();
    expect(host).toHaveTextContent("Estimated Japan retail price");
  });
  it("preserves existing cart IDs, LKR subtotal and WhatsApp request when cached commercial data is available", () => {
    const fetch = vi.fn(() => {
      throw new Error("No backend call permitted");
    });
    vi.stubGlobal("fetch", fetch);
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    localStorage.setItem("kumo-cart", JSON.stringify([{ id: 1, qty: 2 }]));
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    client = new QueryClient();
    client.setQueryData(["store"], {
      ...localStoreSnapshot,
      settings: { name: "KUMO", phone: "94770000000" },
    });
    act(() =>
      root?.render(
        <QueryClientProvider client={client!}>
          <App />
        </QueryClientProvider>,
      ),
    );
    act(() =>
      (host!.querySelector('[aria-label="Open shopping bag"]') as HTMLButtonElement).click(),
    );
    expect(host.querySelector(".cart-bottom")).toHaveTextContent("Rs. 3,700");
    const order = host.querySelector(".cart-bottom .primary") as HTMLButtonElement;
    act(() => order.click());
    expect(decodeURIComponent(String(open.mock.calls[0]?.[0]))).toContain("Subtotal: Rs. 3,700");
    expect(fetch).not.toHaveBeenCalled();
  });
});
