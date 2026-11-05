import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { buildLocalCatalogue, localStoreSnapshot, canAddToBag } from "@/lib/local-catalogue";
import { signOut } from "@/lib/sign-out";
import PaymentMarks from "./PaymentMarks";
import { defaultCategoryStatus } from "@/lib/storefront-config";
import ProductShowcase from "./ProductShowcase";
import ProductImage from "./ProductImage";
import ProductDetails from "./ProductDetails";
import BannerSlider from "./BannerSlider";
import StoreHeader from "./StoreHeader";
import React, { useState as S } from "react";
import {
  Search,
  ShoppingBag,
  ArrowUpRight,
  ArrowRight,
  Menu,
  X,
  Plus,
  Minus,
  Truck,
  ShieldCheck,
  MessageCircle,
  Heart,
  Trash2,
  Check,
  SlidersHorizontal,
  Package,
  Leaf,
  ChevronDown,
} from "lucide-react";
import "./style.css";
import "./responsive.css";
const img = (id, w = 700) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;
const photos = {
  ramen: img("photo-1569718212165-3a8278d5f624"),
  chocolate: "/products/chocolate.jpg",
  beauty: img("photo-1608571423902-eed4a5ad8108"),
  matcha: img("photo-1515823064-d6e0c04616a7"),
};

function persisted(k, def) {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? def;
  } catch {
    return def;
  }
}
const money = (n) => "Rs. " + Number(n).toLocaleString("en-LK");
export default function App({ previewStore = null, categoryStatus = defaultCategoryStatus }) {
  const queryClient = useQueryClient(),
    navigate = useNavigate();
  // Reuse data already in memory when returning from another route; never fetch it here.
  const store = previewStore || queryClient.getQueryData(["store"]) || localStoreSnapshot;
  const account = queryClient.getQueryData(["account"]) || null;
  const products = React.useMemo(() => previewStore ? store.products : buildLocalCatalogue(store.products), [store.products, previewStore]);
  const [unused, setProducts] = S([]),
    [cart, setCart] = S(() => persisted("kumo-cart", [])),
    [category, setCategory] = S("All finds"),
    [search, setSearch] = S(""),
    [sort, setSort] = S("Curated picks"),
    [drawer, setDrawer] = S(false),
    [detail, setDetail] = S(null),
    [admin, setAdmin] = S(false),
    [tab, setTab] = S("Products"),
    [edit, setEdit] = S(null),
    [unusedSettings, setSettings] = S({}),
    [toast, setToast] = S(""),
    [mobile, setMobile] = S(false),
    [liked, setLiked] = S([]),
    [view, setView] = S("all");
  const settings = store.settings;
  React.useEffect(() => {
    if (location.hash === "#admin") {
      location.hash = "";
      navigate({ to: "/admin" });
    }
  }, [navigate]);
  const notify = (t) => {
      setToast(t);
      setTimeout(() => setToast(""), 2700);
    },
    saveProducts = (p) => {
      setProducts(p);
      localStorage.setItem("kumo-products", JSON.stringify(p));
    },
    updateCart = (c) => {
      setCart(c);
      localStorage.setItem("kumo-cart", JSON.stringify(c));
    },
    add = (p) => {
      if (!canAddToBag(p)) {
        notify("Availability and selling price must be confirmed first.");
        return;
      }
      updateCart([
        ...cart.filter((x) => x.id !== p.id),
        { id: p.id, qty: (cart.find((x) => x.id === p.id)?.qty || 0) + 1 },
      ]);
      notify("Added to your bag");
    },
    qty = (id, d) =>
      updateCart(
        cart.map((x) => (x.id === id ? { ...x, qty: x.qty + d } : x)).filter((x) => x.qty > 0),
      );
  const items = cart
      .map((x) => ({
        ...(products.find((p) => p.id === x.id) || store.products.find((p) => p.id === x.id)),
        qty: x.qty,
      }))
      .filter((x) => x.name),
    total = items.reduce((a, p) => a + p.price * p.qty, 0),
    count = items.reduce((a, p) => a + p.qty, 0);
  let filtered = products.filter(
    (p) =>
      (category === "All finds" || p.category === category) &&
      (p.name + " " + (p.ramen?.brand || "")).toLowerCase().includes(search.toLowerCase()) &&
      (view !== "saved" || liked.includes(p.id)),
  );
  if (sort === "Price: low to high") filtered.sort((a, b) => a.price - b.price);
  if (sort === "Price: high to low") filtered.sort((a, b) => b.price - a.price);
  const shop = (c) => {
    setCategory(c);
    setView("all");
    setMobile(false);
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
  };
  const checkout = () => {
    if (!settings.phone) {
      notify("WhatsApp ordering is not available yet. Please try again later.");
      return;
    }
    const message = `Hello ${settings.name}! I'd like to order:\n\n${items.map((p) => `${p.name} × ${p.qty} — ${money(p.price * p.qty)}`).join("\n")}\n\nSubtotal: ${money(total)}\nPlease confirm availability and delivery cost.\nName: \nDelivery address: `;
    window.open(
      "https://wa.me/" + settings.phone.replace(/\D/g, "") + "?text=" + encodeURIComponent(message),
      "_blank",
      "noopener,noreferrer",
    );
  };
  return (
    <>
      <StoreHeader
        categoryStatus={categoryStatus}
        account={account}
        onSignOut={async () => {
          await signOut(queryClient);
          navigate({ to: "/auth", replace: true });
        }}
        name={settings.name}
        phone={settings.phone}
        search={search}
        setSearch={setSearch}
        category={category}
        count={count}
        total={total}
        money={money}
        onHome={() => {
          setAdmin(false);
          location.hash = "";
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onBrowse={(c) => {
          setAdmin(false);
          setTimeout(() => shop(c), 0);
        }}
        onSaved={() => {
          setAdmin(false);
          setView("saved");
          setCategory("All finds");
          setSearch("");
          setTimeout(
            () => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" }),
            0,
          );
        }}
        onCart={() => setDrawer(true)}
        onAdmin={() => {
          navigate({ to: "/admin" });
        }}
        onStory={() => {
          setAdmin(false);
          setTimeout(
            () => document.getElementById("story")?.scrollIntoView({ behavior: "smooth" }),
            0,
          );
        }}
        onChat={() =>
          settings.phone
            ? window.open(
                "https://wa.me/" + settings.phone.replace(/\D/g, ""),
                "_blank",
                "noopener",
              )
            : notify("WhatsApp chat is not available yet.")
        }
      />

      {
        <main>
          <BannerSlider onShop={shop} />
          <div className="trust-strip">
            <span>
              <ShieldCheck /> Carefully curated in Japan
            </span>
            <span>
              <Truck /> Delivered across Sri Lanka
            </span>
            <span>
              <MessageCircle /> Easy orders on WhatsApp
            </span>
            <span>
              <Heart /> Little things, lots of joy
            </span>
          </div>
          <section className="collections">
            <div className="section-top">
              <div>
                <p className="eyebrow">FOLLOW YOUR FAVOURITES</p>
                <h2>A little something for you.</h2>
              </div>
              <span className="handwritten">
                何が好き? <span>What’s your pick?</span>
              </span>
            </div>
            <div className="collection-grid">
              {[
                {
                  cat: "Ramen",
                  title: "Slurp. Smile. Repeat.",
                  label: "RAMEN & NOODLES",
                  text: "Comfort, by the bowl.",
                  image: photos.ramen,
                },
                {
                  cat: "Chocolate",
                  title: "Just one more bite.",
                  label: "CHOCOLATE & TREATS",
                  text: "Sweet little escapes.",
                  image: photos.chocolate,
                },
                {
                  cat: "Beauty",
                  title: "Your everyday glow.",
                  label: "BEAUTY & CARE",
                  text: "Good days start with you.",
                  image: photos.beauty,
                },
              ].map((c, i) => (
                <button className={"collection c" + i} key={c.cat} onClick={() => shop(c.cat)}>
                  <img src={c.image} alt={c.label} />
                  <div>
                    <small>{c.label}</small>
                    <h3>{c.title}</h3>
                    <p>{categoryStatus[c.cat] === "coming_soon" ? "Coming soon" : c.text}</p>
                  </div>
                  <span className="circle-arrow">
                    <ArrowUpRight size={21} />
                  </span>
                </button>
              ))}
            </div>
          </section>
          <ProductShowcase
            categoryStatus={categoryStatus}
            products={products}
            filtered={filtered}
            category={category}
            setCategory={setCategory}
            search={search}
            setSearch={setSearch}
            sort={sort}
            setSort={setSort}
            view={view}
            liked={liked}
            setLiked={setLiked}
            onDetail={setDetail}
            onAdd={add}
            money={money}
            onReset={() => {
              setSearch("");
              setCategory("All finds");
              setView("all");
            }}
          />
          <section className="how">
            <p className="eyebrow">NO COMPLICATED CHECKOUTS HERE.</p>
            <h2>See it. Love it. WhatsApp it.</h2>
            <div className="steps">
              {[
                [
                  "01",
                  "Find your little joy",
                  "Explore the collection and add your favourites to your bag.",
                ],
                [
                  "02",
                  "Say hello on WhatsApp",
                  "Send your bag as an order request in one simple tap.",
                ],
                [
                  "03",
                  "We’ll take it from here",
                  "We confirm stock, payment and delivery with you personally.",
                ],
              ].map((x) => (
                <div>
                  <span>{x[0]}</span>
                  <h3>{x[1]}</h3>
                  <p>{x[2]}</p>
                </div>
              ))}
            </div>
          </section>
          <section id="story" className="story">
            <div className="story-symbol">
              雲<span>KUMO MEANS CLOUD.</span>
            </div>
            <div>
              <p className="eyebrow">A SMALL SHOP. A BIG SOFT SPOT FOR JAPAN.</p>
              <h2>Japan, a little closer.</h2>
              <p>
                Some things are too good to keep on the other side of the world. We bring together
                the flavours, treats and everyday rituals we love from Japan — for a little more
                discovery in your day, right here in Sri Lanka.
              </p>
              <a href="#shop">
                Come find your favourite <ArrowUpRight size={17} />
              </a>
            </div>
          </section>
          <section className="last-banner">
            <div>
              <span>GOOD FINDS. GOOD COMPANY.</span>
              <h2>Not sure where to start?</h2>
              <p>We’d love to help you find your kind of Japan.</p>
            </div>
            <button
              onClick={() =>
                settings.phone
                  ? window.open(
                      "https://wa.me/" + settings.phone.replace(/\D/g, ""),
                      "_blank",
                      "noopener",
                    )
                  : notify("WhatsApp chat is not available yet.")
              }
            >
              <MessageCircle size={19} /> Let’s chat <ArrowUpRight size={18} />
            </button>
          </section>
        </main>
      }
      <footer>
        <div className="footer-main">
          <div>
            <a className="logo" href="#">
              <span className="sun">✳</span>
              {settings.name.toLowerCase()}
              <b>日本から、あなたへ</b>
            </a>
            <p>
              Little joys from Japan.
              <br />
              Delivered with care, in Sri Lanka.
            </p>
          </div>
          <div>
            <strong>FIND YOUR FAVOURITE</strong>
            {["All finds", "Ramen", "Chocolate", "Beauty"].map((c) => (
              <button
                onClick={() => {
                  setAdmin(false);
                  setTimeout(() => shop(c), 0);
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <div>
            <strong>THE LITTLE DETAILS</strong>
            <a href="/products/ramen/credits.html">Product photo credits</a>
            <a href="#story" onClick={() => setAdmin(false)}>
              Our story
            </a>
            <button
              onClick={() =>
                notify("Delivery charges and timelines are confirmed on WhatsApp before payment.")
              }
            >
              Delivery & orders
            </button>
            <button
              onClick={() =>
                notify(
                  "Contact us on WhatsApp about damaged or incorrect items. Returns are confirmed individually.",
                )
              }
            >
              Returns & support
            </button>
          </div>
          <div className="footer-message">
            <span>日本の小さな幸せ。</span>
            <p>A little happiness from Japan.</p>
            <small>
              Product photos or labelled placeholders.
              <br />
              Product availability is confirmed before payment.
            </small>
          </div>
        </div>
        <PaymentMarks />
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {settings.name}. Made for little moments.
          </span>
          <span>
            JAPAN → SRI LANKA <span className="red-dot" />
          </span>
          <a href="#">Back to top ↑</a>
        </div>
      </footer>
      {drawer && (
        <div className="overlay" onClick={() => setDrawer(false)}>
          <aside className="cart-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <p className="eyebrow">YOUR LITTLE FINDS</p>
                <h2>
                  The good stuff. <small>({count})</small>
                </h2>
              </div>
              <button aria-label="Close bag" onClick={() => setDrawer(false)}>
                <X />
              </button>
            </div>
            {items.length ? (
              <>
                <div className="cart-items">
                  {items.map((p) => (
                    <div className="cart-row">
                      <ProductImage product={p} />
                      <div>
                        <small>{p.category}</small>
                        <h3>{p.name}</h3>
                        <b>{money(p.price)}</b>
                        <div className="quantity">
                          <button aria-label="Decrease quantity" onClick={() => qty(p.id, -1)}>
                            <Minus size={13} />
                          </button>
                          <span>{p.qty}</span>
                          <button aria-label="Increase quantity" onClick={() => qty(p.id, 1)}>
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                      <button
                        aria-label="Remove item"
                        onClick={() => updateCart(cart.filter((x) => x.id !== p.id))}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="cart-bottom">
                  <div>
                    <span>Subtotal</span>
                    <b>{money(total)}</b>
                  </div>
                  <p>
                    Delivery is confirmed on WhatsApp. Your order is placed only after we confirm
                    availability and payment.
                  </p>
                  <button className="primary" onClick={checkout}>
                    <MessageCircle size={20} /> Order on WhatsApp <ArrowUpRight size={18} />
                  </button>
                  <small>
                    {!settings.phone
                      ? "WhatsApp ordering not available"
                      : "A friendly human will take it from here."}
                  </small>
                </div>
              </>
            ) : (
              <div className="empty">
                <ShoppingBag size={40} />
                <h2>A little room for joy.</h2>
                <p>Your bag is waiting for its first find.</p>
                <button
                  className="primary"
                  onClick={() => {
                    setDrawer(false);
                    setAdmin(false);
                    setTimeout(() => shop("All finds"), 0);
                  }}
                >
                  Explore the collection
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
      {detail && (
        <ProductDetails
          product={detail}
          products={products.filter((p) => categoryStatus[p.category] !== "coming_soon")}
          onSelect={setDetail}
          money={money}
          onClose={() => setDetail(null)}
          onAdd={add}
        />
      )}
      {toast && (
        <div role="status" className="toast">
          <Check size={17} />
          {toast}
        </div>
      )}
    </>
  );
}
