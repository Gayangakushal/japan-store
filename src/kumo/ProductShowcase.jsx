import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Heart, ShoppingCart, Search } from "lucide-react";
import "./products.css";
import ProductImage from "./ProductImage";
import { canAddToBag } from "@/lib/local-catalogue";
import { defaultCategoryStatus } from "@/lib/storefront-config";

export default function ProductShowcase({
  products,
  filtered,
  category,
  setCategory,
  search,
  setSearch,
  sort,
  setSort,
  view,
  liked,
  setLiked,
  onDetail,
  onAdd,
  money,
  onReset,
  categoryStatus = defaultCategoryStatus,
}) {
  const [country, setCountry] = useState("");
  const [brand, setBrand] = useState("");
  const [heat, setHeat] = useState("");

  const [collection, setCollection] = useState("All Products");
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState("All");
  const openingOffers = useRef(false);
  useEffect(() => {
    if (openingOffers.current) {
      openingOffers.current = false;
      return;
    }
    setCollection("All Products");
    setPage(0);
  }, [category, search, view]);
  useEffect(() => {
    setCountry("");
    setBrand("");
    setHeat("");
  }, [category, view]);
  const comingSoon = categoryStatus[category] === "coming_soon";
  let selection = filtered
    .filter((p) => categoryStatus[p.category] !== "coming_soon")
    .filter(
      (p) =>
        collection === "All Products" ||
        (collection === "Latest Products"
          ? p.tag === "NEW"
          : collection === "Best Sellers"
            ? p.tag === "BESTSELLER"
            : Boolean(p.old > p.price)),
    );
  selection = selection.filter(
    (p) =>
      !comingSoon &&
      (!country || p.ramen?.country === country) &&
      (!brand || p.ramen?.brand === brand) &&
      (heat === "" || p.ramen?.spicy_level === Number(heat)),
  );
  if (sort.startsWith("Japan price:"))
    selection.sort((a, b) => {
      const av = a.ramen?.price_jpy,
        bv = b.ramen?.price_jpy;
      if (av == null) return bv == null ? 0 : 1;
      if (bv == null) return -1;
      return sort.endsWith("low to high") ? av - bv : bv - av;
    });
  if (sort.startsWith("Price:"))
    selection.sort((a, b) => {
      if (a.price <= 0) return b.price <= 0 ? 0 : 1;
      if (b.price <= 0) return -1;
      return sort.endsWith("low to high") ? a.price - b.price : b.price - a.price;
    });
  const pageSize = perPage === "All" ? Math.max(1, selection.length) : Number(perPage);
  const pages = Math.ceil(selection.length / pageSize);
  const current = Math.min(page, Math.max(0, pages - 1));
  const deals = products.filter(
    (p) => categoryStatus[p.category] !== "coming_soon" && p.price > 0 && p.old > p.price,
  );
  const openDeals = () => {
    setCountry("");
    setBrand("");
    setHeat("");
    openingOffers.current = category !== "All finds" || Boolean(search) || view !== "all";
    setCollection("Featured Products");
    setPage(0);
    onReset();
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
  };
  const reset = () => {
    setCountry("");
    setBrand("");
    setHeat("");
    setCollection("All Products");
    setPage(0);
    onReset();
  };
  return (
    <section id="shop" className="product-showcase">
      <div className="collection-heading">
        <p className="eyebrow">LITTLE FINDS FROM JAPAN</p>
        <h2>
          {view === "saved" ? "Your saved" : "Our products"} <span>collection.</span>
        </h2>
        <p>Everyday favourites. A little extra joy.</p>
      </div>
      <div className="collection-tabs" aria-label="Product collections">
        {["All Products", "Latest Products", "Best Sellers", "Featured Products"].map((item) => (
          <button
            key={item}
            aria-pressed={collection === item}
            className={collection === item ? "active" : ""}
            onClick={() => {
              setCollection(item);
              setPage(0);
            }}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="collection-tools">
        <div aria-label="Product categories">
          {["All finds", "Ramen", "Chocolate", "Beauty"].map((item) => (
            <button
              key={item}
              aria-pressed={category === item}
              className={category === item ? "active" : ""}
              onClick={() => {
                setCategory(item);
                setPage(0);
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <label>
          Sort by{" "}
          <select
            aria-label="Sort products"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(0);
            }}
          >
            {[
              "Curated picks",
              "Price: low to high",
              "Price: high to low",
              "Japan price: low to high",
              "Japan price: high to low",
            ].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      {!comingSoon && (
        <div className="ramen-filters">
          <label>
            Search name or brand
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Find your noodles"
            />
          </label>
          {[
            [
              "Country",
              country,
              setCountry,
              [...new Set(products.map((p) => p.ramen?.country).filter(Boolean))].sort(),
            ],
            [
              "Brand",
              brand,
              setBrand,
              [...new Set(products.map((p) => p.ramen?.brand).filter(Boolean))].sort(),
            ],
            ["Heat (0-5)", heat, setHeat, [0, 1, 2, 3, 4, 5]],
          ].map(([label, value, setValue, options]) => (
            <label key={label}>
              {label}
              <select
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">All</option>
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button onClick={reset}>Reset filters</button>
        </div>
      )}
      {search && !comingSoon && (
        <div className="collection-search">
          Results for “{search}”{" "}
          <button
            onClick={() => {
              setSearch("");
              setPage(0);
            }}
          >
            Clear search
          </button>
        </div>
      )}
      <div className="collection-products">
        {selection.slice(current * pageSize, current * pageSize + pageSize).map((product) => (
          <article className="find-card" data-ramen={Boolean(product.ramen)} key={product.id}>
            <div className="find-image">
              <button
                className="find-open"
                aria-label={`View ${product.name}`}
                onClick={() => onDetail(product)}
              >
                <ProductImage product={product} loading="lazy" />
              </button>
              <span
                className={
                  "find-badge" +
                  (product.old > product.price && product.price > 0 ? " is-offer" : "")
                }
              >
                {product.old > product.price && product.price > 0
                  ? `${Math.round((1 - product.price / product.old) * 100)}% OFF`
                  : product.tag === "NEW"
                    ? "NEW ARRIVAL"
                    : product.tag === "BESTSELLER"
                      ? "BESTSELLER"
                      : "KUMO SELECT"}
              </span>
              <span className="find-image-hint" aria-hidden="true">
                Take a closer look <ArrowUpRight size={15} />
              </span>
              <button
                className={"find-save" + (liked.includes(product.id) ? " saved" : "")}
                aria-label={`Save ${product.name}`}
                aria-pressed={liked.includes(product.id)}
                onClick={() =>
                  setLiked(
                    liked.includes(product.id)
                      ? liked.filter((id) => id !== product.id)
                      : [...liked, product.id],
                  )
                }
              >
                <Heart size={16} fill={liked.includes(product.id) ? "currentColor" : "none"} />
              </button>
            </div>
            <div className="find-card-copy">
              <small className="find-category">
                {product.ramen?.brand || "KUMO SELECT"}
                <span>{product.category}</span>
              </small>
              <button className="find-name" onClick={() => onDetail(product)}>
                {product.name}
              </button>
              <div className="find-purchase">
                <div className="find-purchase-info">
                  <p className={"find-stock" + (!canAddToBag(product) ? " pending" : "")}>
                    {product.ramen?.availability === "in_stock"
                      ? "In stock"
                      : product.ramen?.availability === "out_of_stock"
                        ? "Out of stock"
                        : "Stock to confirm"}
                  </p>
                  <div className="find-price">
                    {product.price > 0 ? money(product.price) : "Price pending"}
                    {product.price > 0 && product.old > product.price && (
                      <del>{money(product.old)}</del>
                    )}
                  </div>
                </div>
                <button
                  disabled={!canAddToBag(product)}
                  className="find-add"
                  aria-label={
                    canAddToBag(product)
                      ? `Add ${product.name} to bag`
                      : `${product.name}: ${product.ramen?.availability === "out_of_stock" ? "out of stock" : "selling price pending"}`
                  }
                  title={
                    canAddToBag(product)
                      ? "Add to bag"
                      : product.ramen?.availability === "out_of_stock"
                        ? "Out of stock"
                        : "Selling price pending"
                  }
                  onClick={() => onAdd(product)}
                >
                  <ShoppingCart size={21} />
                  <span className="sr-only">
                    {!canAddToBag(product) ? "Selling price pending" : "Add to bag"}
                  </span>
                </button>
              </div>
              <button className="find-details" onClick={() => onDetail(product)}>
                View product <ArrowUpRight size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {comingSoon ? (
        <div className="category-coming-soon">
          <span className="coming-soon-symbol" aria-hidden="true">
            {category === "Beauty" ? "\u2727" : "\u2661"}
          </span>
          <span className="coming-soon-label">SOMETHING LOVELY IS ON ITS WAY</span>
          <h2>
            {category === "Beauty" ? "A little everyday glow." : "Sweet things take a little time."}
          </h2>
          <p>
            Our {category === "Beauty" ? "Japanese beauty & care" : "chocolate & treats"} collection
            is coming soon. We are carefully choosing your next favourites.
          </p>
          <span className="coming-soon-pill">Coming soon</span>
          <button onClick={() => setCategory("Ramen")}>
            Explore ramen instead <ArrowUpRight size={16} />
          </button>
        </div>
      ) : (
        !selection.length && (
          <div className="empty">
            <Search size={28} />
            <h3>No products in this collection.</h3>
            <p>Explore another collection to find your favourite.</p>
            <button className="primary" onClick={reset}>
              Show all products
            </button>
          </div>
        )
      )}
      {!comingSoon && (
        <div className="collection-footer">
          <label>
            Products per page{" "}
            <select
              aria-label="Products per page"
              value={perPage}
              onChange={(e) => {
                setPerPage(e.target.value);
                setPage(0);
              }}
            >
              {["All", "12", "24"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <span>
            {selection.length
              ? `${current * pageSize + 1}–${Math.min((current + 1) * pageSize, selection.length)} of ${selection.length} finds`
              : "0 finds"}
          </span>
          <div>
            <button
              disabled={pages < 2}
              aria-label="Previous products"
              onClick={() => setPage((current - 1 + pages) % pages)}
            >
              <ChevronLeft size={17} />
            </button>
            <button
              disabled={pages < 2}
              aria-label="Next products"
              onClick={() => setPage((current + 1) % pages)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      )}
      <div className="collection-promos">
        <div className="find-sale">
          <span className="sale-flower" aria-hidden="true">
            ✳
          </span>
          <p className="eyebrow">A LITTLE MORE TO LOVE</p>
          <h3>{deals.length ? "Good finds. Better prices." : "Your next little favourite."}</h3>
          <p>
            {deals.length
              ? `Save up to ${Math.max(...deals.map((p) => Math.round((1 - p.price / p.old) * 100)))}% on selected Japanese favourites.`
              : "Discover everyday joys, carefully picked from Japan."}
          </p>
          <div className="sale-note">
            <span>CURATED IN JAPAN</span>
            <i /> <span>DELIVERED WITH CARE</span>
          </div>
          <button onClick={deals.length ? openDeals : reset}>
            {" "}
            {deals.length ? "Shop the offers" : "Explore all finds"} <ArrowUpRight size={16} />
          </button>
          <small>Availability confirmed when you order.</small>
        </div>
        {[
          {
            category: "Ramen",
            label: "A bowl of comfort.",
            product: products.find((p) => p.category === "Ramen"),
          },
          {
            category: "Beauty",
            label: "A little everyday glow.",
            product: products.find((p) => p.category === "Beauty"),
          },
        ].map((p) => (
          <button
            className="find-promo"
            key={p.category}
            onClick={() => {
              onReset();
              setCategory(p.category);
              setCollection("All Products");
              setPage(0);
              document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            {p.product && <ProductImage product={p.product} loading="lazy" />}
            <span>
              <small>EXPLORE {p.category.toUpperCase()}</small>
              <strong>{p.label}</strong>
              {categoryStatus[p.category] === "coming_soon" && (
                <em className="promo-coming-soon">Coming soon</em>
              )}
            </span>
            <ArrowUpRight size={20} />
          </button>
        ))}
      </div>
    </section>
  );
}
