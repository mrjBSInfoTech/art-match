import { useEffect, useState } from "react";
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
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import YouTubeIcon from "@mui/icons-material/YouTube";
import { useThemeMode } from "../../theme/ThemeModeProvider";
import { fetchFooterContent } from "../../api/footerContentAPI";
import logo from "../../assets/Nexus.png";

const defaultFooterContent = {
  brandName: "RED NEXUS",
  description:
    "An e-commerce marketplace powered by the Central Academy of Fine Arts student community. Curating true creative expressions straight from the studio.",
  columns: [
    {
      title: "Acquire Art",
      links: [
        { label: "Paintings", url: "/buyer/shop" },
        { label: "Sculptures", url: "/buyer/shop/Sculpture" },
        { label: "Photography", url: "/buyer/shop/Photography" },
      ],
    },
    {
      title: "Programs",
      links: [
        { label: "Architecture", url: "/buyer/programs/architecture" },
        { label: "Interior Design", url: "/buyer/programs/interior-design" },
        { label: "Fine Arts", url: "/buyer/programs/fine-arts" },
      ],
    },
    {
      title: "Academy",
      links: [
        { label: "About CAFA", url: "/buyer/about" },
        { label: "Exhibitions Calendar", url: "/buyer/academy/exhibitions" },
        { label: "Support Desk", url: "/buyer/help-support" },
      ],
    },
  ],
  copyright:
    "© {year} CAFArtMart. Powered safely by Central Academy of Fine Arts.",
  socials: [
    { platform: "Twitter", url: "" },
    { platform: "Facebook", url: "" },
    { platform: "Instagram", url: "" },
  ],
};

const socialIcons = {
  Twitter: TwitterIcon,
  Facebook: FacebookIcon,
  Instagram: InstagramIcon,
  LinkedIn: LinkedInIcon,
  YouTube: YouTubeIcon,
};

const Footer = () => {
  const { theme } = useThemeMode();
  const [content, setContent] = useState(defaultFooterContent);
  const footerText = "#fff7f2";

  useEffect(() => {
    let active = true;
    fetchFooterContent()
      .then((savedContent) => {
        if (active) setContent(savedContent);
      })
      .catch((error) => {
        console.error("Unable to load saved footer content:", error.message);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Box
      component="footer"
      sx={{
        mt: 0,
        backgroundColor: theme.palette.background.footer,
        color: footerText,
        borderTop: "3px solid",
        borderColor: theme.palette.error.main,
      }}
    >
      <Container
        maxWidth="xl"
        sx={{ px: { xs: 2, sm: 4, lg: 6 }, py: { xs: 4, md: 6 } }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              sm: "minmax(0, 1fr) minmax(0, 1.5fr)",
              lg: "minmax(260px, 0.9fr) minmax(0, 2fr)",
            },
            gap: { xs: 4, sm: 4, lg: 8 },
          }}
        >
          <Box sx={{ maxWidth: 390, minWidth: 0 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 1.5 }}
            >
              <Box
                component="img"
                src={logo}
                alt={content.brandName}
                sx={{ width: 32, height: 38, objectFit: "contain" }}
              />
              <Typography
                sx={{
                  color: footerText,
                  fontWeight: 900,
                  fontSize: { xs: 17, sm: 18 },
                  letterSpacing: "-0.02em",
                }}
              >
                {content.brandName}
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              sx={{
                color: footerText,
                lineHeight: 1.7,
                maxWidth: 360,
                fontSize: { xs: "0.9rem", sm: "0.95rem" },
                opacity: 0.9,
              }}
            >
              {content.description}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
              },
              gap: { xs: 2.5, sm: 2, lg: 4 },
              minWidth: 0,
            }}
          >
            {content.columns.map((column, index) => (
              <Stack spacing={0.5} sx={{ minWidth: 0 }} key={`${column.title}-${index}`}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: footerText,
                    fontWeight: 800,
                    mb: 0.5,
                    fontSize: { xs: 14, sm: 15 },
                  }}
                >
                  {column.title}
                </Typography>
                {column.links.map((link, linkIndex) => (
                  <FooterLink
                    key={`${link.label}-${linkIndex}`}
                    to={link.url}
                    color={footerText}
                  >
                    {link.label}
                  </FooterLink>
                ))}
              </Stack>
            ))}
          </Box>
        </Box>

        <Divider
          sx={{ my: { xs: 3, md: 4 }, borderColor: "rgba(255,247,242,0.3)" }}
        />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={{ xs: 1.5, sm: 2 }}
        >
          <Typography
            variant="body2"
            sx={{
              color: "white",
              fontSize: { xs: 12, sm: 13 },
              lineHeight: 1.6,
              opacity: 0.9,
            }}
          >
            {content.copyright.replaceAll("{year}", String(new Date().getFullYear()))}
          </Typography>
          <Stack direction="row" spacing={0.75}>
            {content.socials.map((social, index) => {
              const SocialIcon = socialIcons[social.platform];
              if (!SocialIcon) return null;
              return (
                <IconButton
                  key={`${social.platform}-${index}`}
                  aria-label={social.platform}
                  component={social.url ? "a" : "button"}
                  href={social.url || undefined}
                  target={social.url ? "_blank" : undefined}
                  rel={social.url ? "noopener noreferrer" : undefined}
                  sx={{
                    color: footerText,
                    width: 44,
                    height: 44,
                    border: "1px solid rgba(255,247,242,0.25)",
                    "&:hover": {
                      backgroundColor: "rgba(255,247,242,0.12)",
                      borderColor: "rgba(255,247,242,0.6)",
                    },
                  }}
                >
                  <SocialIcon fontSize="small" />
                </IconButton>
              );
            })}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

const FooterLink = ({ to, children, color }) => {
  const isInternal = to.startsWith("/");
  return (
    <Typography
      component={isInternal ? Link : "a"}
      to={isInternal ? to : undefined}
      href={isInternal ? undefined : to}
      target={isInternal ? undefined : "_blank"}
      rel={isInternal ? undefined : "noopener noreferrer"}
      variant="body2"
      sx={{
        color,
        textDecoration: "none",
        display: "flex",
        alignItems: "center",
        minHeight: 44,
        opacity: 0.86,
        fontSize: { xs: "0.85rem", sm: "0.9rem" },
        lineHeight: 1.4,
        "&:hover": { opacity: 1, textDecoration: "underline" },
        "&:focus-visible": {
          outline: "2px solid currentColor",
          outlineOffset: 2,
          borderRadius: 1,
        },
      }}
    >
      {children}
    </Typography>
  );
};

export default Footer;
