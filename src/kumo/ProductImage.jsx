import React, { useState } from "react";
import images from "../../catalogue/ramen-images.json";

const byId = new Map(images.map((item) => [item.catalogue_id, item]));
const bySlug = new Map(images.map((item) => [item.slug, item]));
const byName = new Map(images.map((item) => [item.name.toLowerCase().trim(), item]));
export function productMedia(product) {
  const entry =
    byId.get(product.ramen?.catalogue_id) ||
    bySlug.get(product.ramen?.slug) ||
    byName.get(product.name?.toLowerCase().trim());
  if (entry) {
    const custom =
      product.ramen?.image && ![entry.image, entry.fallback].includes(product.ramen.image);
    return {
      ...entry,
      status: custom ? "custom" : entry.status,
      image: custom ? product.ramen.image : entry.image,
      alt: custom ? product.ramen.image_alt || product.name : entry.alt,
      credit: custom
        ? product.ramen.image_credit?.for_image === product.ramen.image
          ? product.ramen.image_credit
          : null
        : entry.status === "verified_photo"
          ? entry
          : null,
    };
  }
  const legacy = product.category === "Ramen" && /images\.unsplash\.com/.test(product.image || "");
  const slug = product.name
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const knownLegacy = ["nissin-spicy-miso-ramen", "tokyo-shoyu-ramen"].includes(slug);
  return {
    image: legacy
      ? knownLegacy
        ? `/products/ramen/legacy-${slug}.svg`
        : "/products/image-unavailable.svg"
      : product.image,
    fallback: "/products/image-unavailable.svg",
    alt: product.name,
    status: legacy ? "placeholder" : "existing",
  };
}

export default function ProductImage({ product, ...props }) {
  const media = productMedia(product);
  const [failed, setFailed] = useState(null);
  return (
    <img
      {...props}
      src={failed === media.image ? media.fallback : media.image}
      alt={
        failed === media.image
          ? product.name + " - image unavailable; branded placeholder"
          : media.alt
      }
      onError={() => setFailed(media.image)}
    />
  );
}

export function ImageCredit({ product }) {
  const media = productMedia(product);
  const credit = media.credit;
  if (!credit?.source_url || !credit.license_url)
    return media.status === "placeholder" ? (
      <p className="image-credit">Product photo unavailable; branded placeholder.</p>
    ) : null;
  return (
    <p className="image-credit">
      Photo: {credit.author} /{" "}
      <a href={credit.source_url} target="_blank" rel="noreferrer">
        {credit.source_name || "Open Food Facts"}
      </a>{" "}
      ·{" "}
      <a href={credit.license_url} target="_blank" rel="noreferrer">
        {credit.license}
      </a>
      . Cropped/optimized; shared under the same licence. No endorsement implied.
    </p>
  );
}
