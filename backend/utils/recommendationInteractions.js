import db from "../database/db.js";

const cleanText = (value, maxLength) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text.slice(0, maxLength) : null;
};

export const getRecommendationSessionIdFromRequest = (req) =>
  cleanText(req.get("x-recommendation-session"), 100);

export const recordRecommendationInteraction = async ({
  executor = db.promise(),
  customerId = null,
  artworkId = null,
  sessionId = null,
  eventType,
  searchQuery = null,
  filterType = null,
  filterValue = null,
  minPrice = null,
  maxPrice = null,
  sourcePage = null,
}) => {
  const normalizedCustomerId =
    Number.isInteger(Number(customerId)) && Number(customerId) > 0
      ? Number(customerId)
      : null;

  const normalizedArtworkId =
    Number.isInteger(Number(artworkId)) && Number(artworkId) > 0
      ? Number(artworkId)
      : null;

  const normalizedSessionId = cleanText(sessionId, 100);
  const normalizedEventType = cleanText(eventType, 32);

  if (!normalizedCustomerId && !normalizedSessionId) {
    return null;
  }

  if (!normalizedEventType) {
    throw new Error("eventType is required");
  }

  const sql = `
    INSERT INTO recommendation_interaction
      (
        customer_id,
        artwork_id,
        session_id,
        event_type,
        search_query,
        filter_type,
        filter_value,
        min_price,
        max_price,
        source_page
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await executor.query(sql, [
    normalizedCustomerId,
    normalizedArtworkId,
    normalizedSessionId,
    normalizedEventType,
    cleanText(searchQuery, 255),
    cleanText(filterType, 50),
    cleanText(filterValue, 255),
    minPrice === undefined || minPrice === null ? null : Number(minPrice),
    maxPrice === undefined || maxPrice === null ? null : Number(maxPrice),
    cleanText(sourcePage, 100),
  ]);

  return result.insertId;
};