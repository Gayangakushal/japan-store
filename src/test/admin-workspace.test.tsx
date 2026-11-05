import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LiveWorkspace } from "@/components/admin/AdminWorkspace";
import AdminWorkspace from "@/components/admin/AdminWorkspace";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
let host: HTMLDivElement, root: Root;
const click = (text: string) => {
  const button = [...host.querySelectorAll("button")].find((item) =>
    item.textContent?.includes(text),
  );
  if (!button) throw new Error(`Missing button: ${text}`);
  act(() => button.click());
};
const input = (element: HTMLInputElement | HTMLSelectElement, value: string) =>
  act(() => {
    Object.getOwnPropertyDescriptor(
      element.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype,
      "value",
    )!.set!.call(element, value);
    element.dispatchEvent(
      new Event(element.tagName === "SELECT" ? "change" : "input", { bubbles: true }),
    );
  });
const mount = () => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<AdminWorkspace />));
};
afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Admin frontend workspace", () => {
  it("opens a clearly labelled preview without credentials or backend calls", () => {
    const fetch = vi.fn(() => {
      throw new Error("Preview must stay offline");
    });
    vi.stubGlobal("fetch", fetch);
    mount();
    expect(host).toHaveTextContent("Preview access does not grant live administrator permissions.");
    click("Open preview workspace");
    expect(host).toHaveTextContent("Store overview");
    expect(host).toHaveTextContent("Database connection is pending.");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("searches, edits and removes draft products without changing the live catalogue", () => {
    mount();
    click("Open preview workspace");
    click("Products");
    const search = host.querySelector('[aria-label="Search admin products"]') as HTMLInputElement;
    input(search, "Nissin Chicken Ramen");
    expect(host.querySelectorAll("tbody tr")).toHaveLength(1);
    act(() =>
      (host.querySelector('[aria-label="Edit Nissin Chicken Ramen"]') as HTMLButtonElement).click(),
    );
    const dialog = host.querySelector('[role="dialog"]')!;
    const price = [...dialog.querySelectorAll("label")]
      .find((item) => item.firstChild?.textContent === "Selling price (LKR)")!
      .querySelector("input")!;
    input(price, "1450");
    act(() =>
      dialog
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
    );
    expect(host.querySelector("tbody")).toHaveTextContent("Rs. 1,450");
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    act(() =>
      (
        host.querySelector('[aria-label="Remove Nissin Chicken Ramen"]') as HTMLButtonElement
      ).click(),
    );
    expect(host).toHaveTextContent("No products found");
  });
  it("lets the owner stage collection launches and store settings", () => {
    mount();
    click("Open preview workspace");
    click("Categories");
    const beauty = [...host.querySelectorAll(".admin-category-panel")].find(
      (panel) => panel.querySelector("h2")?.textContent === "Beauty",
    )!;
    input(beauty.querySelector("select")!, "active");
    expect(beauty).toHaveTextContent("Visible in shop");
    click("Settings");
    input(host.querySelector('[name="name"]') as HTMLInputElement, "KUMO Studio");
    act(() =>
      host
        .querySelector(".admin-settings")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
    );
    expect(host).toHaveTextContent("Store settings updated in draft.");
    click("Products");
    click("Settings");
    expect(host.querySelector('[name="name"]')).toHaveValue("KUMO Studio");
  });
});

describe("Live admin workspace", () => {
  function liveWorkspace() {
    const live: LiveWorkspace = {
      data: { products: [{ id: 7, name: "Live Ramen", category: "Ramen", price: 1000, image: "/products/image-unavailable.svg", ramen: { brand: "Nissin", availability: "in_stock" } }], settings: { name: "KUMO", phone: "" }, categories: { Ramen: "active", Beauty: "coming_soon", Chocolate: "coming_soon" } },
      saveProduct: vi.fn(async () => {}), deleteProduct: vi.fn(async () => {}), saveCategories: vi.fn(async () => {}), saveSettings: vi.fn(async () => {}), uploadImage: vi.fn(async () => "https://example.com/image.jpg"), signOut: vi.fn(async () => {}),
    };
    host = document.createElement("div"); document.body.append(host); root = createRoot(host);
    act(() => root.render(<AdminWorkspace live={live} />));
    return live;
  }
  it("saves live edits through the persistence adapter instead of silently changing a local draft", async () => {
    const live = liveWorkspace();
    expect(host).toHaveTextContent("Connected to Supabase.");
    expect(host).not.toHaveTextContent("Database connection is pending.");
    click("Products");
    act(() => (host.querySelector('[aria-label="Edit Live Ramen"]') as HTMLButtonElement).click());
    const dialog = host.querySelector('[role="dialog"]')!;
    const price = [...dialog.querySelectorAll("label")].find((label) => label.firstChild?.textContent === "Selling price (LKR)")!.querySelector("input")!;
    input(price, "1450");
    await act(async () => { dialog.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect(live.saveProduct).toHaveBeenCalledWith(expect.objectContaining({ id: 7, price: 1450 }));
    expect(host).toHaveTextContent("Product saved to the store.");
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });
  it("keeps the editor open and reports failed live writes", async () => {
    const live = liveWorkspace();
    vi.mocked(live.saveProduct).mockRejectedValue(new Error("Permission denied"));
    click("Products");
    act(() => (host.querySelector('[aria-label="Edit Live Ramen"]') as HTMLButtonElement).click());
    await act(async () => { host.querySelector('[role="dialog"] form')!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect(host).toHaveTextContent("Permission denied");
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    expect(host).not.toHaveTextContent("Product saved to the store.");
  });
});
