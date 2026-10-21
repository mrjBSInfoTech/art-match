const normalize = (value) => String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");

// Return null for ordinary text queries so the shop can use text search.
export function matchTwoDimensionalType(artwork, query) {
  const selection = normalize(query);
  const isPainting = ["painting", "paintings"].includes(selection);
  const isImage = ["image", "images", "photo", "photos", "photograph", "photography"].includes(selection);
  if (!isPainting && !isImage) return null;

  const type = normalize(artwork.art_type);
  const product = normalize(artwork.product);
  if (["3d", "3d_object", "physical_art", "sculpture", "product", "mixed_media"].includes(type)
    || ["3d", "3d_object"].includes(product)) return false;

  if (isPainting) {
    return type === "painting" || (["", "physical", "2d_art"].includes(type) && product === "painting");
  }
  return ["photography", "photo", "image"].includes(type)
    || (["", "physical", "2d_art"].includes(type) && ["image", "photo", "photography"].includes(product));
}
