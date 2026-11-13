export const QUICK_RESPONSES = [
  "Thank you for your feedback and support!",
  "Thank you for taking the time to share your experience.",
  "We're glad you enjoyed the artwork. Thank you!",
];

export const formatReviewDate = (value) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
};

