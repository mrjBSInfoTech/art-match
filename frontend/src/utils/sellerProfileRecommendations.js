// Keep specialty ranking intact and reserve the final cards for buyer activity.
export function mergeSellerProfileRecommendations(sellerArtworks = [], buyerArtworks = []) {
  const seen = new Set();
  const result = [];
  const append = (items, limit, group) => {
    let added = 0;
    for (const artwork of items) {
      const id = artwork?.artwork_id ?? artwork?.id;
      if (!["number", "string"].includes(typeof id) || !/^\d+$/.test(String(id).trim())) continue;
      const artworkId = Number(id);
      if (!Number.isSafeInteger(artworkId) || artworkId <= 0 || seen.has(artworkId)) continue;
      seen.add(artworkId);
      result.push({ ...artwork, recommendation_group: group });
      added += 1;
      if (added === limit) break;
    }
  };
  append(sellerArtworks, 8, "seller_specialty");
  append(buyerArtworks, 4, "buyer_activity");
  return result;
}
