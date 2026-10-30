import React from "react";
import { Box, Typography } from "@mui/material";
import { formatCurrency } from "./orderPresentation.js";
import { getShipmentCourier } from "../../../utils/shipmentCouriers.js";

export default function OrderReceipt({
  selectedOrder,
  parcelHandlingOptions = [],
}) {
  if (!selectedOrder) return null;

  return (
    <>
      <style>{`
        @media screen {
          .seller-parcel-label {
            display: none !important;
          }
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          body * {
            visibility: hidden !important;
          }
          .seller-parcel-label,
          .seller-parcel-label * {
            visibility: visible !important;
          }
          .seller-parcel-label {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: 4in !important;
            padding: 0.2in !important;
            background: #fff !important;
            color: #000 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            z-index: 999999 !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .seller-parcel-label * {
            color: #000 !important;
          }
        }
      `}</style>
      <Box component="section" className="seller-parcel-label" aria-label="Printable parcel label">
        {/* Header: ARTMATCH · PARCEL LABEL & Order ID */}
        <Box sx={{ borderBottom: "3px solid #000", pb: 1, mb: 1.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Typography component="p" sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2 }}>
              ARTMATCH · RECEIPT
            </Typography>
            <Typography component="p" sx={{ fontSize: 9.5, fontWeight: 700, color: "#444" }}>
              {selectedOrder.date ? new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).format(new Date(selectedOrder.date)) : ""}
            </Typography>
          </Box>
          <Typography component="p" sx={{ mt: 0.5, fontSize: 26, fontWeight: 900, letterSpacing: -0.5 }}>
            {selectedOrder.id || selectedOrder.orderNumber}
          </Typography>
        </Box>

        {/* SHIP TO section */}
        <Box sx={{ pb: 1.25, borderBottom: "1px solid #777", mb: 1.25 }}>
          <Typography component="p" sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.8 }}>
            SHIP TO
          </Typography>
          <Typography component="p" sx={{ mt: 0.3, fontSize: 17, fontWeight: 900, overflowWrap: "anywhere" }}>
            {selectedOrder.customer || "Buyer"}
          </Typography>
          <Typography component="p" sx={{ mt: 0.5, fontSize: 12, lineHeight: 1.4, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {selectedOrder.address || "No address provided"}
          </Typography>
          <Typography component="p" sx={{ mt: 0.5, fontSize: 12, fontWeight: 700 }}>
            Phone: {selectedOrder.phone || selectedOrder.buyerPhone || "0000000000"}
          </Typography>
        </Box>

        {/* FROM section */}
        <Box sx={{ pb: 1.25, borderBottom: "1px solid #777", mb: 1.25 }}>
          <Typography component="p" sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.8 }}>
            FROM
          </Typography>
          <Typography component="p" sx={{ mt: 0.3, fontSize: 13.5, fontWeight: 800 }}>
            {selectedOrder.sellerName || selectedOrder.items?.[0]?.artist || "Sidharta Dasi Agpaua"}
          </Typography>
        </Box>

        {/* SHIPPING & TRACKING DETAILS */}
        {(selectedOrder.courier || selectedOrder.trackingNumber || selectedOrder.deliveryMethod) && (
          <Box sx={{ pb: 1.25, borderBottom: "1px solid #777", mb: 1.25 }}>
            <Typography component="p" sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.8, mb: 0.3 }}>
              SHIPPING & COURIER DETAILS
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.5, fontSize: 11 }}>
              <Typography component="p" sx={{ fontSize: 11 }}>
                <strong>Delivery:</strong> {selectedOrder.deliveryMethod === "pickup" ? "Store Pickup" : "Door-to-Door"}
              </Typography>
              <Typography component="p" sx={{ fontSize: 11 }}>
                <strong>Courier:</strong> {getShipmentCourier(selectedOrder.courier)?.label || selectedOrder.courier || "Standard Delivery"}
              </Typography>
              {selectedOrder.trackingNumber && (
                <Typography component="p" sx={{ fontSize: 11, gridColumn: "1 / -1" }}>
                  <strong>Tracking No.:</strong> {selectedOrder.trackingNumber}
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* PARCEL CONTENTS & ORDER SPECIFICS */}
        <Box sx={{ pb: 1.25, borderBottom: "1px solid #777", mb: 1.25 }}>
          <Typography component="p" sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.8, mb: 0.4 }}>
            PARCEL CONTENTS & ORDER BREAKDOWN
          </Typography>
          {(selectedOrder.items || []).map((item) => (
            <Box key={`${selectedOrder.id}-${item.id}`} sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mt: 0.4, fontSize: 11.5 }}>
              <Typography component="p" sx={{ fontSize: 11.5, fontWeight: 600 }}>
                {item.title} <span style={{ fontWeight: 400, color: "#444" }}>(Qty: {item.qty})</span>
              </Typography>
              <Typography component="p" sx={{ fontSize: 11.5, fontWeight: 700 }}>
                {formatCurrency((Number(item.price) || 0) * (Number(item.qty) || 1))}
              </Typography>
            </Box>
          ))}

          {/* Summary line items */}
          <Box sx={{ mt: 1, pt: 0.75, borderTop: "1px dashed #aaa", fontSize: 11 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography component="span" sx={{ fontSize: 11, color: "#444" }}>Total Qty:</Typography>
              <Typography component="span" sx={{ fontSize: 11, fontWeight: 600 }}>
                {(selectedOrder.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0)} items
              </Typography>
            </Box>
            {Number(selectedOrder.shipping) > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.25 }}>
                <Typography component="span" sx={{ fontSize: 11, color: "#444" }}>Shipping Fee:</Typography>
                <Typography component="span" sx={{ fontSize: 11 }}>{formatCurrency(selectedOrder.shipping)}</Typography>
              </Box>
            )}
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.4, pt: 0.4, borderTop: "1px solid #777" }}>
              <Typography component="span" sx={{ fontSize: 12, fontWeight: 800 }}>Total Amount:</Typography>
              <Typography component="span" sx={{ fontSize: 13, fontWeight: 900 }}>
                {formatCurrency(selectedOrder.total)}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* DATES & POLICY INFO */}
        <Box sx={{ pb: 1, borderBottom: "1px solid #777", mb: 1.25, fontSize: 10.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography component="span" sx={{ fontSize: 10.5, color: "#444" }}>Order Date:</Typography>
            <Typography component="span" sx={{ fontSize: 10.5, fontWeight: 600 }}>
              {selectedOrder.date ? new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).format(new Date(selectedOrder.date)) : "N/A"}
            </Typography>
          </Box>
          {selectedOrder.deliveredAt && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.25 }}>
              <Typography component="span" sx={{ fontSize: 10.5, color: "#444" }}>Date Received:</Typography>
              <Typography component="span" sx={{ fontSize: 10.5, fontWeight: 600 }}>
                {new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(selectedOrder.deliveredAt))}
              </Typography>
            </Box>
          )}
          {selectedOrder.returnDeadline && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.25 }}>
              <Typography component="span" sx={{ fontSize: 10.5, color: "#444" }}>Return Deadline:</Typography>
              <Typography component="span" sx={{ fontSize: 10.5, fontWeight: 600 }}>
                {new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).format(new Date(selectedOrder.returnDeadline))}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Customer note if any */}
        {selectedOrder.note && (
          <Box sx={{ pb: 1, borderBottom: "1px solid #777", mb: 1.25 }}>
            <Typography component="p" sx={{ fontSize: 9.5, fontWeight: 800, color: "#555" }}>
              BUYER NOTE
            </Typography>
            <Typography component="p" sx={{ fontSize: 11, fontStyle: "italic", mt: 0.2 }}>
              &ldquo;{selectedOrder.note}&rdquo;
            </Typography>
          </Box>
        )}

        {/* HANDLE WITH CARE box */}
        {selectedOrder.handlingInstructions?.length > 0 && (
          <Box sx={{ border: "2px solid #000", p: 1, mb: 1.25 }}>
            <Typography component="p" sx={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.8 }}>
              HANDLE WITH CARE
            </Typography>
            {selectedOrder.handlingInstructions.map((instruction) => (
              <Typography key={instruction} component="p" sx={{ mt: 0.3, fontSize: 11, fontWeight: 700 }}>
                • {parcelHandlingOptions.find((option) => option.value === instruction)?.label || instruction}
              </Typography>
            ))}
          </Box>
        )}

        {/* Payment badge box */}
        <Box sx={{ border: "2px solid #000", py: 1, px: 1, textAlign: "center" }}>
          <Typography component="p" sx={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.5 }}>
            {String(selectedOrder.payment).toLowerCase() === "cod" ? "CASH ON DELIVERY (COD)" : "ONLINE PAYMENT (PAID)"}
          </Typography>
          {String(selectedOrder.payment).toLowerCase() === "cod" ? (
            <Typography component="p" sx={{ mt: 0.3, fontSize: 15, fontWeight: 900 }}>
              AMOUNT TO COLLECT: {formatCurrency(selectedOrder.total)}
            </Typography>
          ) : (
            <Typography component="p" sx={{ mt: 0.2, fontSize: 11, fontWeight: 700, color: "#333" }}>
              TOTAL AMOUNT: {formatCurrency(selectedOrder.total)}
            </Typography>
          )}
        </Box>
      </Box>
    </>
  );
}

