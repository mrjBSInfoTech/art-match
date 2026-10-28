export const formatPayoutCurrency = (value) => new Intl.NumberFormat("en-PH", {
  style: "currency", currency: "PHP",
}).format(Number(value || 0));

export const formatPayoutDate = (value) => {
  if (!value) return "Not yet available";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Not yet available" : date.toLocaleString("en-PH");
};

export const payoutErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

export const payoutStatusColor = {
  Held: "warning", Eligible: "info", Processing: "primary", Paid: "success", Failed: "error", Cancelled: "default", Reversed: "error",
};

export const payoutStatusMessage = {
  Held: "Your earnings remain held until delivery, the 7-day return period and any return or refund are resolved.",
  Eligible: "Your earnings are ready for administrator payout review.",
  Processing: "Your payout is being processed.",
  Paid: "Your payout has been completed.",
  Failed: "Your payout could not be completed. The administrator will review it.",
  Cancelled: "This payout is no longer payable.",
  Reversed: "This payout has been reversed.",
};

export const payoutValue = (payout) => payout?.payoutAmount ?? payout?.net ?? 0;
export const payoutIdentifier = (payout) => payout?.payoutId ?? payout?.splitId;
export const canSendPayout = (payout, capability) => payout?.payoutStatus === "Eligible" && capability?.enabled === true;
