import { Helmet } from "react-helmet-async";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Chip,
  Container,
  Divider,
  Link,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import ReplayOutlinedIcon from "@mui/icons-material/ReplayOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";

const TERMS_SECTIONS = [
  {
    id: "accounts",
    icon: AccountCircleOutlinedIcon,
    title: "1. Account Eligibility & Student Verification",
    body: [
      "• Buyers must provide accurate contact and delivery information when registering an account.",
      "• Student Seller accounts are exclusively for enrolled fine arts, architecture, and design students verified via their official Certificate of Registration (COR) or institutional roster.",
      "• Bulk-imported student accounts are issued a temporary initial password and must complete first-login privacy consent and password setup before operating their storefront.",
    ],
  },
  {
    id: "intellectual-property",
    icon: PaletteOutlinedIcon,
    title: "2. Artwork Authenticity & Intellectual Property",
    body: [
      "• Student artists retain copyright and moral rights over their original creations unless explicitly transferred in writing.",
      "• Every listed piece must be the authentic work of the verified student seller. ArtMatch protects uploaded artwork previews using dynamic watermarking and signed image URLs.",
      "• Verified physical and digital purchases are issued a cryptographic Certificate of Authenticity (COA).",
    ],
  },
  {
    id: "orders-settlement",
    icon: LocalShippingOutlinedIcon,
    title: "3. Orders, Payments & Settlements",
    body: [
      "• Orders may be paid via supported online payment channels (e.g. PayMongo) or Cash on Delivery (COD) where available.",
      "• Seller earnings are held during the return window and released to verified payout destinations (such as GCash or local bank accounts) upon completed settlement validation.",
      "• Platform and payment processor fees are clearly itemized before order confirmation.",
    ],
  },
  {
    id: "return-policy",
    icon: ReplayOutlinedIcon,
    title: "4. Return, Replacement & Refund Policy",
    body: [
      "• 4-Day Return Window: Buyers may request a return within 4 calendar days (96 hours) from the recorded delivery timestamp. Once the return window elapses, the sale is final and seller payout eligibility begins.",
      "• Eligible Return Reasons: Returns are accepted for physical artworks that arrive damaged, missing parts, fundamentally not as described, or if the incorrect item was delivered. Photo or video evidence of the item and parcel packaging is required.",
      "• Return Workflow & Approval: Return requests are submitted through the buyer's order details. Sellers review the request within the platform. Once approved, the buyer provides shipping tracking details for the returned artwork.",
      "• Inspection & Refund Issuance: Upon verified receipt and condition inspection by the seller, the return is marked completed. For PayMongo transactions, refunds are processed back to the original payment source minus non-refundable payment processing fees (2% + ₱15.00).",
      "• Non-Returnable Items: Custom commissions, digital deliverables, and items damaged through buyer misuse, negligence, or alteration are not eligible for return.",
    ],
  },
  {
    id: "privacy-conduct",
    icon: SecurityOutlinedIcon,
    title: "5. Data Privacy & Acceptable Conduct",
    body: [
      "• All personal data processing is governed by our Privacy Policy in accordance with the Philippine Data Privacy Act of 2012 (RA 10173).",
      "• Fraudulent listings, harassment, or unauthorized scraping of artist works or personal data may result in account strikes or permanent suspension.",
    ],
  },
];

export default function TermsOfService() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        py: { xs: 4, md: 6 },
        px: { xs: 2, sm: 3 },
        bgcolor: theme.palette.background.default,
        minHeight: "80vh",
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Terms of Service</title>
      </Helmet>

      <Container maxWidth="md">
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 3,
            borderColor: theme.palette.divider,
            bgcolor: theme.palette.background.paper,
          }}
        >
          <Stack spacing={3}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={1.5}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "rgba(220, 59, 56, 0.1)",
                    color: "#dc3b38",
                  }}
                >
                  <GavelOutlinedIcon />
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: 24, sm: 30 } }}>
                    Terms of Service
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Platform Rules, Artist Rights, and Marketplace Conditions
                  </Typography>
                </Box>
              </Stack>

              <Chip
                label="Version 1.0"
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: "rgba(220, 59, 56, 0.1)",
                  color: "#dc3b38",
                }}
              />
            </Stack>

            <Divider />

            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              By creating an account or using ArtMatch ("Red Nexus"), you agree to abide by these Terms
              of Service and acknowledge our data processing practices described in our Privacy Policy.
            </Typography>

            <Stack spacing={3}>
              {TERMS_SECTIONS.map((section) => {
                const IconComponent = section.icon;
                return (
                  <Box
                    key={section.id}
                    sx={{
                      p: 2.5,
                      borderRadius: 2.5,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
                      <IconComponent sx={{ color: "#dc3b38", fontSize: 22 }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 17 }}>
                        {section.title}
                      </Typography>
                    </Stack>
                    <Stack spacing={1}>
                      {section.body.map((paragraph, index) => (
                        <Typography
                          key={index}
                          variant="body2"
                          color="text.secondary"
                          sx={{ lineHeight: 1.7 }}
                        >
                          {paragraph}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>

            <Divider />

            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={1.5}
            >
              <Typography variant="caption" color="text.secondary">
                Effective Date: November 2026 • Version 1.0
              </Typography>
              <Stack direction="row" spacing={2}>
                <Link
                  component={RouterLink}
                  to="/buyer/privacy-policy"
                  underline="hover"
                  sx={{ fontWeight: 700, fontSize: 13, color: "#dc3b38" }}
                >
                  Privacy Policy (RA 10173)
                </Link>
                <Link
                  component={RouterLink}
                  to="/buyer/help-support"
                  underline="hover"
                  sx={{ fontWeight: 700, fontSize: 13, color: "#dc3b38" }}
                >
                  Help &amp; Support
                </Link>
              </Stack>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

