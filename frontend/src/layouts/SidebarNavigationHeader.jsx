import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { AppBar, Box, GlobalStyles, IconButton, Toolbar, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";

export default function SidebarNavigationHeader({ branding, menuOpen, onToggleMenu, hideMenuButton, slots, slotProps }) {
  const theme = useTheme();
  const { pathname } = useLocation();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const previousNavigation = useRef({ isDesktop, onToggleMenu });

  useEffect(() => {
    const previous = previousNavigation.current;
    if (isDesktop && !previous.isDesktop) {
      // Toolpad keeps separate mobile and desktop state. Close the previous
      // mobile callback so a hidden Modal cannot keep its backdrop/focus lock.
      previous.onToggleMenu(false);
    }
    previousNavigation.current = { isDesktop, onToggleMenu };
  }, [isDesktop, onToggleMenu]);

  useEffect(() => {
    if (!isDesktop) onToggleMenu(false);
  }, [pathname, isDesktop, onToggleMenu]);

  const Actions = slots?.toolbarActions ?? slots?.toolbarAccount;

  return (
    <>
    <GlobalStyles styles={{
      // The temporary Toolpad drawer is portaled outside the layout root.
      ".MuiDrawer-paper:has(> nav[aria-label='Phone'])": {
        backgroundColor: "#a3181f", color: "#fff", border: "none",
        "& > .MuiToolbar-root": { display: "none" },
        "& nav": { minHeight: 0, overflowY: "auto", overscrollBehavior: "contain" },
        "& .MuiListSubheader-root": {
          backgroundColor: "#a3181f", color: "#fff", fontSize: 14,
          fontWeight: 700, lineHeight: "56px", paddingLeft: 24,
        },
        "& .MuiSvgIcon-root": { color: "#fff" },
        "& .MuiListItemText-primary": { fontSize: 14, fontWeight: 600, lineHeight: 1.25 },
        "& .MuiListItemButton-root": { marginBlock: 5, borderRadius: 9 },
        "& .MuiListItemButton-root:hover": { backgroundColor: "rgba(255, 255, 255, 0.12)" },
        "& .Mui-selected": { backgroundColor: "#fff !important" },
        "& .Mui-selected .MuiListItemText-primary, & .Mui-selected .MuiSvgIcon-root": { color: "#a3181f" },
      },
    }} />
    <AppBar position="absolute" color="inherit" sx={{
      zIndex: { xs: theme.zIndex.appBar, md: theme.zIndex.drawer + 1 },
      bgcolor: "background.header", boxShadow: "none",
      borderBottom: "1px solid", borderColor: "divider", displayPrint: "none",
    }}>
      <Toolbar sx={{ px: { xs: 1, sm: 2, md: 2.5, lg: 3 }, gap: { xs: 0.5, sm: 1.5 }, flexWrap: "nowrap" }}>
        {!hideMenuButton && (
          <IconButton onClick={() => onToggleMenu(!menuOpen)}
            aria-label={`${menuOpen ? "Collapse" : "Expand"} navigation menu`}
            aria-expanded={menuOpen}
            sx={{ width: 40, height: 40, flexShrink: 0, color: "text.secondary" }}>
            {menuOpen ? <MenuOpenIcon /> : <MenuIcon />}
          </IconButton>
        )}
        <Box component={Link} to={branding?.homeUrl || "/"} aria-label="Red Nexus dashboard" sx={{
          display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1 },
          flex: "1 1 auto", minWidth: 0, textDecoration: "none", color: "text.primary",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{branding?.logo}</Box>
          <Box sx={{
            minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
            "& > *": { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
          }}>
            {branding?.title}
          </Box>
        </Box>
        {Actions && (
          <Box onClickCapture={() => { if (!isDesktop && menuOpen) onToggleMenu(false); }}
            sx={{ display: "flex", alignItems: "center", flexShrink: 0, minWidth: 0 }}>
            <Actions {...(slotProps?.toolbarActions ?? slotProps?.toolbarAccount)} />
          </Box>
        )}
      </Toolbar>
    </AppBar>
    </>
  );
}
