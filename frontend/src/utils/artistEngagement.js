export const formatArtistRating = (rating) => {
  const value = Number(rating);
  return (Number.isFinite(value) ? value : 0).toFixed(1);
};
