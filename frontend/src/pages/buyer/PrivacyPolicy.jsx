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
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import GppGoodOutlinedIcon from "@mui/icons-material/GppGoodOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import AutoGraphOutlinedIcon from "@mui/icons-material/AutoGraphOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import ContactMailOutlinedIcon from "@mui/icons-material/ContactMailOutlined";

const POLICY_SECTIONS = [
  {
    id: "collection",
    icon: StorageOutlinedIcon,
    title: "1. Personal Information We Collect",
    body: [
      "In compliance with the Data Privacy Act of 2012 (Republic Act No. 10173), ArtMatch collects only personal data necessary to operate the academic art marketplace:",
      "• Buyer Accounts: Username, first and last name, email address, phone number, and delivery addresses required to fulfill and ship artwork orders.",
      "• Student Artist / Seller Accounts: Student number, full name, birthdate, institutional email, contact number, academic program, year level, and Certificate of Registration (COR) for enrollment verification.",
      "• Financial & Payout Information: Settlement bank or e-wallet account details for verified student sellers, which are encrypted at rest using AES-256-GCM authenticated encryption.",
      "• Institutional Bulk Import: For student cohorts onboarded via official institutional spreadsheets, files are processed strictly in browser memory and never stored as raw files on server disk.",
    ],
  },
  {
    id: "purpose",
    icon: AutoGraphOutlinedIcon,
    title: "2. Purpose of Processing & AI Recommendations",
    body: [
      "Your personal data is processed strictly for legitimate, specified purposes:",
      "• Account authentication, academic artist verification, and role-based access control.",
      "• Order fulfillment, payment settlement, Certificate of Authenticity (COA) issuance, and buyer-seller communication.",
      "• Personalized Discovery (SASRec): ArtMatch uses sequential interaction signals (searches, views, favorites, and cart activity) to recommend relevant artworks. Buyers may exercise their Right to Object to personalized profiling in their account settings.",
    ],
  },
  {
    id: "rights",
    icon: VerifiedUserOutlinedIcon,
    title: "3. Your Rights as a Data Subject (RA 10173, Sec. 16–18)",
    body: [
      "Under the Philippine Data Privacy Act of 2012, you are entitled to exercise the following rights at any time:",
      "• Right to Be Informed: To know how your personal data is collected, used, stored, and shared.",
      "• Right to Access & Rectification: To view and update your personal profile and contact details directly from your Account Settings.",
      "• Right to Object: To opt out of automated recommendation profiling or non-essential processing.",
      "• Right to Erasure or Blocking: To request the deactivation, blocking, or removal of your account and personal records.",
      "• Right to Data Portability: To request and download an electronic copy of your personal profile, orders, and artwork records.",
    ],
  },
  {
    id: "security",
    icon: GppGoodOutlinedIcon,
    title: "4. Security Measures & Data Retention",
    body: [
      "ArtMatch implements organizational, physical, and technical safeguards:",
      "• Cryptographic Protection: Passwords are salted and hashed using bcrypt. Payout destination numbers are encrypted at rest with AES-256-GCM, and direct messages support end-to-end encryption.",
      "• Access Control & Auditing: Administrative actions and sensitive operations are restricted via Role-Based Access Control (RBAC) and recorded in immutable audit logs.",
      "• Semester Retention Lifecycle: Student seller accounts follow an academic term expiration schedule and automatically transition to expired status at the end of the term unless re-verified.",
    ],
  },
  {
    id: "dpo",
    icon: ContactMailOutlinedIcon,
    title: "5. Data Protection Officer & Breach Response",
    body: [
      "In accordance with NPC Circular No. 16-03, ArtMatch maintains a 72-hour security incident and personal data breach notification protocol to notify the National Privacy Commission (NPC) and affected data subjects in the event of a qualifying breach.",
      "For privacy inquiries, data subject access requests, or complaints, please reach out to our designated Data Protection team via Help & Support or email dpo@artmatch.edu.ph.",
    ],
  },
];

export default function PrivacyPolicy() {
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
        <title>Privacy Policy (RA 10173)</title>
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
                  <ShieldOutlinedIcon />
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: 24, sm: 30 } }}>
                    Privacy Policy
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Republic Act No. 10173 — Data Privacy Act of 2012 Compliance Notice
                  </Typography>
                </Box>
              </Stack>

              <Chip
                label="Policy Version 1.0"
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
              ArtMatch ("Red Nexus") is committed to protecting the fundamental human right of privacy
              of every student artist, buyer, and administrator using our platform, in strict adherence
              to the <strong>Philippine Data Privacy Act of 2012 (RA 10173)</strong> and its Implementing
              Rules and Regulations.
            </Typography>

            <Stack spacing={3}>
              {POLICY_SECTIONS.map((section) => {
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
                Effective Date: November 2026 • Policy Version 1.0
              </Typography>
              <Stack direction="row" spacing={2}>
                <Link
                  component={RouterLink}
                  to="/buyer/terms"
                  underline="hover"
                  sx={{ fontWeight: 700, fontSize: 13, color: "#dc3b38" }}
                >
                  Terms of Service
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
