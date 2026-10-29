export const SHIPMENT_COURIERS = [
  {
    value: "lalamove",
    label: "Lalamove",
    trackingNumberLabel: "",
    trackingUrl: "",
  },
  {
    value: "lbc",
    label: "LBC Express",
    trackingNumberLabel: "LBC Tracking Number",
    trackingUrl: "https://www.lbcexpress.com/track/",
  },
  {
    value: "jnt",
    label: "J&T Express",
    trackingNumberLabel: "J&T Waybill / Tracking Number",
    trackingUrl: "https://www.jtexpress.ph/trajectoryQuery?flag=1",
  },
  {
    value: "ninjavan",
    label: "Ninja Van",
    trackingNumberLabel: "Ninja Van Tracking ID",
    trackingUrl: "https://www.ninjavan.co/en-ph/tracking/",
  },
];

export const getShipmentCourier = (value) =>
  SHIPMENT_COURIERS.find((courier) => courier.value === value);
