import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import SupportTopicDialog from "./SupportTopicDialog";

const SHIPPING_ITEMS = [
  {
    heading: "1. Door-to-Door Delivery & Campus Pickup",
    body: "Buyers can choose Door-to-Door courier delivery using their saved shipping address or select Campus Studio Pickup to collect artworks directly from the Central Academy of Fine Arts (CAFA) studio.",
  },
  {
    heading: "2. Mandatory Parcel Photo Verification",
    body: "Before an order can be marked as Shipped, student sellers are required to upload parcel condition photos and handling instructions (such as Fragile or Keep Dry) so you can verify how your artwork was packaged.",
  },
  {
    heading: "3. Live Courier Tracking & Delivery Proof",
    body: "Once shipped, your order details page displays the courier name, tracking number, and tracking link. Upon arrival, sellers record delivery proof photos and notes to confirm safe receipt.",
  },
  {
    heading: "4. 4-Day Inspection & Return Window",
    body: "You have 4 calendar days (96 hours) from the recorded delivery timestamp to inspect your artwork and request a return if it arrives damaged, missing components, or not as described.",
  },
];

export default function ShippingInfo({
  open,
  handleClose,
  showOrderTracking = true,
}) {
  return (
    <SupportTopicDialog
      open={open}
      handleClose={handleClose}
      titleId="shipping-info-title"
      icon={LocalShippingOutlinedIcon}
      title="Shipping, Delivery & Returns Guide"
      subtitle="How artworks are packed, tracked, delivered, and protected."
      items={SHIPPING_ITEMS}
      primaryAction={
        showOrderTracking
          ? { label: "Track My Orders", path: "/buyer/profile/orders" }
          : undefined
      }
      secondaryAction={{ label: "Terms & Return Policy", path: "/buyer/terms" }}
    />
  );
}
