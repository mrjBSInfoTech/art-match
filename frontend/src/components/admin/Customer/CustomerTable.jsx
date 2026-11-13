import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import BlockIcon from "@mui/icons-material/Block";
import GavelIcon from "@mui/icons-material/Gavel";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CustomerInfo from "./CustomerInfo";
import CustomerForm from "./CustomerForm";
import AccessReason from "../Access/AccessReason";
import {
  addAccountStrike,
  setAccountBan,
} from "../../../api/admin/accountAccessAPI";
import { startSupportConversation } from "../../../api/admin/supportChatAPI";
import { adminTableButtonSx } from "../adminTableStyles";

const fields = [
  ["username", "Username"],
  ["first_name", "First name"],
  ["last_name", "Last name"],
  ["email", "Email"],
  ["phone_number", "Phone number"],
  ["address", "Address"],
];

export default function CustomerTable({
  customers = [],
  onSave,
  onDelete,
  onAccessChange,
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState(null);
  const [formData, setFormData] = useState({});
  const [accessAction, setAccessAction] = useState("");
  const [operationError, setOperationError] = useState("");
  const [saving, setSaving] = useState(false);
  const [chatError, setChatError] = useState("");
  const [startingChat, setStartingChat] = useState(false);

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
      if (accessAction === "strike") {
        await addAccountStrike("buyer", getId(selectedCustomer), reason);
      } else {
        await setAccountBan(
          "buyer",
          getId(selectedCustomer),
          accessAction === "ban",
          reason,
        );
      }
      setAccessAction("");
      await onAccessChange?.();
    } catch (error) {
      setOperationError(error.message || "Unable to update customer access.");
    }
  };

  const openSupportChat = async () => {
    try {
      setChatError("");
      setStartingChat(true);
      const conversation = await startSupportConversation(
        "buyer",
        getId(selectedCustomer),
      );
      navigate(`/admin/chat-support?conversation=${conversation.conversation_id}`);
      setAnchorEl(null);
    } catch (error) {
      setChatError(error.message || "Unable to open buyer conversation.");
    } finally {
      setStartingChat(false);
    }
  };

  return (
    <>
      {chatError && (
        <Alert severity="error" onClose={() => setChatError("")} sx={{ mb: 2 }}>
          {chatError}
        </Alert>
      )}
      {operationError && (
        <Alert
          severity="error"
          onClose={() => setOperationError("")}
          sx={{ mb: 2 }}
        >
          {operationError}
        </Alert>
      )}

      <Paper
        component="section"
        variant="outlined"
        aria-label="Customer directory table"
        sx={{
          borderRadius: 3.5,
          borderColor: "divider",
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: 16 }}>
            Customer directory
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
            View customer profiles, contact information, strikes, and account status.
          </Typography>
        </Box>

        <TableContainer sx={{ maxHeight: { xs: 580, md: 720 }, overflowX: "auto" }}>
          <Table
            stickyHeader
            size="small"
            aria-label="Customer directory table"
            sx={{ minWidth: 760 }}
          >
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    bgcolor: theme.palette.mode === "dark" ? "background.paper" : "#f8fafc",
                    fontWeight: 800,
                    fontSize: 11,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    color: "text.secondary",
                    py: 1.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    whiteSpace: "nowrap",
                  },
                }}
              >
                <TableCell>Customer</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {customers.map((customer) => {
                const id = getId(customer);
                const fullName = getName(customer);
                const image = customer.profile_image || customer.image;
                const imageUrl = /^https?:\/\//i.test(image || "")
                  ? image
                  : image
                    ? `http://localhost:5000/uploads/buyer/uploadProfile/${encodeURIComponent(image)}`
                    : "http://localhost:5000/uploads/buyer/profile.jpg";
                const strikes = Number(customer.strikes || 0);
                const isBanned = Boolean(customer.is_banned);

                return (
                  <TableRow
                    key={id}
                    hover
                    sx={{
                      "& td": { py: 1.75, verticalAlign: "middle" },
                      "&:last-child td": { borderBottom: 0 },
                    }}
                  >
                    <TableCell sx={{ minWidth: 220, maxWidth: 300 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
                        <Box
                          component="img"
                          src={imageUrl}
                          alt={fullName}
                          onError={(event) => {
                            event.target.onerror = null;
                            event.target.src =
                              "http://localhost:5000/uploads/buyer/profile.jpg";
                          }}
                          sx={{
                            width: 44,
                            height: 44,
                            flexShrink: 0,
                            borderRadius: 1.5,
                            objectFit: "cover",
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
                          }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap title={fullName}>
                            {fullName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                            @{customer.username || "customer"}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell sx={{ minWidth: 200 }}>
                      <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                        {customer.email || "No email provided"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        {customer.phone_number || "No phone number"}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ minWidth: 160, maxWidth: 240 }}>
                      <Typography variant="body2" noWrap title={customer.address || "Not provided"}>
                        {customer.address || "Not provided"}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Stack spacing={0.5} alignItems="flex-start">
                        <Chip
                          size="small"
                          label={isBanned ? "Banned" : "Active"}
                          sx={{
                            fontSize: 11,
                            fontWeight: 800,
                            borderRadius: 1.5,
                            color: isBanned
                              ? theme.palette.error.main
                              : theme.palette.primary.main,
                            backgroundColor: isBanned
                              ? theme.palette.mode === "dark"
                                ? "rgba(239, 68, 68, 0.16)"
                                : "#fef2f2"
                              : theme.palette.mode === "dark"
                                ? "rgba(59, 130, 246, 0.16)"
                                : "#eff6ff",
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {strikes} {strikes === 1 ? "strike" : "strikes"}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setOpenInfoDialog(true);
                          }}
                          sx={adminTableButtonSx}
                        >
                          View details
                        </Button>
                        <IconButton
                          size="small"
                          aria-label={`Manage ${fullName}`}
                          onClick={(event) => {
                            setAnchorEl(event.currentTarget);
                            setSelectedCustomer(customer);
                          }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={openSupportChat} disabled={startingChat}>
          <ChatBubbleOutlineIcon sx={{ mr: 1, fontSize: 20 }} />
          {startingChat ? "Opening chat..." : "Chat"}
        </MenuItem>
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
            {selectedCustomer?.is_banned ? "Unban account" : "Ban account"}
          </MenuItem>
        )}
      </Menu>

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
    </>
  );
}

