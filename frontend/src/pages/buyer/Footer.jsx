// src/components/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Stack,
  IconButton,
  Divider,
} from "@mui/material";
import InstagramIcon from "@mui/icons-material/Instagram";
import TwitterIcon from "@mui/icons-material/Twitter";
import FacebookIcon from "@mui/icons-material/Facebook";
import { useThemeMode } from "../../theme/ThemeModeProvider";
import logo from "../../assets/Nexus.png";

const Footer = () => {
  const { theme } = useThemeMode();
  const footerText = "#fff7f2";

  return (
    <Box
      component="footer"
      sx={{
        mt: 0,
        backgroundColor: theme.palette.background.footer,
        color: footerText,
      }}
    >
      <Container maxWidth="xl" sx={{ px: { xs: 3, sm: 5, lg: 7 }, py: { xs: 5, md: 7 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 4, sm: 5, lg: 10 }}
          sx={{ justifyContent: "space-between" }}
        >
          <Box sx={{ maxWidth: 330, flex: "1 1 30%" }}>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 2 }}>
              <Box
                component="img"
                src={logo}
                alt="Red Nexus"
                sx={{ width: 23, height: 30, objectFit: "contain"}}
              />
              <Typography sx={{ color: footerText, fontWeight: 800, fontSize: 16 }}>
                RED NEXUS
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: footerText, lineHeight: 1.5, maxWidth: 310 }}>
              An e-commerce marketplace powered by the Central Academy of Fine Arts student community. Curating true creative expressions straight from the studio.
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 3, sm: 7, lg: 12 }} sx={{ flex: "1 1 55%" }}>
            <Stack spacing={1.25} sx={{ minWidth: 120 }}>
              <Typography variant="subtitle2" sx={{ color: footerText, fontWeight: 800, mb: 0.5 }}>
                Acquire Art
              </Typography>
              <FooterLink to="/buyer/artwork" color={footerText}>Paintings</FooterLink>
              <FooterLink to="/buyer/artwork/Sculpture" color={footerText}>Sculptures</FooterLink>
              <FooterLink to="/buyer/artwork/Photography" color={footerText}>Photography</FooterLink>
            </Stack>

            <Stack spacing={1.25} sx={{ minWidth: 120 }}>
              <Typography variant="subtitle2" sx={{ color: footerText, fontWeight: 800, mb: 0.5 }}>
                Programs
              </Typography>
              <FooterLink to="/buyer/programs/architecture" color={footerText}>Architecture</FooterLink>
              <FooterLink to="/buyer/programs/interior-design" color={footerText}>Interior Design</FooterLink>
              <FooterLink to="/buyer/programs/fine-arts" color={footerText}>Fine Arts</FooterLink>
            </Stack>

            <Stack spacing={1.25} sx={{ minWidth: 120 }}>
              <Typography variant="subtitle2" sx={{ color: footerText, fontWeight: 800, mb: 0.5 }}>
                Academy
              </Typography>
              <FooterLink to="/buyer/about" color={footerText}>About CAFA</FooterLink>
              <FooterLink to="/buyer/academy/exhibitions" color={footerText}>Exhibitions Calendar</FooterLink>
              <FooterLink to="/buyer/academy/inquiries" color={footerText}>Vocation &amp; Inquiries</FooterLink>
              <FooterLink to="/buyer/help-support" color={footerText}>Support Desk</FooterLink>
            </Stack>
          </Stack>
        </Stack>

        <Divider sx={{ my: { xs: 4, md: 5 }, borderColor: "rgba(255,247,242,0.65)" }} />

        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2}>
          <Typography variant="caption" sx={{ color: "white" }}>
            © {new Date().getFullYear()} CAFArtMart. Powered safely by Central Academy of Fine Arts.
          </Typography>
          <Stack direction="row" spacing={1}>
            <IconButton size="small" aria-label="Twitter" sx={{ color: footerText }}>
              <TwitterIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label="Facebook" sx={{ color: footerText }}>
              <FacebookIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label="Instagram" sx={{ color: footerText }}>
              <InstagramIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

const FooterLink = ({ to, children, color }) => {
  return (
    <Typography
      component={Link}
      to={to}
      variant="body2"
      sx={{
        color,
        textDecoration: "none",
        display: "block",
        opacity: 0.86,
        "&:hover": { opacity: 1 },
      }}
    >
      {children}
    </Typography>
  );
};

export default Footer;
