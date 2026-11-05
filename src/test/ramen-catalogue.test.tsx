import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
let host: HTMLDivElement;
let mounted: Root;
const control = (label: string) =>
  [...host.querySelectorAll("label")]
    .find((el) => el.firstChild?.textContent === label)
    ?.querySelector("input,select") as HTMLInputElement | HTMLSelectElement;
const change = (element: HTMLInputElement | HTMLSelectElement, value: string) =>
  act(() => {
    Object.getOwnPropertyDescriptor(
      element instanceof HTMLInputElement
        ? HTMLInputElement.prototype
        : HTMLSelectElement.prototype,
      "value",
    )!.set!.call(element, value);
    element.dispatchEvent(
      new Event(element instanceof HTMLInputElement ? "input" : "change", { bubbles: true }),
    );
  });
const render = (node: React.ReactNode) => {
  host = document.createElement("div");
  document.body.append(host);
  mounted = createRoot(host);
  act(() => mounted.render(node));
};
const cleanup = () => {
  if (mounted) act(() => mounted.unmount());
  host?.remove();
};
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import { useState } from "react";
import ProductShowcase from "../kumo/ProductShowcase.jsx";
import ProductDetails from "../kumo/ProductDetails.jsx";
import ProductImage from "../kumo/ProductImage.jsx";
const media = JSON.parse(readFileSync(resolve("catalogue/ramen-images.json"), "utf8"));
const entries = JSON.parse(readFileSync(resolve("catalogue/ramen.json"), "utf8"));
afterEach(cleanup);
const detail = vi.fn();
function Harness() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("Curated picks");
  const [category, setCategory] = useState("All finds");
  const [liked, setLiked] = useState([]);
  const products = entries.map((ramen: Record<string, unknown>, id: number) => ({
    id: id + 1,
    name: ramen["name"],
    ramen,
    category: "Ramen",
    price: 0,
    image: ramen["image"],
    tag: "CATALOGUE",
  }));
  const filtered = products.filter((p: { name: string; ramen: { brand: string } }) =>
    (p.name + " " + p.ramen.brand).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <ProductShowcase
      products={products}
      filtered={filtered}
      category={category}
      setCategory={setCategory}
      search={search}
      setSearch={setSearch}
      sort={sort}
      setSort={setSort}
      view="all"
      liked={liked}
      setLiked={setLiked}
      onDetail={detail}
      onAdd={vi.fn()}
      money={(n: number) => `Rs. ${n}`}
      onReset={() => {
        setSearch("");
        setCategory("All finds");
      }}
    />
  );
}
describe("Ramen catalogue", () => {
  it("contains exactly the requested 50 unique identities and complete valid reference data", () => {
    expect(entries).toHaveLength(50);
    for (const key of ["slug", "catalogue_id", "name", "image"])
      expect(new Set(entries.map((p: Record<string, unknown>) => p[key])).size).toBe(50);
    for (const p of entries) {
      expect(p.name).toBeTruthy();
      expect(p.country).toBeTruthy();
      expect(p.brand).toBeTruthy();
      expect(p.flavor).toBeTruthy();
      expect(p.category).toBe("Ramen");
      expect(p.price_jpy).toBeGreaterThan(0);
      expect(p.spicy_level).toBeGreaterThanOrEqual(0);
      expect(p.spicy_level).toBeLessThanOrEqual(5);
      expect(p.price_status).toBe("Estimated Japan retail price");
      expect(p.availability).toBe("unconfirmed");
      expect(existsSync(resolve("public" + p.image))).toBe(true);
      const mapping = media.find(
        (m: { catalogue_id: string }) => m.catalogue_id === p.catalogue_id,
      );
      expect(mapping.image).toBe(p.image);
      expect(mapping.flavor).toBe(p.flavor);
      if (mapping.status === "placeholder")
        expect(
          readFileSync(resolve("public" + p.image), "utf8")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " "),
        ).toContain(p.name.replaceAll("&", "&amp;"));
      else {
        expect(["CC BY-SA 3.0", "CC BY-SA 4.0"]).toContain(mapping.license);
        expect(mapping.source_url).toMatch(
          /^https:\/\/(world.openfoodfacts.org\/product\/\d+|commons.wikimedia.org\/wiki\/File:)/,
        );
        expect(mapping.author).toBeTruthy();
        const bytes = readFileSync(resolve("public" + p.image));
        expect(bytes[0]).toBe(255);
        expect(bytes[1]).toBe(216);
        expect(bytes.length).toBeLessThan(100000);
      }
    }
    expect(entries.filter((p: { country: string }) => p.country === "South Korea")).toHaveLength(
      20,
    );
    expect(entries.filter((p: { country: string }) => p.country === "Japan")).toHaveLength(15);
  });
  it("seeds the same records without deleting products or changing selling prices", () => {
    const sql = readFileSync(resolve("drizzle/migrations/0001_ramen_catalogue.sql"), "utf8");
    const seed = sql.match(/\$catalogue\$([\s\S]*?)\$catalogue\$/)?.[1];
    expect(JSON.parse(seed!).map((p: { catalogue_id: string }) => p.catalogue_id)).toEqual(
      entries.map((p: { catalogue_id: string }) => p.catalogue_id),
    );
    expect(sql).not.toMatch(/DELETE FROM|TRUNCATE/i);
    expect(sql).toContain("SET ramen=updated");
    expect(sql).toContain("products_ramen_slug");
  });
  it("filters brand, heat zero and country, and resets empty results", () => {
    render(<Harness />);
    change(host.querySelector('[aria-label="Products per page"]') as HTMLSelectElement, "12");
    change(control("Search name or brand"), "Nongshim");
    expect(host.querySelector("article")).toHaveTextContent("Nongshim");
    change(control("Search name or brand"), "");
    change(control("Brand"), "Nongshim");
    expect(host.querySelectorAll("article")).toHaveLength(6);
    expect(host.querySelector("article")).toHaveTextContent("Nongshim");
    change(control("Heat (0-5)"), "0");
    expect(host.querySelectorAll("article")).toHaveLength(1);
    expect(host.querySelector("article")).toHaveTextContent("Chapagetti");
    change(control("Country"), "Japan");
    expect(host).toHaveTextContent("No products in this collection.");
    const reset = [...host.querySelectorAll("button")].find(
      (b) => b.textContent === "Show all products",
    )!;
    act(() => reset.click());
    expect(host.querySelectorAll("article")).toHaveLength(12);
  });
  it("sorts JPY, opens details, labels estimates, disables reference ordering, and handles image errors", () => {
    render(<Harness />);
    change(
      host.querySelector('[aria-label="Sort products"]') as HTMLSelectElement,
      "Japan price: high to low",
    );
    const card = host.querySelector("article")!;
    expect(card).toHaveTextContent("Ichiran Tonkotsu Ramen");
    expect(card).not.toHaveTextContent("Estimated Japan retail price");
    expect(card).toHaveTextContent("Price pending");
    expect(card.querySelector(".find-add")).toBeDisabled();
    act(() => (card.querySelector(".find-open") as HTMLButtonElement).click());
    expect(detail).toHaveBeenCalled();
    const image = card.querySelector("img")!;
    act(() => image.dispatchEvent(new Event("error")));
    expect(image).toHaveAttribute("src", "/products/ramen/ichiran-tonkotsu-ramen.svg");
  });
  it("makes all 50 entries reachable with pagination and both JPY sorting directions", () => {
    render(<Harness />);
    expect(host.querySelectorAll("article")).toHaveLength(50);
    const seen = new Set([...host.querySelectorAll(".find-name")].map((el) => el.textContent));
    expect(seen.size).toBe(50);
    change(
      host.querySelector('[aria-label="Sort products"]') as HTMLSelectElement,
      "Japan price: low to high",
    );
    const cheapest = Math.min(...entries.map((p: { price_jpy: number }) => p.price_jpy));
    const firstCardName = host.querySelector(".find-name")?.textContent;
    expect(entries.find((p: { name: string }) => p.name === firstCardName).price_jpy).toBe(cheapest);
    expect(host.querySelector(".ramen-meta")).toBeNull();
    change(control("Country"), "Indonesia");
    expect(host.querySelectorAll("article")).toHaveLength(4);
    host.querySelectorAll(".find-name").forEach((el) => expect(entries.find((p: { name: string }) => p.name === el.textContent).country).toBe("Indonesia"));
  });
  it("uses the exact mapped image even before legacy records receive ramen metadata", () => {
    render(
      <ProductImage
        product={{
          name: "Samyang Buldak Carbonara",
          category: "Ramen",
          image: "https://images.unsplash.com/generic-bowl",
        }}
      />,
    );
    expect(host.querySelector("img")).toHaveAttribute(
      "src",
      "/products/ramen/samyang-buldak-carbonara.jpg",
    );
    act(() => host.querySelector("img")!.dispatchEvent(new Event("error")));
    expect(host.querySelector("img")).toHaveAttribute(
      "src",
      "/products/ramen/samyang-buldak-carbonara.svg",
    );
  });
  it("shows the existing detail dialog with separate JPY and LKR prices, image credit and pack unit", () => {
    const p = entries[3];
    const onAdd = vi.fn(),
      onClose = vi.fn();
    render(
      <ProductDetails
        product={{ id: 4, name: p.name, category: "Ramen", price: 1750, ramen: p }}
        money={(n: number) => `Rs. ${n}`}
        onAdd={onAdd}
        onClose={onClose}
      />,
    );
    const dialog = host.querySelector('[role="dialog"]')!;
    expect(dialog).toHaveTextContent("Rs. 1750");
    expect(dialog).toHaveTextContent("Estimated Japan retail price");
    expect(dialog).toHaveTextContent("1 packet (130g)");
    expect(dialog).toHaveTextContent("CC BY-SA 3.0");
    expect(dialog.querySelector("img")).toHaveAttribute(
      "src",
      "/products/ramen/samyang-buldak-carbonara.jpg",
    );
    act(() => (dialog.querySelector(".detail-add") as HTMLButtonElement).click());
    expect(onAdd).toHaveBeenCalled();
    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(onClose).toHaveBeenCalled();
  });
  it("keeps upcoming collections empty and offers a return to ramen", () => {
    render(<Harness />);
    const category = [...host.querySelectorAll('[aria-label="Product categories"] button')].find((button) => button.textContent === "Beauty") as HTMLButtonElement;
    act(() => category.click());
    expect(host).toHaveTextContent("Coming soon");
    expect(host.querySelectorAll(".find-card")).toHaveLength(0);
    expect(host.querySelector(".ramen-filters")).toBeNull();
    const explore = [...host.querySelectorAll("button")].find((button) => button.textContent?.includes("Explore ramen instead"))!;
    act(() => explore.click());
    expect(host.querySelectorAll(".find-card")).toHaveLength(50);
  });
  it("shows only matching related finds and opens the selected recommendation", () => {
    const first = entries[0], next = entries[1];
    const product = { id: 1, name: first.name, category: "Ramen", price: 1000, ramen: first };
    const recommended = { id: 2, name: next.name, category: "Ramen", price: 1200, ramen: next };
    const onSelect = vi.fn();
    render(<ProductDetails product={product} products={[product, recommended, { id: 3, name: "Beauty item", category: "Beauty", price: 300 }]} money={(n: number) => `Rs. ${n}`} onClose={vi.fn()} onAdd={vi.fn()} onSelect={onSelect} />);
    expect(host.querySelectorAll(".detail-related-card")).toHaveLength(1);
    expect(host.querySelector(".detail-related")).not.toHaveTextContent("Beauty item");
    act(() => (host.querySelector(".detail-related-card") as HTMLButtonElement).click());
    expect(onSelect).toHaveBeenCalledWith(recommended);
  });

});
