import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  LayoutDashboard,
  LogOut,
  Package,
  Pencil,
  Plus,
  Search,
  Settings,
  Shapes,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  buildLocalCatalogue,
  localStoreSnapshot,
  type StoreProduct,
  type LocalStore,
} from "@/lib/local-catalogue";
import { defaultCategoryStatus, type CategoryStatus } from "@/lib/storefront-config";
import ProductImage from "@/kumo/ProductImage.jsx";
import KumoLoading from "@/components/KumoLoading";
import "./admin.css";
import "./admin-workspace.css";

const Storefront = lazy(async () => ({
  default: (await import("@/kumo/App.jsx")).default as ComponentType<{
    previewStore: LocalStore;
    categoryStatus: CategoryStatus;
  }>,
}));
const money = (value: number) => "Rs. " + value.toLocaleString("en-LK");
const tabs = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Products", icon: Package },
  { name: "Categories", icon: Shapes },
  { name: "Settings", icon: Settings },
];
const blank = (): StoreProduct => ({
  id: `draft:${Date.now()}`,
  name: "",
  category: "Ramen",
  price: 0,
  old: null,
  image: "/products/image-unavailable.svg",
  subtitle: "",
  size: "",
  tag: "NEW",
  ramen: {
    brand: "",
    country: "Japan",
    flavor: "",
    spicy_level: 0,
    unit: "",
    availability: "unconfirmed",
  },
});

export type LiveWorkspace = {
  data: LocalStore & { categories: CategoryStatus };
  saveProduct: (product: StoreProduct) => Promise<void>;
  deleteProduct: (product: StoreProduct) => Promise<void>;
  saveCategories: (categories: CategoryStatus) => Promise<void>;
  saveSettings: (settings: LocalStore["settings"]) => Promise<void>;
  uploadImage: (file: File) => Promise<string>;
  signOut: () => Promise<void>;
};
export default function AdminWorkspace({ live }: { live?: LiveWorkspace } = {}) {
  const [entered, setEntered] = useState(false);
  const [draftProducts, setProducts] = useState<StoreProduct[]>(() =>
    live ? [] : buildLocalCatalogue(),
  );
  const [draftSettings, setSettings] = useState({ ...localStoreSnapshot.settings });
  const [draftCategories, setCategories] = useState<CategoryStatus>({ ...defaultCategoryStatus });
  const products = live?.data.products ?? draftProducts;
  const settings = live?.data.settings ?? draftSettings;
  const categories = live?.data.categories ?? draftCategories;
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  async function persist(action: () => Promise<void>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(success);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  const [tab, setTab] = useState("Overview"),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("All"),
    [page, setPage] = useState(0);
  const [edit, setEdit] = useState<StoreProduct | null>(null),
    [message, setMessage] = useState(""),
    [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editorError, setEditorError] = useState("");
  useEffect(() => {
    if (!dirty || live) return;
    const protectDraft = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protectDraft);
    return () => window.removeEventListener("beforeunload", protectDraft);
  }, [dirty, live]);
  const priced = products.filter((p) => p.price > 0).length;
  const confirmed = products.filter((p) => p.ramen?.availability === "in_stock").length;
  const activeCollections = Object.values(categories).filter(
    (status) => status === "active",
  ).length;
  const visible = products.filter(
    (p) =>
      (statusFilter === "all" ||
        (statusFilter === "pending" && p.price <= 0) ||
        (statusFilter === "priced" && p.price > 0) ||
        (statusFilter === "in_stock" && p.ramen?.availability === "in_stock") ||
        (statusFilter === "unconfirmed" &&
          (!p.ramen?.availability || p.ramen.availability === "unconfirmed")) ||
        (statusFilter === "out_of_stock" && p.ramen?.availability === "out_of_stock")) &&
      (filter === "All" || p.category === filter) &&
      `${p.name} ${p.ramen?.["brand"] || ""}`.toLowerCase().includes(search.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(visible.length / 10)),
    current = Math.min(page, pages - 1);
  function saveDraft() {
    const blob = new Blob(
      [JSON.stringify({ version: 1, products, settings, categories }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "kumo-store-draft.json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(
      live ? "Catalogue exported." : "Draft exported. Keep this file for the database setup.",
    );
  }
  async function remove(product: StoreProduct) {
    if (busy) return;
    if (!window.confirm(`Remove ${product.name}${live ? " from the store" : " from this draft"}?`))
      return;
    if (live) {
      await persist(() => live.deleteProduct(product), "Product removed from the store.");
      return;
    }
    setProducts((items) => items.filter((p) => p.id !== product.id));
    setDirty(true);
    setMessage("Product removed from the draft.");
  }
  if (!entered && !live)
    return (
      <main className="admin-ui admin-login">
        <section className="admin-login-story">
          <Link to="/" className="admin-brand">
            雲 <b>kumo</b>
            <small>STORE MANAGEMENT</small>
          </Link>
          <div>
            <span className="admin-kicker">A LITTLE CARE BEHIND EVERY FIND.</span>
            <h1>
              Your store.
              <br />
              Beautifully organised.
            </h1>
            <p>One thoughtful workspace for your products, collections and everyday details.</p>
            <div className="admin-story-tags">
              <span>Catalogue</span>
              <span>Collections</span>
              <span>Store settings</span>
            </div>
          </div>
          <small>JAPAN, A LITTLE CLOSER.</small>
        </section>
        <section className="admin-login-form">
          <Link to="/" className="admin-back">
            <ArrowLeft size={15} /> Back to storefront
          </Link>
          <div className="admin-login-box">
            <span className="admin-status">DESIGN PREVIEW</span>
            <h2>Explore your workspace</h2>
            <p>Try the complete management experience before connecting your database.</p>
            <div className="admin-preview-note">
              <Package size={22} />
              <div>
                <strong>Your catalogue is ready to explore</strong>
                <p>
                  Edit products, manage categories and preview the storefront. Changes stay in this
                  session; export a draft to keep them.
                </p>
              </div>
            </div>
            <button className="admin-button primary" onClick={() => setEntered(true)}>
              Open preview workspace <ArrowRight size={17} />
            </button>
            <Link to="/auth" className="admin-text-link">
              Have an admin account? Sign in securely <ArrowRight size={14} />
            </Link>
          </div>
          <p className="admin-login-footer">
            Preview access does not grant live administrator permissions.
          </p>
        </section>
      </main>
    );
  if (preview)
    return (
      <div className="admin-store-preview">
        <div className="admin-preview-bar">
          <button onClick={() => setPreview(false)}>
            <ArrowLeft size={16} /> Back to workspace
          </button>
          <span>
            {live
              ? "Storefront preview / Live catalogue"
              : "Storefront preview / Unpublished draft"}
          </span>
        </div>
        <Suspense fallback={<KumoLoading label="Preparing your storefront preview..." />}>
          <Storefront previewStore={{ products, settings }} categoryStatus={categories} />
        </Suspense>
      </div>
    );
  return (
    <div className="admin-ui admin-shell">
      <aside className="admin-sidebar">
        <Link to="/" className="admin-brand">
          雲 <b>kumo</b>
          <small>STORE MANAGEMENT</small>
        </Link>
        <span className="admin-nav-label">WORKSPACE</span>
        <nav aria-label="Admin navigation">
          {tabs.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={tab === name ? "active" : ""}
              onClick={() => {
                setTab(name);
                setMessage("");
              }}
            >
              <Icon size={18} />
              {name}
              {name === "Products" && <span>{products.length}</span>}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <div>
            <span className="admin-dot" /> {live ? "Live store" : "Preview mode"}
            <p>{live ? "Connected to Supabase." : "Database connection is pending."}</p>
          </div>
          <Link to="/">
            View live storefront <ArrowRight size={15} />
          </Link>
          <button
            onClick={() => (live ? void persist(live.signOut, "Signed out") : setEntered(false))}
          >
            <LogOut size={16} /> {live ? "Sign out" : "Exit workspace"}
          </button>
        </div>
      </aside>
      <main className="admin-content">
        <div className="admin-topbar">
          <span>
            KUMO workspace <b>/ {tab}</b>
          </span>
          <form
            className="admin-global-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setTab("Products");
              setPage(0);
            }}
          >
            <Search size={16} aria-hidden="true" />
            <input
              aria-label="Search workspace catalogue"
              placeholder="Search your catalogue..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setTab("Products");
                setPage(0);
              }}
            />
            <span>Search</span>
          </form>
          <div>
            <span className="admin-status">{live ? "LIVE" : "PREVIEW"}</span>
            <span className="admin-avatar">K</span>
            <button className="admin-session-button" aria-label={live ? "Sign out" : "Exit workspace"} title={live ? "Sign out" : "Exit workspace"} onClick={() => live ? void persist(live.signOut, "Signed out") : setEntered(false)}><LogOut size={15} /></button>
          </div>
        </div>
        <div className="admin-content-inner">
          <div className="admin-page-heading">
            <div>
              <span className="admin-kicker">YOUR STORE, AT A GLANCE</span>
              <h1>{tab === "Overview" ? "Store overview" : tab}</h1>
              <p>
                {tab === "Overview"
                  ? "Manage your catalogue, availability and collections."
                  : tab === "Products"
                    ? "Carefully curate every find in your collection."
                    : tab === "Categories"
                      ? "Give every collection its moment to shine."
                      : "The details that make your store yours."}
              </p>
            </div>
            <div className="admin-heading-actions">
              <button className="admin-button" onClick={() => setPreview(true)}>
                <Eye size={16} /> Preview shop
              </button>
              <button className="admin-button primary" onClick={saveDraft}>
                <Download size={16} /> {live ? "Export catalogue" : "Export draft"}
              </button>
            </div>
          </div>
          <div className="admin-info-banner">
            <span className="admin-dot" />
            <span>
              {live
                ? "Connected to your shared database. Saved changes appear in the storefront; other visitors refresh automatically within 30 seconds."
                : `${dirty ? "You have unpublished changes." : "You are exploring a frontend preview."} Changes are session-only. Export your draft before leaving.`}
              {busy && " Saving..."}
            </span>
          </div>
          {message && (
            <div className="admin-notice" role="status">
              <Check size={17} /> {message}
              <button aria-label="Dismiss message" onClick={() => setMessage("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {tab === "Overview" && (
            <>
              <section className="admin-overview-banner">
                <div>
                  <span className="admin-kicker">KUMO / CATALOGUE CONTROL</span>
                  <h2>
                    Every little detail.
                    <br />
                    All in one place.
                  </h2>
                  <p>Keep your Japanese finds organised and ready to discover.</p>
                  <button
                    onClick={() => {
                      setEditorError("");
                      setEdit(blank());
                    }}
                  >
                    <Plus size={16} /> Add a new product <ArrowRight size={16} />
                  </button>
                </div>
                <div className="admin-banner-summary">
                  <span>YOUR COLLECTION</span>
                  <strong>
                    {products.length}
                    <small>products</small>
                  </strong>
                  <div>
                    <span>
                      <i />
                      {activeCollections} active collections
                    </span>
                    <span>{priced} with selling prices</span>
                  </div>
                </div>
              </section>
              <div className="admin-metrics">
                {[
                  {
                    title: "Total products",
                    value: products.length,
                    note: "Across your catalogue",
                    icon: Package,
                  },
                  {
                    title: "With selling prices",
                    value: priced,
                    note: "LKR prices configured",
                    icon: Check,
                  },
                  {
                    title: "Prices to review",
                    value: products.length - priced,
                    note: "Awaiting your selling price",
                    icon: Pencil,
                  },
                  {
                    title: "Coming soon",
                    value: Object.values(categories).filter((s) => s === "coming_soon").length,
                    note: "Collections in the making",
                    icon: Shapes,
                  },
                ].map(({ title, value, note, icon: Icon }) => (
                  <button
                    key={title}
                    className="admin-metric"
                    onClick={() => {
                      setTab(title === "Coming soon" ? "Categories" : "Products");
                      setStatusFilter(
                        title === "With selling prices"
                          ? "priced"
                          : title === "Prices to review"
                            ? "pending"
                            : "all",
                      );
                      setFilter("All");
                      setSearch("");
                      setPage(0);
                    }}
                  >
                    <div>
                      <span>{title}</span>
                      <Icon size={18} />
                    </div>
                    <strong>{value}</strong>
                    <small>
                      {note}
                      <ArrowRight size={13} />
                    </small>
                  </button>
                ))}
              </div>
              <div className="admin-overview-grid">
                <section className="admin-panel">
                  <div className="admin-panel-title">
                    <div>
                      <h2>Your collections</h2>
                      <p>Thoughtful finds, neatly organised.</p>
                    </div>
                    <button onClick={() => setTab("Categories")}>
                      Manage <ArrowRight size={14} />
                    </button>
                  </div>
                  {Object.entries(categories).map(([name, status]) => (
                    <div key={name} className="admin-collection-row">
                      <span className={`admin-category-icon ${name.toLowerCase()}`}>
                        {name === "Ramen" ? "麺" : name === "Beauty" ? "✧" : "♡"}
                      </span>
                      <div>
                        <strong>{name}</strong>
                        <small>{products.filter((p) => p.category === name).length} products</small>
                      </div>
                      <span className={`admin-pill ${status}`}>
                        {status === "active" ? "Active" : "Coming soon"}
                      </span>
                    </div>
                  ))}
                </section>
                <section className="admin-panel admin-checklist">
                  <div className="admin-panel-title">
                    <div>
                      <h2>Catalogue checklist</h2>
                      <p>A clear view of what needs your attention.</p>
                    </div>
                    <span className="admin-checklist-icon">
                      <Check size={18} />
                    </span>
                  </div>
                  <div className="admin-readiness">
                    <span>
                      Selling prices configured
                      <strong>{Math.round((priced / Math.max(1, products.length)) * 100)}%</strong>
                    </span>
                    <progress
                      aria-label="Products with selling prices"
                      max={Math.max(1, products.length)}
                      value={priced}
                    />
                    <small>
                      {priced} of {products.length} products have an LKR selling price
                    </small>
                  </div>
                  <button
                    className="admin-checklist-row"
                    onClick={() => {
                      setTab("Products");
                      setStatusFilter("pending");
                      setFilter("All"); setSearch("");
                      setPage(0);
                    }}
                  >
                    <span className="admin-task-icon">
                      <Pencil size={16} />
                    </span>
                    <span>
                      <strong>Selling prices</strong>
                      <small>{products.length - priced} products to review</small>
                    </span>
                    <ArrowRight size={15} />
                  </button>
                  <button
                    className="admin-checklist-row"
                    onClick={() => {
                      setTab("Products");
                      setStatusFilter("unconfirmed");
                      setFilter("All"); setSearch("");
                      setPage(0);
                    }}
                  >
                    <span className="admin-task-icon">
                      <Package size={16} />
                    </span>
                    <span>
                      <strong>Stock confirmation</strong>
                      <small>{confirmed} products marked in stock</small>
                    </span>
                    <ArrowRight size={15} />
                  </button>
                  <button className="admin-checklist-row" onClick={() => setTab("Categories")}>
                    <span className="admin-task-icon">
                      <Shapes size={16} />
                    </span>
                    <span>
                      <strong>Collection launches</strong>
                      <small>
                        {
                          Object.values(categories).filter((status) => status === "coming_soon")
                            .length
                        }{" "}
                        collections coming soon
                      </small>
                    </span>
                    <ArrowRight size={15} />
                  </button>
                </section>
              </div>
              <section className="admin-panel">
                <div className="admin-panel-title">
                  <div>
                    <h2>Products to review</h2>
                    <p>Set selling prices when you’re ready to offer these finds.</p>
                  </div>
                  <button onClick={() => setTab("Products")}>
                    All products <ArrowRight size={14} />
                  </button>
                </div>
                <div className="admin-review-grid">
                  {products
                    .filter((p) => p.price <= 0)
                    .slice(0, 4)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setEditorError("");
                          setEdit({ ...p, ramen: p.ramen ? { ...p.ramen } : null });
                        }}
                      >
                        <ProductImage product={p} />
                        <strong>{p.name}</strong>
                        <span>
                          Set selling price <ArrowRight size={13} />
                        </span>
                      </button>
                    ))}
                  {products.every((p) => p.price > 0) && <p>All products have a selling price.</p>}
                </div>
              </section>
            </>
          )}
          {tab === "Products" && (
            <section className="admin-panel">
              <div className="admin-panel-title">
                <div>
                  <h2>
                    Product collection <span className="admin-count">{products.length}</span>
                  </h2>
                  <p>Manage prices, images and product information.</p>
                </div>
                <button
                  className="admin-button primary"
                  onClick={() => {
                    setEditorError("");
                    setEdit(blank());
                  }}
                >
                  <Plus size={16} /> Add product
                </button>
              </div>
              <div className="admin-product-views" aria-label="Product status filters">
                {[
                  ["all", "All products"],
                  ["pending", "Price pending"],
                  ["priced", "With prices"],
                  ["unconfirmed", "Stock to confirm"],
                  ["in_stock", "In stock"],
                  ["out_of_stock", "Out of stock"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={statusFilter === value}
                    className={statusFilter === value ? "active" : ""}
                    onClick={() => {
                      setStatusFilter(value || "all");
                      setPage(0);
                    }}
                  >
                    {label}
                    {value === "pending" && <span>{products.length - priced}</span>}
                  </button>
                ))}
              </div>
              <div className="admin-table-tools">
                <label>
                  <Search size={16} />
                  <input
                    aria-label="Search admin products"
                    placeholder="Search products or brands…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(0);
                    }}
                  />
                </label>
                <select
                  aria-label="Filter admin category"
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  {["All", "Ramen", "Beauty", "Chocolate"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Selling price</th>
                      <th>Availability</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.slice(current * 10, current * 10 + 10).map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="admin-product-cell">
                            <ProductImage product={p} />
                            <div>
                              <strong>{p.name}</strong>
                              <small>
                                {(p.ramen?.["brand"] as string) || p.size || "KUMO selection"}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>{p.category}</td>
                        <td className="admin-price-cell">
                          {p.price > 0 ? (
                            money(p.price)
                          ) : (
                            <span className="admin-pill pending">Price pending</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`admin-pill ${p.ramen?.availability === "in_stock" ? "active" : "pending"}`}
                          >
                            {String(p.ramen?.availability || "unconfirmed").replaceAll("_", " ")}
                          </span>
                        </td>
                        <td>
                          <div className="admin-row-actions">
                            <button
                              aria-label={`Edit ${p.name}`}
                              onClick={() => {
                                setEditorError("");
                                setEdit({ ...p, ramen: p.ramen ? { ...p.ramen } : null });
                              }}
                            >
                              <Pencil size={16} />
                            </button>
                            <button aria-label={`Remove ${p.name}`} onClick={() => remove(p)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visible.length === 0 && (
                  <div className="admin-empty">
                    <Search size={28} />
                    <h3>No products found</h3>
                    <p>Try a different name or category.</p>
                    <button
                      onClick={() => {
                        setSearch("");
                        setFilter("All");
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
              <div className="admin-pagination">
                <span>
                  {visible.length
                    ? `${current * 10 + 1}–${Math.min(current * 10 + 10, visible.length)} of ${visible.length} products`
                    : "0 products"}
                </span>
                <div>
                  <button
                    aria-label="Previous page"
                    disabled={current === 0}
                    onClick={() => setPage(current - 1)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span>
                    Page {current + 1} of {pages}
                  </span>
                  <button
                    aria-label="Next page"
                    disabled={current + 1 >= pages}
                    onClick={() => setPage(current + 1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </section>
          )}
          {tab === "Categories" && (
            <div className="admin-category-grid">
              {Object.entries(categories).map(([name, status]) => (
                <section className="admin-panel admin-category-panel" key={name}>
                  <span className={`admin-category-icon ${name.toLowerCase()}`}>
                    {name === "Ramen" ? "麺" : name === "Beauty" ? "✧" : "♡"}
                  </span>
                  <h2>{name}</h2>
                  <p>
                    {name === "Ramen"
                      ? "Comfort in every bowl."
                      : name === "Beauty"
                        ? "A little everyday glow."
                        : "Sweet moments from Japan."}
                  </p>
                  <small>
                    {products.filter((p) => p.category === name).length} products{" "}
                    {live ? "in your store" : "in your draft"}
                  </small>
                  <label>
                    Storefront status
                    <select
                      value={status}
                      disabled={busy}
                      onChange={(e) => {
                        const status = e.target.value as "active" | "coming_soon";
                        if (live) {
                          void persist(
                            () => live.saveCategories({ ...categories, [name]: status }),
                            `${name} collection updated.`,
                          );
                          return;
                        }
                        setCategories({
                          ...categories,
                          [name]: e.target.value as "active" | "coming_soon",
                        });
                        setDirty(true);
                        setMessage(`${name} collection updated in draft.`);
                      }}
                    >
                      <option value="active">Active — show products</option>
                      <option value="coming_soon">Coming soon — show launch message</option>
                    </select>
                  </label>
                  <span className={`admin-pill ${status}`}>
                    {status === "active" ? "Visible in shop" : "Coming soon"}
                  </span>
                </section>
              ))}
            </div>
          )}
          {tab === "Settings" && (
            <form
              className="admin-panel admin-settings"
              onSubmit={(e) => {
                e.preventDefault();
                if (busy) return;
                const form = new FormData(e.currentTarget);
                const values = {
                  name: String(form.get("name")).trim(),
                  phone: String(form.get("phone")).trim(),
                };
                if (live) {
                  void persist(() => live.saveSettings(values), "Store settings saved.");
                  return;
                }
                setSettings({
                  name: String(form.get("name")).trim(),
                  phone: String(form.get("phone")).trim(),
                });
                setDirty(true);
                setMessage("Store settings updated in draft.");
              }}
            >
              <div className="admin-panel-title">
                <div>
                  <h2>Store identity</h2>
                  <p>The essentials your customers see.</p>
                </div>
                <Settings size={21} />
              </div>
              <label>
                Store name
                <input name="name" defaultValue={settings.name} required maxLength={60} />
              </label>
              <label>
                WhatsApp number
                <input
                  name="phone"
                  type="tel"
                  defaultValue={settings.phone}
                  placeholder="947XXXXXXXX"
                  pattern="\+?[0-9 ]{9,16}"
                />
                <small>Include the country code. Leave empty to pause WhatsApp orders.</small>
              </label>
              <div className="admin-settings-note">
                <strong>Database connection</strong>
                <p>
                  {live
                    ? "Connected to Supabase. Changes are saved securely and shared with visitors."
                    : "Pending setup. This preview does not publish changes."}
                </p>
              </div>
              <button className="admin-button primary" disabled={busy}>
                {live ? "Save settings" : "Save draft settings"} <Check size={16} />
              </button>
            </form>
          )}
          <footer className="admin-footer">
            KUMO / A little care behind every find.
            <span>
              {live ? "Live workspace / Supabase" : "Frontend workspace / Database pending"}
            </span>
          </footer>
        </div>
      </main>
      {edit && (
        <ProductEditor
          product={edit}
          error={editorError}
          onError={setEditorError}
          onClose={() => setEdit(null)}
          busy={busy}
          uploadImage={live?.uploadImage}
          live={Boolean(live)}
          onSave={async (product) => {
            if (live) {
              if (await persist(() => live.saveProduct(product), "Product saved to the store."))
                setEdit(null);
              else
                setEditorError(
                  "Unable to save. Check the status message or your connection and try again.",
                );
              return;
            }
            setProducts((items) =>
              items.some((p) => p.id === product.id)
                ? items.map((p) => (p.id === product.id ? product : p))
                : [product, ...items],
            );
            setDirty(true);
            setEdit(null);
            setMessage("Product saved to draft. Preview your shop to see the change.");
          }}
        />
      )}
    </div>
  );
}

function ProductEditor({
  product,
  onSave,
  onClose,
  error,
  onError,
  busy = false,
  uploadImage,
  live = false,
}: {
  product: StoreProduct;
  onSave: (product: StoreProduct) => void | Promise<void>;
  busy?: boolean;
  uploadImage?: ((file: File) => Promise<string>) | undefined;
  live?: boolean;
  onClose: () => void;
  error: string;
  onError: (message: string) => void;
}) {
  const [draft, setDraft] = useState(product);
  const [uploading, setUploading] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const closeAction = useRef(onClose);
  closeAction.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAction.current();
      if (event.key !== "Tab") return;
      const nodes = panel.current?.querySelectorAll<HTMLElement>(
        "button, input, textarea, select, a[href]",
      );
      const first = nodes?.[0],
        last = nodes?.[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keyboard);
      previous?.focus();
    };
  }, []);
  const update = (key: string, value: unknown) =>
    setDraft((p) => ({
      ...p,
      [key]: value,
      ...(key === "image" && p.ramen ? { ramen: { ...p.ramen, image: value } } : {}),
    }));
  return (
    <div className="admin-editor-backdrop" onClick={onClose}>
      <section
        ref={panel}
        className="admin-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-heading"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-editor-heading">
          <div>
            <span className="admin-kicker">CURATE YOUR COLLECTION</span>
            <h2 id="editor-heading">
              {String(product.id).startsWith("draft:") ? "Product details" : "Edit product"}
            </h2>
          </div>
          <button aria-label="Close product editor" onClick={onClose}>
            <X size={21} />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (busy || uploading) return;
            if (!draft.name.trim()) {
              onError("Enter a product name.");
              return;
            }
            if (
              draft.image &&
              !/^(https?:\/\/|\/[^/]|data:image\/(png|jpeg|webp);base64,)/i.test(draft.image)
            ) {
              onError("Use an https image URL, a local image path or an uploaded image.");
              return;
            }
            if (live && draft.image.startsWith("data:")) {
              onError("Upload the image using the upload button instead of pasting base64 data.");
              return;
            }
            void onSave({
              ...draft,
              name: draft.name.trim(),
              catalogueOnly: draft.price <= 0,
              ramen: draft.category === "Ramen" ? (draft.ramen ?? null) : null,
            });
          }}
        >
          <div className="admin-editor-image">
            <ProductImage product={draft} />
            <div>
              <strong>Product image</strong>
              <p>Use an image URL or upload a JPG, PNG or WebP.</p>
              <label className="admin-upload">
                <Upload size={15} /> Upload image
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      onError("Choose an image smaller than 5 MB.");
                      return;
                    }
                    if (uploadImage) {
                      setUploading(true);
                      onError("");
                      try {
                        update("image", await uploadImage(file));
                      } catch (error) {
                        onError(error instanceof Error ? error.message : "Image upload failed.");
                      } finally {
                        setUploading(false);
                      }
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => update("image", String(reader.result));
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>
          </div>
          <label>
            Product name
            <input
              autoFocus
              required
              maxLength={180}
              value={draft.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </label>
          <label>
            Description
            <textarea
              rows={3}
              value={draft.subtitle || ""}
              onChange={(e) => update("subtitle", e.target.value)}
            />
          </label>
          <div className="admin-field-grid">
            <label>
              Category
              <select value={draft.category} onChange={(e) => update("category", e.target.value)}>
                {["Ramen", "Beauty", "Chocolate"].map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label>
              Label
              <select value={draft.tag || ""} onChange={(e) => update("tag", e.target.value)}>
                {["", "NEW", "BESTSELLER", "CATALOGUE"].map((value) => (
                  <option key={value} value={value}>
                    {value || "No label"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Selling price (LKR)
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={draft.price}
                onChange={(e) => update("price", Number(e.target.value))}
              />
            </label>
            <label>
              Previous price (LKR)
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.old ?? ""}
                onChange={(e) => update("old", e.target.value ? Number(e.target.value) : null)}
              />
            </label>
          </div>
          <label>
            Size / pack
            <input value={draft.size || ""} onChange={(e) => update("size", e.target.value)} />
          </label>
          <label>
            Image URL
            <input
              value={draft.image}
              onChange={(e) => update("image", e.target.value)}
              placeholder="https://… or /products/…"
            />
          </label>
          {draft.category === "Ramen" && (
            <fieldset>
              <legend>Product specifications</legend>
              <div className="admin-field-grid">
                {["brand", "country", "flavor", "unit", "spicy_level", "price_jpy"].map((key) => (
                  <label key={key}>
                    {
                      (
                        {
                          brand: "Brand",
                          country: "Country",
                          flavor: "Flavour",
                          unit: "Pack details",
                          spicy_level: "Heat (0–5)",
                          price_jpy: "Japan reference price (JPY)",
                        } as Record<string, string>
                      )[key]
                    }
                    <input
                      type={["spicy_level", "price_jpy"].includes(key) ? "number" : "text"}
                      min="0"
                      max={key === "spicy_level" ? 5 : undefined}
                      step={key === "spicy_level" ? 1 : undefined}
                      value={String(draft.ramen?.[key] ?? "")}
                      onChange={(e) =>
                        update("ramen", {
                          ...draft.ramen,
                          [key]: ["spicy_level", "price_jpy"].includes(key)
                            ? Number(e.target.value)
                            : e.target.value,
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <label>
                Availability
                <select
                  value={draft.ramen?.availability || "unconfirmed"}
                  onChange={(e) =>
                    update("ramen", { ...draft.ramen, availability: e.target.value })
                  }
                >
                  {["unconfirmed", "in_stock", "out_of_stock"].map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
          )}
          <p className="admin-editor-help">
            A zero selling price keeps ordering disabled. Reference prices and specifications appear
            in the product detail view.
          </p>
          {error && (
            <p className="admin-form-error" role="alert">
              {error}
            </p>
          )}
          <div className="admin-editor-footer">
            <button type="button" className="admin-button" onClick={onClose}>
              Cancel
            </button>
            <button className="admin-button primary" disabled={busy || uploading}>
              <Check size={16} />{" "}
              {uploading
                ? "Uploading..."
                : busy
                  ? "Saving..."
                  : live
                    ? "Save product"
                    : "Save to draft"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
