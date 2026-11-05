import React, { useEffect, useRef } from "react";
import { ArrowLeft, ArrowUpRight, ShoppingBag, ShieldCheck, Truck, X } from "lucide-react";
import ProductImage, { ImageCredit } from "./ProductImage";
import { canAddToBag } from "@/lib/local-catalogue";
import "./product-details.css";

export default function ProductDetails({
  product,
  products = [],
  money,
  onClose,
  onAdd,
  onSelect,
}) {
  const dialog = useRef(null);
  const close = useRef(null);
  const scrollArea = useRef(null);
  const closeAction = useRef(onClose);
  closeAction.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const keyboard = (event) => {
      if (event.key === "Escape") closeAction.current();
      if (event.key !== "Tab") return;
      const nodes = [
        ...dialog.current.querySelectorAll(
          'button:not(:disabled), a[href], input, select, textarea, [tabindex="0"]',
        ),
      ];
      const first = nodes[0],
        last = nodes[nodes.length - 1];
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
      previous?.focus?.();
    };
  }, []);
  useEffect(() => {
    if (scrollArea.current) scrollArea.current.scrollTop = 0;
    close.current?.focus();
  }, [product.id]);
  const ramen = product.ramen;
  const related = products
    .filter((p) => p.id !== product.id && p.category === product.category)
    .sort(
      (a, b) => Number(b.ramen?.brand === ramen?.brand) - Number(a.ramen?.brand === ramen?.brand),
    )
    .slice(0, 4);
  const facts = ramen
    ? [
        ["Brand", ramen.brand],
        ["Origin", ramen.country],
        ["Flavour", ramen.flavor],
        ["Heat level", `${ramen.spicy_level}/5`],
        ["Pack size", ramen.unit],
        ["Availability", (ramen.availability || "unconfirmed").replaceAll("_", " ")],
      ]
    : [
        ["Category", product.category],
        ["Size", product.size],
      ];
  return (
    <div className="product-view-backdrop" onClick={onClose}>
      <div
        ref={dialog}
        className="product-single-view"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="detail-toolbar">
          <button ref={close} onClick={onClose}>
            <ArrowLeft size={17} /> Back to collection
          </button>
          <span>KUMO / PRODUCT DETAILS</span>
          <button onClick={onClose} aria-label="Close product">
            <X size={21} />
          </button>
        </div>
        <div className="detail-scroll" ref={scrollArea}>
          <div className="detail-hero">
            <div className="detail-photo">
              <span className="detail-category">{product.category}</span>
              <ProductImage product={product} className="ramen-detail-image" />
              <ImageCredit product={product} />
            </div>
            <div className="detail-summary">
              <p className="eyebrow">A LITTLE FIND. A LOT TO LOVE.</p>
              <h2 id="product-detail-title">{product.name}</h2>
              <p className="detail-description">
                {product.subtitle ||
                  ramen?.description ||
                  "Carefully selected for your everyday moments."}
              </p>
              <div className="detail-price">
                {product.price > 0 ? money(product.price) : "Price pending"}
                {product.price > 0 && product.old > product.price && (
                  <del>{money(product.old)}</del>
                )}
              </div>
              <p className="detail-stock">
                {(ramen?.availability || "Availability confirmed on order").replaceAll("_", " ")}
              </p>
              <dl className="detail-facts">
                {facts
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
              </dl>
              {ramen?.price_jpy > 0 && (
                <p className="jpy-reference">
                  {new Intl.NumberFormat("ja-JP", {
                    style: "currency",
                    currency: "JPY",
                    maximumFractionDigits: 0,
                  }).format(ramen.price_jpy)}{" "}
                  · Estimated Japan retail price
                </p>
              )}
              <button
                className="detail-add"
                disabled={!canAddToBag(product)}
                onClick={() => onAdd(product)}
              >
                <ShoppingBag size={19} />{" "}
                {canAddToBag(product)
                  ? "Add to bag"
                  : ramen?.availability === "out_of_stock"
                    ? "Out of stock"
                    : "Selling price to be confirmed"}
              </button>
              <div className="detail-reassurance">
                <span>
                  <Truck size={17} /> Islandwide delivery
                </span>
                <span>
                  <ShieldCheck size={17} /> Carefully curated
                </span>
              </div>
              <p className="detail-order-note">
                Final stock and delivery are confirmed on WhatsApp. Japanese retail estimates are
                reference prices; orders use the LKR selling price.
              </p>
            </div>
          </div>
          {related.length > 0 && (
            <section className="detail-related">
              <div className="detail-related-heading">
                <div>
                  <p className="eyebrow">MORE LITTLE FINDS</p>
                  <h3>You might also like</h3>
                </div>
                <span>Picked to go with your favourite.</span>
              </div>
              <div className="detail-related-grid">
                {related.map((p) => (
                  <button
                    key={p.id}
                    className="detail-related-card"
                    onClick={() => onSelect?.(p)}
                    aria-label={`View ${p.name}`}
                  >
                    <div>
                      <ProductImage product={p} loading="lazy" />
                      <span>
                        <ArrowUpRight size={17} />
                      </span>
                    </div>
                    <small>{p.ramen?.brand || p.category}</small>
                    <strong>{p.name}</strong>
                    <b>{p.price > 0 ? money(p.price) : "Price pending"}</b>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
