import React, { useEffect, useRef } from "react";
import { X, Plus } from "lucide-react";
import ProductImage, { ImageCredit } from "./ProductImage";
import { canAddToBag } from "@/lib/local-catalogue";

// Retain the existing product modal instead of introducing a new page architecture.
export default function ProductDetails({ product, money, onClose, onAdd }) {
  const close = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    close.current?.focus();
    const escape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("keydown", escape);
      previous?.focus?.();
    };
  }, [onClose]);
  const ramen = product.ramen;
  return (
    <div className="overlay modal-wrap" onClick={onClose}>
      <div
        className="product-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button ref={close} className="modal-close" aria-label="Close product" onClick={onClose}>
          <X />
        </button>
        <ProductImage className={ramen ? "ramen-detail-image" : undefined} product={product} />
        <div>
          <p className="eyebrow">{product.category} / CURATED IN JAPAN</p>
          <h2 id="product-detail-title">{product.name}</h2>
          <p>{product.subtitle}</p>
          {ramen ? (
            <>
              <p>
                {ramen.country} / {ramen.brand} / {ramen.flavor}
              </p>
              <p>
                Heat: {ramen.spicy_level}/5 · {ramen.unit}
              </p>
              <p className="jpy-reference">
                {new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(
                  ramen.price_jpy,
                )}{" "}
                — Estimated Japan retail price
              </p>
              <p>Availability: {ramen.availability.replaceAll("_", " ")}</p>
            </>
          ) : (
            <p>{product.size}</p>
          )}
          <h3>{product.price > 0 ? money(product.price) : "LKR selling price pending"}</h3>
          <ImageCredit product={product} />
          <p className="muted">
            Final stock and delivery are confirmed on WhatsApp. Japanese retail estimates are
            reference prices; orders use the LKR selling price.
          </p>
          <button
            className="primary"
            disabled={!canAddToBag(product)}
            onClick={() => onAdd(product)}
          >
            Add to bag <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
