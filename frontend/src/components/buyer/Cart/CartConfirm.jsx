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
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
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

function CartConfirm({ open, handleClose, onSubmit, selectedItems = [], total = 0 }) {
  const theme = useTheme();
  const closeDialog = () => handleClose();
  const computedTotal = selectedItems.reduce(
    (sum, item) => sum + Number(item.subtotal ?? Number(item.price || 0) * Math.max(1, Number(item.qty ?? item.quantity ?? 1))),
    0,
  );
  const displayTotal = Number(total) > 0 ? Number(total) : computedTotal;
  const totalQuantity = selectedItems.reduce(
    (sum, item) => sum + Math.max(1, Number(item.qty ?? item.quantity ?? 1)),
    0,
  );
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
          <Typography id="cart-confirm-description" variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Please review the artworks and quantities you selected before continuing to checkout.
          </Typography>
          <List disablePadding sx={{ maxHeight: 240, overflowY: "auto" }}>
            {selectedItems.map((item) => {
              const qty = Math.max(1, Number(item.qty ?? item.quantity ?? 1));
              const unitPrice = Number(item.price || 0);
              const lineTotal = Number(item.subtotal ?? unitPrice * qty);
              return (
                <ListItem
                  key={item.artwork_id || item.id}
                  disableGutters
                  sx={{ py: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}
                >
                  <ListItemText
                    primary={item.title || "Untitled Artwork"}
                    secondary={`Qty: ${qty} × ${formatPrice(unitPrice)}`}
                    primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                    secondaryTypographyProps={{ variant: "caption" }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: "nowrap", mt: 0.5 }}>
                    {formatPrice(lineTotal)}
                  </Typography>
                </ListItem>
              );
            })}
          </List>
          <Divider sx={{ my: 1.5 }} />
          <Stack spacing={0.75}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                Selected items ({totalQuantity} {totalQuantity === 1 ? "unit" : "units"})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatPrice(displayTotal)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Total calculation
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "error.main" }}>
                {formatPrice(displayTotal)}
              </Typography>
            </Stack>
          </Stack>
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
