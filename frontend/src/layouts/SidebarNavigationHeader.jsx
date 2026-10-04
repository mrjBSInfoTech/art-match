import { DashboardHeader } from "@toolpad/core";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";

export default function SidebarNavigationHeader(props) {
  const { menuOpen, onToggleMenu } = props;

  return (
    <>
      <DashboardHeader {...props} />
      <IconButton
        onClick={() => onToggleMenu(!menuOpen)}
        aria-label={`${menuOpen ? "Collapse" : "Expand"} navigation menu`}
        sx={{
          display: { xs: "none", md: "inline-flex" },
          position: "fixed",
          top: { xs: "72px", sm: "80px" },
          left: menuOpen ? 18 : 22,
          zIndex: (theme) => theme.zIndex.drawer + 1,
          color: "#ffffff",
        }}
      >
        <MenuIcon />
      </IconButton>
    </>
  );
}
