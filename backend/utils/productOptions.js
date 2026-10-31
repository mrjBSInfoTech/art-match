export class ProductOptionsError extends Error {
  constructor(message) {
    super(message);
    this.name = "ProductOptionsError";
    this.status = 400;
  }
}

export const parseArtworkDetails = (details) => {
  if (typeof details === "string") {
    try {
      return JSON.parse(details) || {};
    } catch {
      return {};
    }
  }
  return details && typeof details === "object" && !Array.isArray(details) ? details : {};
};

export const getProductOptions = (details) => {
  const parsed = parseArtworkDetails(details);
  return parsed.product_price_mode && Array.isArray(parsed.product_options)
    ? parsed.product_options
    : [];
};

export const validateProductOptionSelections = (rawSelections, options, priceMode, artworkPrice) => {
  if (!Array.isArray(rawSelections) || !rawSelections.length) {
    throw new ProductOptionsError("Select at least one product option.");
  }
  const optionMap = new Map(options.map((option) => [String(option.id), option]));
  const seen = new Set();
  return rawSelections.map((selection) => {
    const id = typeof selection?.id === "string" ? selection.id.trim() : "";
    const quantity = Number(selection?.quantity);
    if (!id || seen.has(id) || !Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new ProductOptionsError("Product selections must have unique valid option ids and positive whole-number quantities.");
    }
    const option = optionMap.get(id);
    if (!option) throw new ProductOptionsError("A selected product option is no longer available.");
    const availableQuantity = Number(option.remaining_stock ?? option.quantity);
    if (!Number.isSafeInteger(availableQuantity) || availableQuantity < 0 || quantity > availableQuantity) {
      throw new ProductOptionsError(`${option.name} has only ${Math.max(0, availableQuantity || 0)} available.`);
    }
    seen.add(id);
    const price = priceMode === "manual" ? Number(option.price) : Number(artworkPrice);
    if (!Number.isFinite(price) || price <= 0) {
      throw new ProductOptionsError("A selected product option has an invalid price.");
    }
    return {
      id,
      name: option.name,
      description: option.description || "",
      image: option.image || null,
      quantity,
      unit_price: price,
      remaining_stock: availableQuantity,
    };
  });
};

export const calculateProductOptionsTotal = (selections) =>
  selections.reduce((sum, option) => sum + Number(option.unit_price) * Number(option.quantity), 0);

export const summarizeProductOptionSelections = (details, rawSelections, artworkPrice) => {
  const parsedDetails = parseArtworkDetails(details);
  const options = getProductOptions(parsedDetails);
  if (!options.length) return null;
  const selections = validateProductOptionSelections(
    rawSelections,
    options,
    parsedDetails.product_price_mode,
    artworkPrice,
  );
  const quantity = selections.reduce((sum, option) => sum + option.quantity, 0);
  const total = calculateProductOptionsTotal(selections);
  if (!Number.isSafeInteger(quantity) || !Number.isFinite(total) || total <= 0) {
    throw new ProductOptionsError("Product selections have an invalid quantity or total.");
  }
  return { selections, quantity, total };
};

export const normalizeProductDetails = (details) => {
  const mode = details?.product_price_mode;
  const options = details?.product_options;
  if (!["shared", "manual"].includes(mode)) {
    throw new ProductOptionsError('Product price mode must be "shared" or "manual".');
  }
  if (!Array.isArray(options) || options.length < 2) {
    throw new ProductOptionsError("A Product artwork must have at least two purchasable options.");
  }
  const seen = new Set();
  const normalizedOptions = options.map((option) => {
    const id = typeof option?.id === "string" ? option.id.trim() : "";
    const name = typeof option?.name === "string" ? option.name.trim() : "";
    const description = typeof option?.description === "string" ? option.description.trim() : "";
    if (!id || id.length > 100 || seen.has(id)) {
      throw new ProductOptionsError("Each product option must have a unique id.");
    }
    if (!name || name.length > 255 || !description || description.length > 2000) {
      throw new ProductOptionsError("Each product option needs a valid name and description.");
    }
    if (option.image !== null && option.image !== undefined &&
        (typeof option.image !== "string" || option.image.length > 255 ||
         option.image.includes("/") || option.image.includes("\\"))) {
      throw new ProductOptionsError("A product option image must be a URL or null.");
    }
    const quantity = Number(option.quantity);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new ProductOptionsError("Each product option quantity must be a positive whole number.");
    }
    const normalized = { id, name, description, image: option.image || null, quantity };
    if (mode === "manual") {
      const price = Number(option.price);
      if (!Number.isFinite(price) || price <= 0 || !/^\d+(?:\.\d{1,2})?$/.test(String(option.price))) {
        throw new ProductOptionsError("Each manually priced product option needs a positive price with at most two decimal places.");
      }
      normalized.price = price;
    } else if (option.price !== undefined) {
      const price = Number(option.price);
      if (!Number.isFinite(price) || price <= 0) {
        throw new ProductOptionsError("Product option prices must be positive when provided.");
      }
      normalized.price = price;
    }
    seen.add(id);
    return normalized;
  });
  return { ...details, product_price_mode: mode, product_options: normalizedOptions };
};
