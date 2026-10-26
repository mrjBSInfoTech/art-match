import { useRef, useState } from "react";
import {
  Box, Button, Chip, Link, Paper, Stack, Typography,
} from "@mui/material";
import {
  cancelReturnRequest, shipReturnRequest,
} from "../../../api/buyer/returnAPI.js";
import {
  approveReturnRequest, rejectReturnRequest, receiveReturnRequest,
} from "../../../api/seller/returnAPI.js";
import ReturnActionDialog from "./ReturnActionDialog.jsx";
import AssignmentReturnOutlinedIcon from "@mui/icons-material/AssignmentReturnOutlined";
import ArtworkImage from "../../common/ArtworkImage";

const statuses = {
  Requested: { label: "Awaiting seller", color: "warning" },
  Approved: { label: "Approved", color: "info" },
  Rejected: { label: "Rejected", color: "error" },
  "Return Shipped": { label: "Return shipped", color: "info" },
  Received: { label: "Received", color: "success" },
  Completed: { label: "Completed", color: "success" },
  Cancelled: { label: "Cancelled", color: "default" },
};

const dateLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
};

const safeWebUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};



export default function ReturnRequestCard({ request, role, highlighted = false, onUpdated }) {
  const [action, setAction] = useState("");
  const [response, setResponse] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlightRef = useRef(false);
  const [error, setError] = useState("");
  const status = statuses[request.status] || { label: request.status, color: "default" };
  const statusLabel = request.status === "Requested"
    ? role === "seller" ? "Awaiting your decision" : "Awaiting seller decision"
    : status.label;
  const validResponse = action !== "reject" || response.trim().length > 0;
  const validTracking = !trackingUrl.trim() || Boolean(safeWebUrl(trackingUrl.trim()));
  const tracking = safeWebUrl(request.return_tracking_url);

  const openAction = (nextAction) => {
    setError("");
    setResponse("");
    setTrackingUrl("");
    setAction(nextAction);
  };

  const submit = async () => {
    if (inFlightRef.current || busy || !validResponse || (action === "ship" && !validTracking)) return;
    inFlightRef.current = true;
    setBusy(true);
    setError("");
    try {
      const id = request.return_request_id;
      if (action === "approve") await approveReturnRequest(id, { seller_response: response.trim() });
      if (action === "reject") await rejectReturnRequest(id, { seller_response: response.trim() });
      if (action === "cancel") await cancelReturnRequest(id);
      if (action === "ship") await shipReturnRequest(id, {
        ...(trackingUrl.trim() ? { return_tracking_url: trackingUrl.trim() } : {}),
      });
      if (action === "receive") await receiveReturnRequest(id);
      setAction("");
      await onUpdated?.();
    } catch (failure) {
      setError(failure.message || "Unable to update this return");
      // Refresh after conflicts so actions follow the latest server state.
      if (failure.status === 409) await onUpdated?.();
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  };

  return (
    <Paper
      component="article"
      id={`return-${request.return_request_id}`}
      aria-label={`Return request for order ${request.order_number || request.order_id}`}
      elevation={0}
      sx={{
        p: 2, border: "1px solid", borderColor: highlighted ? "error.main" : "divider",
        borderRadius: 3, scrollMarginTop: 16, width: "100%", boxSizing: "border-box",
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
          <Box>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <AssignmentReturnOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={700}>Return request</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Order {request.order_number || `#${request.order_id}`}
            </Typography>
          </Box>
          <Chip size="small" label={statusLabel} sx={{color: "#fff",}} color={status.color} />
        </Stack>

        {(request.items || []).map((item) => (
          <Stack key={item.order_item_id} direction="row" spacing={1.5} alignItems="center">
            <ArtworkImage image={item.image} alt={item.title || "Artwork"}
              sx={{ width: 48, height: 48, borderRadius: 1, objectFit: "cover", flexShrink: 0 }} />
            <Box>
              <Typography variant="body2">{item.title || "Artwork"}</Typography>
              <Typography variant="caption" color="text.secondary">Quantity: {item.quantity}</Typography>
            </Box>
          </Stack>
        ))}

        <Box>
          <Typography variant="body2" fontWeight={600}>
            {(request.reason || "").replace(/_/g, " ")}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {request.details}
          </Typography>
        </Box>
        {request.seller_response && (
          <Box>
            <Typography variant="caption" color="text.secondary">Seller response</Typography>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {request.seller_response}
            </Typography>
          </Box>
        )}
        <Stack spacing={0.25}>
          {[
            ["Requested", request.requested_at],
            ["Decision", request.decision_at],
            ["Return shipped", request.return_shipped_at],
            ["Items received", request.received_at],
            ["Completed", request.completed_at],
          ].filter(([, value]) => value).map(([label, value]) => (
            <Typography key={label} variant="caption" color="text.secondary">{label}: {dateLabel(value)}</Typography>
          ))}
        </Stack>
        {tracking && (
          <Link href={tracking} target="_blank" rel="noopener noreferrer" variant="body2">
            Track return shipment
          </Link>
        )}
        {request.status === "Completed" && (
          <Typography variant="body2" color="text.secondary">
            The seller confirmed receipt of the returned artwork.
          </Typography>
        )}
        {request.status === "Approved" && (
          <Typography variant="body2" color="text.secondary">
            Arrange the return delivery with the seller, then mark the items as shipped.
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          Return requests must be submitted within 7 days of delivery. Approval and receipt do not issue a refund automatically; arrange any refund separately.
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {role === "seller" && request.status === "Requested" && (
            <>
              <Button size="small" variant="contained" sx={{color: "#fff",}} onClick={() => openAction("approve")}>Approve Return</Button>
              <Button size="small" color="error" onClick={() => openAction("reject")}>Reject return</Button>
            </>
          )}
          {role === "buyer" && request.status === "Requested" && (
            <Button size="small" color="error" onClick={() => openAction("cancel")}>Cancel Request</Button>
          )}
          {role === "buyer" && request.status === "Approved" && (
            <Button size="small" variant="contained" sx={{color:"#fff"}} onClick={() => openAction("ship")}>Mark return shipped</Button>
          )}
          {role === "seller" && request.status === "Return Shipped" && (
            <Button size="small" variant="contained" sx={{color:"#fff"}} onClick={() => openAction("receive")}>Confirm items received</Button>
          )}
        </Stack>
      </Stack>
      <ReturnActionDialog requestId={request.return_request_id} action={action} response={response} trackingUrl={trackingUrl}
        busy={busy} error={error} validResponse={validResponse} validTracking={validTracking}
        onResponseChange={setResponse} onTrackingChange={setTrackingUrl}
        onClose={() => !busy && setAction("")} onSubmit={submit} />
    </Paper>
  );
}
