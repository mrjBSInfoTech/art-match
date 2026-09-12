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
import PinterestIcon from "@mui/icons-material/Pinterest";

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        mt: 8,
      }}
    >
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={4}
          sx={{ justifyContent: "space-between" }}
        >
          <Box sx={{ maxWidth: 320 }}>
            <Typography
              variant="h6"
              sx={{ color: "primary.main", fontWeight: 700, mb: 1 }}
            >
              ArtMatch
            </Typography>
            <Typography variant="body2" color="text.secondary">
              A marketplace for original student artworks. Discover new voices,
              support emerging artists.
            </Typography>
          </Box>

          <Stack direction="row" spacing={6}>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Company</Typography>
              <FooterLink to="/about">About</FooterLink>
              <FooterLink to="/contact">Contact</FooterLink>
            </Stack>

            <Stack spacing={1}>
              <Typography variant="subtitle2">Legal</Typography>
              <FooterLink to="/privacy">Privacy Policy</FooterLink>
              <FooterLink to="/terms">Terms</FooterLink>
            </Stack>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle2">Follow</Typography>
            <Stack direction="row">
              <IconButton size="small" aria-label="Instagram">
                <InstagramIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" aria-label="Twitter">
                <TwitterIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" aria-label="Facebook">
                <FacebookIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" aria-label="Pinterest">
                <PinterestIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        </Stack>

        <Divider sx={{ my: 4 }} />

        <Typography variant="caption" color="text.secondary">
          © {new Date().getFullYear()} ArtMatch. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};

const FooterLink = ({ to, children }) => {
  return (
    <Typography
      component={Link}
      to={to}
      variant="body2"
      sx={{
        color: "text.secondary",
        textDecoration: "none",
        display: "block",
        "&:hover": { color: "primary.main" },
      }}
    >
      {children}
    </Typography>
  );
};

export default Footer;
