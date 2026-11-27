import { useEffect, useState } from "react";
import { Box, useTheme } from "@mui/material";
import ArtworkCard from "../Artwork/ArtworkCard";
import { ArtworkCardSkeleton, SectionHeader } from "./MainSectionShared";
import { fetchRecommendedArtworks } from "../../../api/buyer/recommendationAPI";

export default function RecommendedSection({
    onAddToCart,
    onRemoveFromCart,
    cartArtworkIds = new Set(),
    topK = 4,
    refreshKey = 0,
}) {
    const theme = useTheme();
    const [artworks, setArtworks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reloadCount, setReloadCount] = useState(0);

    const warmSurface =
        theme.palette.mode === "light" ? "#fff9ef" : theme.palette.background.paper;

    // Refresh recommendations whenever the buyer updates their cart
    useEffect(() => {
        const handleUpdate = () => setReloadCount((count) => count + 1);
        window.addEventListener("cart-updated", handleUpdate);
        return () => window.removeEventListener("cart-updated", handleUpdate);
    }, []);

    // Load recommended artworks from the Item-Based Collaborative Filtering API
    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        const loadRecommendations = async () => {
            setLoading(true);
            try {
                const data = await fetchRecommendedArtworks(topK, {
                    signal: controller.signal,
                });
                if (!active) return;
                setArtworks(Array.isArray(data?.recommendations) ? data.recommendations : []);
            } catch {
                if (!active) return;
                setArtworks([]);
            } finally {
                if (active) setLoading(false);
            }
        };

        loadRecommendations();
        return () => {
            active = false;
            controller.abort();
        };
    }, [topK, refreshKey, reloadCount]);

    // If no recommendations are returned (or an error occurs), hide cleanly
    if (!loading && artworks.length === 0) {
        return null;
    }

    return (
        <Box
            sx={{
                px: { xs: 2, sm: 4, lg: 6 },
                py: { xs: 4, md: 6 },
                backgroundColor: warmSurface,
            }}
        >
            <SectionHeader
        title="Recommended For You"
        to="/buyer/shop?view=recommended"
      />
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "repeat(2, minmax(0, 1fr))",
                        sm: "repeat(2, minmax(0, 1fr))",
                        md: "repeat(4, minmax(0, 1fr))",
                        lg: "repeat(4, minmax(0, 1fr))",
                    },
                    gap: { xs: 1.25, sm: 2, md: 2.5 },
                }}
            >
                {loading
                    ? Array.from({ length: topK }).map((_, index) => (
                        <ArtworkCardSkeleton key={`recommended-skeleton-${index}`} />
                    ))
                    : artworks.map((artwork) => (
                        <ArtworkCard
                            key={artwork.artwork_id || artwork.id}
                            artwork={artwork}
                            onAddToCart={onAddToCart}
                            onRemoveFromCart={onRemoveFromCart}
                            isInCart={cartArtworkIds.has(
                                String(artwork.artwork_id || artwork.id),
                            )}
                        />
                    ))}
            </Box>
        </Box>
    );
}