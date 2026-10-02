const REVIEWS_STORAGE_KEY = "artmatch_artwork_reviews";

export const getArtworkReviews = () => {
  try {
    const storedReviews = JSON.parse(
      localStorage.getItem(REVIEWS_STORAGE_KEY) || "[]",
    );
    return Array.isArray(storedReviews) ? storedReviews : [];
  } catch {
    return [];
  }
};

export const saveArtworkReview = (review) => {
  const reviews = getArtworkReviews();
  const updatedReviews = [review, ...reviews];
  localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(updatedReviews));
  window.dispatchEvent(new Event("artwork-reviews-updated"));
  return updatedReviews;
};