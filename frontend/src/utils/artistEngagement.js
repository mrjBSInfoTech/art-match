export const formatArtistRating = (rating) => {
  const value = Number(rating);
  return (Number.isFinite(value) ? value : 0).toFixed(1);
};

export const buildArtistRatingMap = (summaries = []) =>
  new Map(
    (Array.isArray(summaries) ? summaries : []).map((summary) => {
      const value = Number(summary?.averageRating);
      return [
        String(summary?.student_id),
        Number.isFinite(value) ? value : 0,
      ];
    }),
  );
