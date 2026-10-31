const createId = () => globalThis.crypto?.randomUUID?.()
  || `product-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function createEmptyProductOption() {
  return {
    id: createId(),
    name: "",
    description: "",
    quantity: "1",
    image: null,
    imageFile: null,
    imagePreview: null,
  };
}

export function getSavedProductOptions(artwork = {}) {
  let details = artwork.artwork_details;
  if (typeof details === "string") {
    try {
      details = JSON.parse(details);
    } catch {
      details = null;
    }
  }
  const options = Array.isArray(artwork.product_options)
    ? artwork.product_options
    : Array.isArray(details?.product_options) ? details.product_options : [];
  return options.map((option) => ({
    id: typeof option.id === "string" && option.id ? option.id : createId(),
    name: typeof option.name === "string" ? option.name : "",
    description: typeof option.description === "string" ? option.description : "",
    quantity: option.quantity ?? "1",
    image: typeof option.image === "string" ? option.image : null,
    imageFile: null,
    imagePreview: typeof option.image === "string" ? option.image : null,
    price: option.price,
  }));
}

export function getProductOptionsFromArtwork(artwork = {}) {
  const options = getSavedProductOptions(artwork);
  if (!options.length && String(artwork.art_type || "").trim().toLowerCase() === "product") {
    return [createEmptyProductOption(), createEmptyProductOption()];
  }
  return options;
}

export function getProductOptionsErrors(options, priceMode = "shared") {
  const errors = {};
  if (!Array.isArray(options) || options.length < 2) {
    errors.product_options = "Add at least two products.";
    return errors;
  }

  const seenNames = new Set();
  options.forEach((option, index) => {
    const optionErrors = {};
    const name = String(option.name || "").trim();
    const description = String(option.description || "").trim();
    const quantity = Number(option.quantity);
    if (!name) optionErrors.name = "Product name is required.";
    else if (name.length > 255) optionErrors.name = "Product name must be 255 characters or fewer.";
    else if (seenNames.has(name.toLowerCase())) optionErrors.name = "Product names must be unique.";
    if (name) seenNames.add(name.toLowerCase());
    if (!description) optionErrors.description = "Product description is required.";
    else if (description.length > 2000) optionErrors.description = "Description must be 2000 characters or fewer.";
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      optionErrors.quantity = "Enter a positive whole-number quantity.";
    }
    if (priceMode === "manual") {
      const price = String(option.price ?? "").trim();
      if (!/^\d+(?:\.\d{1,2})?$/.test(price) || Number(price) <= 0) {
        optionErrors.price = "Enter a price greater than zero with up to two decimal places.";
      }
    }
    if (option.imageError) optionErrors.image = option.imageError;
    if (Object.keys(optionErrors).length) errors[index] = optionErrors;
  });
  return errors;
}

export function getProductOptionsPayload(options, priceMode = "shared") {
  return options.map((option) => {
    const payload = { ...option };
    delete payload.imageFile;
    delete payload.imagePreview;
    delete payload.imageError;
    if (priceMode !== "manual") delete payload.price;
    return {
      ...payload,
      id: String(option.id || "").trim(),
      name: String(option.name || "").trim(),
      description: String(option.description || "").trim(),
      quantity: Number(option.quantity),
      image: option.image || null,
      ...(priceMode === "manual" ? { price: Number(option.price) } : {}),
    };
  });
}

export function getProductOptionsTotalQuantity(options) {
  return (Array.isArray(options) ? options : []).reduce((total, option) => {
    const quantity = Number(option.quantity);
    return Number.isSafeInteger(quantity) && quantity > 0 ? total + quantity : total;
  }, 0);
}

export function getSelectedProductsTotalQuantity(selections) {
  return (Array.isArray(selections) ? selections : []).reduce((total, selection) => {
    const quantity = Number(selection.quantity);
    return Number.isSafeInteger(quantity) && quantity > 0 ? total + quantity : total;
  }, 0);
}

export function getProductOptionsStartingPrice(options) {
  const startingPrice = (Array.isArray(options) ? options : []).reduce((minimum, option) => {
    const price = Number(option.price);
    return Number.isFinite(price) && price > 0 ? Math.min(minimum, price) : minimum;
  }, Number.POSITIVE_INFINITY);
  return Number.isFinite(startingPrice) ? startingPrice : "";
}