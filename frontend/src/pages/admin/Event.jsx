import { Helmet } from "react-helmet-async";
import { Box, Tab, Tabs } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import PromotionHeader from "./PromotionHeader";
import PromotionSlides from "./PromotionSlides";

export default function Event() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab =
    searchParams.get("tab") === "header" ? "header" : "promotions";

  const handleTabChange = (_event, value) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value === "promotions") {
      nextParams.set("tab", "promotions");
    } else {
      nextParams.set("tab", value);
    }
    setSearchParams(nextParams);
  };

  return (
    <Box sx={{ minWidth: 0 }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>{activeTab === "header" ? "Promo Header" : "Promotion Slides"}</title>
      </Helmet>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        aria-label="Promotion settings"
        sx={{ mb: 2 }}
      >
        <Tab value="promotions" label="Promotion Slides" />
        <Tab value="header" label="Promo Header" />
      </Tabs>
      {activeTab === "header" ? <PromotionHeader /> : <PromotionSlides />}
    </Box>
  );
}
