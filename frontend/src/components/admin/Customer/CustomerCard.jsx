import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CustomerInfo from "./CustomerInfo";
import CustomerForm from "./CustomerForm";
import AccessReason from "../Access/AccessReason";
import BlockIcon from '@mui/icons-material/Block';
import GavelIcon from '@mui/icons-material/Gavel';
import {
  addAccountStrike,
  setAccountBan,
} from "../../../api/admin/accountAccessAPI";

const fields = [
  ["username", "Username"],
  ["first_name", "First name"],
  ["last_name", "Last name"],
  ["email", "Email"],
  ["phone_number", "Phone number"],
  ["address", "Address"],
];

export default function CustomerCard({
  customers = [],
  onSave,
  onDelete,
  onAccessChange,
}) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState(null);
  const [formData, setFormData] = useState({});
  const [accessAction, setAccessAction] = useState("");
  const [operationError, setOperationError] = useState("");
  const [saving, setSaving] = useState(false);

  const role = (localStorage.getItem("admin_role") || "").toLowerCase();
  const canEdit =
    role === "super admin" ||
    (role === "admin" && localStorage.getItem("admin_can_edit") === "1");
  const canDelete =
    role === "super admin" ||
    (role === "admin" && localStorage.getItem("admin_can_delete") === "1");
  const getId = (customer) => customer?.customer_id ?? customer?.id;
  const getName = (customer) =>
    `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim() ||
    customer?.username ||
    "Unnamed customer";

  const openEdit = (customer) => {
    setSelectedCustomer(customer);
    setFormData(
      Object.fromEntries(fields.map(([key]) => [key, customer[key] || ""])),
    );
    setDialogMode("edit");
    setAnchorEl(null);
  };
  const save = async () => {
    try {
      setSaving(true);
      setOperationError("");
      await onSave(getId(selectedCustomer), formData);
      setDialogMode(null);
      setSelectedCustomer(null);
    } catch (error) {
      setOperationError(error.message || "Unable to update customer.");
    } finally {
      setSaving(false);
    }
  };
  const submitAccessAction = async (reason) => {
    try {
      setOperationError("");
      if (accessAction === "strike")
        await addAccountStrike("buyer", getId(selectedCustomer), reason);
      else
        await setAccountBan(
          "buyer",
          getId(selectedCustomer),
          accessAction === "ban",
          reason,
        );
      setAccessAction("");
      await onAccessChange?.();
    } catch (error) {
      setOperationError(error.message || "Unable to update customer access.");
    }
  };

  return (
    <Box>
      {operationError && (
        <Alert
          severity="error"
          onClose={() => setOperationError("")}
          sx={{ mb: 2 }}
        >
          {operationError}
        </Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
            lg: "repeat(5, minmax(0, 1fr))",
          },
          gap: { xs: 1.5, sm: 2 },
        }}
      >
        {customers.map((customer) => {
          const id = getId(customer);
          return (
            <Card
              key={id}
              sx={{
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.5,
                boxShadow: "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
                "&:hover": {
                  borderColor: "text.secondary",
                  boxShadow: "0 5px 14px rgba(15, 23, 42, 0.1)",
                },
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  height: 170,
                  aspectRatio: "1.35 / 1",
                  position: "relative",
                  backgroundColor:
                    theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CardMedia
                  component="img"
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                  }}
                  image={
                    customer.image
                      ? `http://localhost:5000/uploads/buyer/profile/${encodeURIComponent(customer.image)}`
                      : "http://localhost:5000/uploads/profile.jpg"
                  }
                  alt={getName(customer)}
                  onError={(event) => {
                    event.target.onerror = null;
                    event.target.src =
                      "http://localhost:5000/uploads/profile.jpg";
                  }}
                />
              </Box>
              <CardContent
                sx={{
                  p: 1.25,
                  "&:last-child": { pb: 1.25 },
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    mb: 0.75,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: 12 }}
                      noWrap
                    >
                      {getName(customer)}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        display: "block",
                        mt: 0.25,
                      }}
                    >
                      @{customer.username || "customer"}
                    </Typography>
                    <Chip
                      size="small"
                      label="Customer"
                      color="primary"
                      sx={{
                        mt: 0.5,
                        height: 18,
                        fontSize: 9,
                        fontWeight: 700,
                        borderRadius: 1,
                        color: theme.palette.primary.main,
                        backgroundColor:
                          theme.palette.mode === "dark"
                            ? "rgba(59, 130, 246, 0.16)"
                            : "#eff6ff",
                      }}
                    />
                  </Box>
                  {(canEdit || canDelete) && (
                    <IconButton
                      size="small"
                      onClick={(event) => {
                        setAnchorEl(event.currentTarget);
                        setSelectedCustomer(customer);
                      }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                <Button
                  variant="contained"
                  size="small"
                  fullWidth
                  startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 15 }} />}
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setOpenInfoDialog(true);
                  }}
                  sx={{
                    mt: "auto",
                    py: 0.45,
                    backgroundColor:
                      theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
                    color: theme.palette.text.primary,
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow: "none",
                    fontSize: 10,
                    "& .MuiButton-startIcon": {
                      color: theme.palette.error.main,
                    },
                    "&:hover": {
                      backgroundColor: theme.palette.action.hover,
                      borderColor: theme.palette.text.secondary,
                      boxShadow: "none",
                    },
                  }}
                >
                  View Details
                </Button>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl) && getId(selectedCustomer) === id}
                  onClose={() => setAnchorEl(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  {canEdit && (
                    <MenuItem
                      onClick={() => openEdit(selectedCustomer)}
                      sx={{ color: "success.main" }}
                    >
                      <EditIcon sx={{ mr: 1, fontSize: 20 }} />
                      Edit
                    </MenuItem>
                  )}
                  {canDelete && (
                    <MenuItem
                      onClick={() => {
                        onDelete?.(selectedCustomer);
                        setAnchorEl(null);
                      }}
                      sx={{ color: "error.main" }}
                    >
                      <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
                      Delete
                    </MenuItem>
                  )}
                  {canEdit && !selectedCustomer?.is_banned && (
                    <MenuItem
                      onClick={() => {
                        setAccessAction("strike");
                        setAnchorEl(null);
                      }}
                      sx={{ color: "warning.main" }}
                    >
                      <GavelIcon sx={{ mr: 1, fontSize: 20 }} />
                      Add strike
                    </MenuItem>
                  )}
                  {canEdit && (
                    <MenuItem
                      onClick={() => {
                        setAccessAction(
                          selectedCustomer?.is_banned ? "unban" : "ban",
                        );
                        setAnchorEl(null);
                      }}
                      sx={{
                        color: selectedCustomer?.is_banned
                          ? "success.main"
                          : "error.main",
                      }}
                    >
                      <BlockIcon sx={{ mr: 1, fontSize: 20 }} />
                      {selectedCustomer?.is_banned
                        ? "Unban account"
                        : "Ban account"}
                    </MenuItem>
                  )}
                </Menu>
              </CardContent>
            </Card>
          );
        })}
      </Box>
      <CustomerInfo
        open={openInfoDialog}
        handleClose={() => setOpenInfoDialog(false)}
        selectedCustomer={selectedCustomer}
      />
      <CustomerForm
        open={dialogMode === "edit"}
        handleClose={() => setDialogMode(null)}
        fields={fields}
        formData={formData}
        setFormData={setFormData}
        onSubmit={save}
        saving={saving}
      />
      <AccessReason
        open={Boolean(accessAction)}
        handleClose={() => setAccessAction("")}
        selectedAccount={
          selectedCustomer && {
            ...selectedCustomer,
            role: "buyer",
            account_id: getId(selectedCustomer),
            username: selectedCustomer.username,
          }
        }
        action={accessAction}
        submitAction={submitAccessAction}
      />
    </Box>
  );
}
