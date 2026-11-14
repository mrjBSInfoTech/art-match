import React from "react";
import {
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  InputBase,
  Paper,
  Slider,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { COLOR_PALETTE } from "../../../utils/artworkColors";
import { PRICE_LIMIT, formatPriceRange } from "../../../utils/artworkPrice";

export default function MobileSearchFilterDrawer({
  open,
  onClose,
  inputRef,
  searchQuery,
  onSearchQueryChange,
  categoryGroups,
  draftCategories,
  draftPriceRange,
  onDraftPriceChange,
  onToggleCategory,
  onToggleColor,
  onClearPrice,
  onResetAll,
  onApply,
  hasAnyDraftFilters,
  draftFilterCount,
}) {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const hasDraftPrice =
    draftPriceRange[0] > 0 || draftPriceRange[1] < PRICE_LIMIT;
  const hasAnyActiveInput = Boolean(searchQuery.trim()) || hasAnyDraftFilters;

  const handleSubmit = (event) => {
    event.preventDefault();
    onApply();
  };

  return (
    <Drawer
      anchor="top"
      open={open}
      onClose={onClose}
      TransitionProps={{
        onEntered: () => {
          inputRef?.current?.focus();
        },
      }}
      PaperProps={{
        sx: {
          maxHeight: "92dvh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "0 0 20px 20px",
          backgroundColor: "background.paper",
          color: "text.primary",
          overflow: "hidden",
        },
      }}
    >
      {/* Top Bar: Title + Search Box */}
      <Box
        sx={{
          px: 2,
          pt: 1.5,
          pb: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: "background.paper",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1.25 }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <TuneRoundedIcon sx={{ fontSize: 20, color: "error.main" }} />
            <Typography sx={{ fontSize: 16, fontWeight: 800 }}>
              Search &amp; Filter
            </Typography>
            {draftFilterCount > 0 && (
              <Chip
                size="small"
                color="error"
                label={`${draftFilterCount} active`}
                sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
              />
            )}
          </Stack>
          <IconButton
            aria-label="Close search and filters"
            onClick={onClose}
            sx={{ width: 40, height: 40 }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>

        <Paper
          component="form"
          role="search"
          onSubmit={handleSubmit}
          elevation={0}
          sx={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            px: 1.5,
            minHeight: 46,
            borderRadius: 999,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.default,
            boxShadow:
              mode === "dark"
                ? "inset 0 1px 3px rgba(0,0,0,0.2)"
                : "inset 0 1px 3px rgba(54,35,18,0.05)",
          }}
        >
          <SearchIcon sx={{ color: "text.secondary", fontSize: 20, mr: 1 }} />
          <InputBase
            inputRef={inputRef}
            fullWidth
            placeholder="Search art, mediums, features..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            inputProps={{ "aria-label": "Search artworks" }}
            sx={{ fontSize: "0.95rem", minWidth: 0 }}
          />
          {searchQuery && (
            <IconButton
              aria-label="Clear search text"
              size="small"
              onClick={() => onSearchQueryChange("")}
              sx={{ mr: 0.25 }}
            >
              <CloseIcon sx={{ fontSize: 17 }} />
            </IconButton>
          )}
          <IconButton
            type="submit"
            aria-label="Submit search and filters"
            color="error"
            sx={{ width: 38, height: 38, flexShrink: 0 }}
          >
            <SearchIcon fontSize="small" />
          </IconButton>
        </Paper>

        {/* Active Draft Chips */}
        {hasAnyDraftFilters && (
          <Stack
            direction="row"
            spacing={0.75}
            flexWrap="wrap"
            useFlexGap
            sx={{ mt: 1.25 }}
          >
            {categoryGroups.map((group) =>
              (draftCategories[group.filterType] || []).map((option) => (
                <Chip
                  key={`${group.filterType}-${option}`}
                  size="small"
                  label={option}
                  color="error"
                  variant="outlined"
                  onDelete={() => onToggleCategory(group.filterType, option)}
                  sx={{ fontWeight: 600 }}
                />
              )),
            )}
            {(draftCategories.color || []).map((colorName) => (
              <Chip
                key={`color-${colorName}`}
                size="small"
                label={`Color: ${colorName}`}
                color="error"
                variant="outlined"
                onDelete={() => onToggleColor(colorName)}
                sx={{ fontWeight: 600 }}
              />
            ))}
            {hasDraftPrice && (
              <Chip
                size="small"
                label={formatPriceRange(draftPriceRange)}
                color="error"
                variant="outlined"
                onDelete={onClearPrice}
                sx={{ fontWeight: 600 }}
              />
            )}
          </Stack>
        )}
      </Box>

      {/* Scrollable Filter Sections */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 2,
          py: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2.25,
        }}
      >
        {/* Price Range */}
        <Box>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 0.5 }}
          >
            <Typography sx={{ fontSize: 14, fontWeight: 800 }}>
              Price Range
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography
                variant="body2"
                color="error.main"
                sx={{ fontWeight: 700, fontSize: 13 }}
              >
                {formatPriceRange(draftPriceRange)}
              </Typography>
              {hasDraftPrice && (
                <Button
                  size="small"
                  onClick={onClearPrice}
                  sx={{ minWidth: 0, p: 0.25, fontSize: 12, textTransform: "none" }}
                >
                  Clear
                </Button>
              )}
            </Stack>
          </Stack>
          <Box sx={{ px: 1.5 }}>
            <Slider
              value={draftPriceRange}
              min={0}
              max={PRICE_LIMIT}
              step={100}
              disableSwap
              getAriaLabel={(index) =>
                index === 0 ? "Minimum price" : "Maximum price"
              }
              getAriaValueText={(value) =>
                `\u20b1${value.toLocaleString("en-PH")}${value === PRICE_LIMIT ? "+" : ""}`
              }
              valueLabelDisplay="auto"
              valueLabelFormat={(value) =>
                `\u20b1${value.toLocaleString("en-PH")}${value === PRICE_LIMIT ? "+" : ""}`
              }
              onChange={(_, range) => onDraftPriceChange(range)}
              sx={{ color: theme.palette.error.main }}
            />
          </Box>
        </Box>

        {/* Art Type, Style, Materials */}
        {categoryGroups.map((group) => (
          <Box key={group.title}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 1 }}>
              {group.title}
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {group.options.map((option) => {
                const selected = (draftCategories[group.filterType] || []).some(
                  (value) => value.toLowerCase() === option.toLowerCase(),
                );
                return (
                  <Chip
                    key={option}
                    label={option}
                    clickable
                    onClick={() => onToggleCategory(group.filterType, option)}
                    color={selected ? "error" : "default"}
                    variant={selected ? "filled" : "outlined"}
                    sx={{
                      height: 34,
                      fontSize: 13,
                      fontWeight: selected ? 700 : 500,
                      borderColor: selected ? "error.main" : "divider",
                    }}
                  />
                );
              })}
            </Stack>
          </Box>
        ))}

        {/* Color Palette */}
        <Box sx={{ pb: 0.5 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 1 }}>
            Color Palette
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {COLOR_PALETTE.map(({ hex: color, name }) => {
              const selected = (draftCategories.color || []).some(
                (value) => value.toLowerCase() === name.toLowerCase(),
              );
              return (
                <Chip
                  key={color}
                  label={name}
                  clickable
                  onClick={() => onToggleColor(name)}
                  color={selected ? "error" : "default"}
                  variant={selected ? "filled" : "outlined"}
                  icon={
                    <Box
                      component="span"
                      sx={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        backgroundColor: color,
                        border: `1px solid ${theme.palette.divider}`,
                        ml: "6px !important",
                        flexShrink: 0,
                      }}
                    />
                  }
                  sx={{
                    height: 34,
                    fontSize: 12.5,
                    fontWeight: selected ? 700 : 500,
                    borderColor: selected ? "error.main" : "divider",
                  }}
                />
              );
            })}
          </Stack>
        </Box>
      </Box>

      {/* Sticky Footer Actions */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: "background.paper",
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<RestartAltRoundedIcon />}
            disabled={!hasAnyActiveInput}
            onClick={() => {
              onSearchQueryChange("");
              onResetAll();
            }}
            sx={{
              minHeight: 44,
              borderRadius: 999,
              px: 2,
              textTransform: "none",
              fontWeight: 700,
              borderColor: "divider",
            }}
          >
            Reset
          </Button>
          <Button
            fullWidth
            variant="contained"
            color="error"
            startIcon={<SearchIcon />}
            onClick={onApply}
            sx={{
              minHeight: 44,
              borderRadius: 999,
              textTransform: "none",
              fontWeight: 800,
              fontSize: "0.95rem",
              boxShadow: "0 4px 14px rgba(245, 34, 69, 0.28)",
            }}
          >
            Apply &amp; Search
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}

