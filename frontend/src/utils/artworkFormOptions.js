import { ART_TYPES } from "../constants/artworkOptions.js";

export function getArtworkFormOptions(artType) {
  const type = String(artType || "").trim().toLowerCase();
  if (!ART_TYPES.some((option) => option.toLowerCase() === type)) return null;
  if (type === "mixed media") {
    return {
      product: "",
      productOptions: [
        { value: "painting", label: "Flat / 2D artwork" },
        { value: "3d_object", label: "3D object" },
      ],
    };
  }
  if (type === "digital") {
    return { product: "painting", sizeLabel: "Digital dimensions", sizeHint: "Width × height in pixels, e.g. 3000 × 2000 px" };
  }
  if (["painting", "architecture", "photography", "print"].includes(type)) {
    return {
      product: ["photography", "print"].includes(type) ? "image" : "painting",
      sizeLabel: type === "photography" ? "Photo dimensions" : "Artwork dimensions",
      sizeHint: type === "photography"
        ? "Width × height with units, e.g. 3000 × 2000 px or 30 × 20 cm"
        : "Width × height with units, e.g. 30 × 40 cm",
    };
  }
  return {
    product: "3d_object", sizeLabel: "Object dimensions",
    sizeHint: "Width × height × depth with units, e.g. 20 × 30 × 15 cm",
  };
}

export function changeArtworkFormField(previous, name, value) {
  if (previous[name] === value) return previous;
  if (name === "art_type") {
    return { ...previous, art_type: value, product: getArtworkFormOptions(value)?.product || "", art_size: "", genre: "" };
  }
  if (name === "product") {
    return { ...previous, product: value, art_size: "", genre: "" };
  }
  return { ...previous, [name]: value };
}
