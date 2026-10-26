import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slide,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
// Icons
import CloseIcon from "@mui/icons-material/Close";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={500}
      easing={{
        enter: "cubic-bezier(0.4, 0, 0.2, 1)",
        exit: "ease-out",
      }}
    />
  );
});

const formatPrice = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

function CartConfirm({ open, handleClose, onSubmit, selectedItems = [],}) {
  const theme = useTheme();
  const closeDialog = () => handleClose();
  const handleConfirm = () => {
    if (selectedItems.length) {
      onSubmit(selectedItems.map((item) => String(item.artwork_id)));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={closeDialog}
      aria-labelledby="cart-confirm-title"
      aria-describedby="cart-confirm-description"
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 470px)",
          maxWidth: "470px",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
        },
      }}
    >
      <>
        <DialogTitle
          id="cart-confirm-title"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            px: 2.5,
            py: 1.75,
            color: theme.palette.text.primary,
            fontSize: 16,
            fontWeight: 700,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <PaletteOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
          Confirm your order
          <Button
            aria-label="Close order confirmation"
            onClick={closeDialog}
            sx={{
              minWidth: 28,
              width: 28,
              height: 28,
              ml: "auto",
              p: 0,
              color: theme.palette.text.secondary,
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          <Typography id="cart-confirm-description">
            Please review the artworks you selected before continuing to checkout.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDialog} sx={{ color: "text.secondary" }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedItems.length}
            variant="contained"
            color="error"
            sx={{
              borderRadius: 1.5,
              px: 2.5,
              textTransform: "none",
              fontWeight: 700,
              color: "#fff",
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </>
    </Dialog>
  );
}

export default CartConfirm;
