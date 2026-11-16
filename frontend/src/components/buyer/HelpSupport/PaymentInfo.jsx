import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SupportTopicDialog from "./SupportTopicDialog";

const PAYMENT_ITEMS = [
  {
    heading: "1. Encrypted PayMongo Checkout",
    body: "Online payments are processed through PayMongo supporting GCash, Maya, QR Ph, and major cards. ArtMatch never stores your raw card numbers or e-wallet PINs.",
  },
  {
    heading: "2. Escrow Hold Until Delivery & Inspection",
    body: "Your payment is held securely while the artwork is prepared, shipped, and inspected. Seller payouts only become eligible after delivery is confirmed and the 4-day return window finishes with no unresolved disputes.",
  },
  {
    heading: "3. Verified Listings & Certificate of Authenticity (COA)",
    body: "Every listed artwork is reviewed by administrators before appearing in the shop. Completed purchases receive a cryptographic Certificate of Authenticity verifying the student artist and edition.",
  },
  {
    heading: "4. RA 10173 Data Privacy Protection",
    body: "Your account details, shipping addresses, and order history are protected in compliance with the Philippine Data Privacy Act of 2012 (RA 10173).",
  },
];

export default function PaymentInfo({ open, handleClose }) {
  return (
    <SupportTopicDialog
      open={open}
      handleClose={handleClose}
      titleId="payment-info-title"
      icon={LockOutlinedIcon}
      title="Payment Security & Buyer Protection"
      subtitle="How your payment, authenticity, and personal data are safeguarded."
      items={PAYMENT_ITEMS}
      primaryAction={{ label: "Privacy Policy (RA 10173)", path: "/buyer/privacy-policy" }}
      secondaryAction={{ label: "Terms of Service", path: "/buyer/terms" }}
    />
  );
}
