import { Box, Button, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { formatPayoutCurrency, formatPayoutDate, payoutApprovalLabel, payoutDisplayStatus, payoutIdentifier, payoutStatusColor, payoutStatusMessage, payoutValue } from "./payoutDisplay";

export default function PayoutTable({ orders = [], admin = false, onReview }) {
  return <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
    <Box sx={{ px: 3, py: 2.5 }}>
      <Typography variant="h6" fontWeight={700}>Seller earnings and payouts</Typography>
      <Typography variant="body2" color="text.secondary">Buyer payment and seller payout are tracked separately. Eligibility never sends money automatically.</Typography>
    </Box>
    {orders.length === 0 ? <Box sx={{ p: 4, textAlign: "center" }}>
      <Typography color="text.secondary">No online-payment earnings to display.</Typography>
    </Box> : <TableContainer>
      <Table size="small" aria-label="Seller payout ledger" sx={{ minWidth: admin ? 850 : 750 }}>
        <TableHead sx={{ bgcolor: "action.hover" }}><TableRow>
          <TableCell>Order</TableCell>
          {admin && <TableCell>Seller</TableCell>}
          <TableCell>Buyer payment</TableCell>
          <TableCell align="right">Artwork total</TableCell>
          <TableCell align="right">Refunded</TableCell>
          <TableCell align="right">Seller payout</TableCell>
          <TableCell>Status</TableCell>
          {admin && <TableCell align="right">Action</TableCell>}
        </TableRow></TableHead>
        <TableBody>{orders.map((payout) => <TableRow key={payoutIdentifier(payout)} hover sx={{ "& td": { py: 2, verticalAlign: "top" } }}>
          <TableCell>
            <Typography variant="body2" fontWeight={700}>{payout.orderNumber}</Typography>
            <Typography variant="caption" color="text.secondary" display="block">Order: {payout.status}</Typography>
            <Typography variant="caption" color="text.secondary" display="block">Payout eligible from: {formatPayoutDate(payout.eligibleAt)}</Typography>
          </TableCell>
          {admin && <TableCell>{payout.sellerName || `Seller ${payout.sellerId}`}</TableCell>}
          <TableCell><Chip size="small" variant="outlined" label={payout.paymentStatus || "Paid"} color={payout.paymentStatus === "Paid" ? "success" : "default"} /></TableCell>
          <TableCell align="right">{formatPayoutCurrency(payout.gross)}</TableCell>
          <TableCell align="right">{formatPayoutCurrency(payout.refundAmount)}</TableCell>
          <TableCell align="right" sx={{ fontWeight: 800 }}>{formatPayoutCurrency(payoutValue(payout))}</TableCell>
          <TableCell sx={{ maxWidth: 280 }}>
            <Chip size="small" label={payoutDisplayStatus(payout)} sx={{color:"#fff"}} color={payoutStatusColor[payout.payoutStatus] || "default"} />
            {payout.approval && !["Processing", "Paid", "Cancelled", "Reversed"].includes(payout.payoutStatus) && <Typography variant="caption" display="block" sx={{ mt: 0.75 }}>
              {!admin && payout.approval.status === "Approved" ? "Approved for payout" : payoutApprovalLabel(payout)}{payout.approval.status !== "Not Requested" && ` · ${payout.approval.approvalCount || 0} / ${payout.approval.requiredApprovals || 3} approvals`}
            </Typography>}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
              {payout.failureReason || payout.holdReason || payoutStatusMessage[payout.payoutStatus]}
            </Typography>
          </TableCell>
          {admin && <TableCell align="right"><Button size="small" variant="outlined" onClick={() => onReview(payout)}>Review</Button></TableCell>}
        </TableRow>)}</TableBody>
      </Table>
    </TableContainer>}
  </Paper>;
}
