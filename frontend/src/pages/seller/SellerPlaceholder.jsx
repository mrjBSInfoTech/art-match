import { Helmet } from "react-helmet-async";
import { Box, Typography } from "@mui/material";

export default function SellerPlaceholder({ title, description }) {
  return (
    <>
      <Helmet>
        <title>{title} | Red Nexus Seller</title>
      </Helmet>
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 320,
          p: 3,
        }}
      >
        <Typography variant="h6" color="text.secondary" textAlign="center">
          {description || `${title} — content coming soon.`}
        </Typography>
      </Box>
    </>
  );
}
