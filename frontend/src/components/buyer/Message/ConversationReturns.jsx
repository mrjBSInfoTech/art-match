import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Stack, Typography } from "@mui/material";
import { fetchReturnRequests as fetchBuyerReturns } from "../../../api/buyer/returnAPI.js";
import { fetchReturnRequests as fetchSellerReturns } from "../../../api/seller/returnAPI.js";
import ReturnRequestCard from "./ReturnRequestCard.jsx";

export default function ConversationReturns({ conversationId, role, returnId, refreshVersion = 0 }) {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const fetchRequests = role === "buyer" ? fetchBuyerReturns : fetchSellerReturns;

  const reload = useCallback(async () => {
    try {
      const result = await fetchRequests(conversationId);
      setRequests(result || []);
      setError("");
    } catch (failure) {
      setError(failure.message || "Unable to load return requests");
    } finally {
      setLoading(false);
    }
  }, [conversationId, fetchRequests]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await fetchRequests(conversationId);
        if (!active) return;
        setRequests(result || []);
        setError("");
      } catch (failure) {
        if (active) setError(failure.message || "Unable to load return requests");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    // A small fallback keeps transactional status current after missed SSE events.
    const interval = window.setInterval(() => {
      if (!document.hidden) load();
    }, 15000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [conversationId, fetchRequests, refreshVersion]);

  const requestedReturnLoaded = requests.some((request) => String(request.return_request_id) === String(returnId));
  useEffect(() => {
    if (requestedReturnLoaded) document.getElementById(`return-${returnId}`)?.scrollIntoView({ block: "nearest" });
  }, [requestedReturnLoaded, returnId]);

  if (!requests.length && !error && !returnId) return null;

  return (
    <Stack spacing={1.5} sx={{ flexShrink: 0 }} aria-label="Order returns">
      {error && <Alert severity="error" action={<Button color="inherit" onClick={reload}>Retry</Button>}>{error}</Alert>}
      {loading && returnId && <Typography variant="body2" color="text.secondary">Loading return request...</Typography>}
      {!loading && !error && returnId && !requestedReturnLoaded && (
        <Alert severity="info">This return request is unavailable in this conversation.</Alert>
      )}
      {requests.map((request) => (
        <ReturnRequestCard key={request.return_request_id} request={request} role={role}
          highlighted={String(request.return_request_id) === String(returnId)} onUpdated={reload} />
      ))}
    </Stack>
  );
}
