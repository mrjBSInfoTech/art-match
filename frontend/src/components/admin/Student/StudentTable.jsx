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
import ReplayIcon from "@mui/icons-material/Replay";
import BlockIcon from "@mui/icons-material/Block";
import GavelIcon from "@mui/icons-material/Gavel";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import StudentInfo from "./StudentInfo";
import AccessReason from "../Access/AccessReason";
import { startSupportConversation } from "../../../api/admin/supportChatAPI";
import {
  addAccountStrike,
  setAccountBan,
} from "../../../api/admin/accountAccessAPI";

export default function StudentTable({
  students = [],
  onEdit,
  onDelete,
  onReactivate,
  onAccessChange,
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const [accessAction, setAccessAction] = useState("");
  const [operationError, setOperationError] = useState("");
  const [startingChat, setStartingChat] = useState(false);

  const role = (localStorage.getItem("admin_role") || "").toLowerCase();
  const canEdit =
    role === "super admin" ||
    (role === "admin" && localStorage.getItem("admin_can_edit") === "1");

  const getId = (student) => student?.student_id ?? student?.id;
  const getName = (student) =>
    `${student?.first_name || ""} ${student?.last_name || ""}`.trim() ||
    "Unnamed student";

  const handleMenuOpen = (event, student) => {
    setAnchorEl(event.currentTarget);
    setSelectedStudent(student);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const submitAccessAction = async (reason) => {
    try {
      setOperationError("");
      const studentId = getId(selectedStudent);
      if (accessAction === "strike") {
        await addAccountStrike("seller", studentId, reason);
      } else {
        await setAccountBan(
          "seller",
          studentId,
          accessAction === "ban",
          reason,
        );
      }
      setAccessAction("");
      await onAccessChange?.();
    } catch (error) {
      setOperationError(error.message || "Unable to update seller access.");
    }
  };

  const openSupportChat = async () => {
    try {
      setOperationError("");
      setStartingChat(true);
      const conversation = await startSupportConversation(
        "seller",
        getId(selectedStudent),
      );
      navigate(`/admin/chat-support?conversation=${conversation.conversation_id}`);
      handleMenuClose();
    } catch (error) {
      setOperationError(error.message || "Unable to open seller conversation.");
    } finally {
      setStartingChat(false);
    }
  };

  return (
    <>
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
        aria-label="Student directory table"
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
            Student directory
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
            View student numbers, course details, strikes, and account status.
          </Typography>
        </Box>

        <TableContainer sx={{ maxHeight: { xs: 580, md: 720 }, overflowX: "auto" }}>
          <Table
            stickyHeader
            size="small"
            aria-label="Student directory table"
            sx={{ minWidth: 780 }}
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
                <TableCell>Student</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Academic</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {students.map((student) => {
                const id = getId(student);
                const fullName = getName(student);
                const image = student.profile_image || student.image;
                const imageUrl = /^https?:\/\//i.test(image || "")
                  ? image
                  : image
                    ? `http://localhost:5000/uploads/seller/uploadProfile/${encodeURIComponent(image)}`
                    : "http://localhost:5000/uploads/seller/profile.jpg";
                const strikes = Number(student.strikes || 0);
                const isBanned = Boolean(student.is_banned);
                const isExpired = student.account_status === "expired";
                const registerStatus = student.register_status || "Pending";

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
                              "http://localhost:5000/uploads/seller/profile.jpg";
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
                            {student.student_number || "No student number"}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell sx={{ minWidth: 200 }}>
                      <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                        {student.email || "No email provided"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        {student.phone_number || "No phone number"}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ minWidth: 160, maxWidth: 240 }}>
                      <Typography variant="body2" noWrap title={student.course || "Not specified"}>
                        {student.course || "Not specified"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                        {student.year_level || "No year level"}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Stack spacing={0.5} alignItems="flex-start">
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          <Chip
                            size="small"
                            label={
                              isBanned
                                ? "Banned"
                                : isExpired
                                  ? "Expired"
                                  : registerStatus
                            }
                            sx={{
                              fontSize: 11,
                              fontWeight: 800,
                              borderRadius: 1.5,
                              textTransform: "capitalize",
                              color: isBanned || isExpired
                                ? theme.palette.error.main
                                : theme.palette.primary.main,
                              backgroundColor: isBanned || isExpired
                                ? theme.palette.mode === "dark"
                                  ? "rgba(239, 68, 68, 0.16)"
                                  : "#fef2f2"
                                : theme.palette.mode === "dark"
                                  ? "rgba(59, 130, 246, 0.16)"
                                  : "#eff6ff",
                            }}
                          />
                          {strikes > 0 && (
                            <Chip
                              size="small"
                              label={`${strikes} / 3 strikes`}
                              color="warning"
                              sx={{ height: 22, fontSize: 11, fontWeight: 700, borderRadius: 1.5 }}
                            />
                          )}
                        </Stack>
                        {strikes === 0 && (
                          <Typography variant="caption" color="text.secondary">
                            0 strikes
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>

                    <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setSelectedStudent(student);
                            setOpenInfoDialog(true);
                          }}
                          sx={{
                            minHeight: 40,
                            borderRadius: 2,
                            fontWeight: 700,
                            textTransform: "none",
                            whiteSpace: "nowrap",
                          }}
                        >
                          View details
                        </Button>
                        <IconButton
                          size="small"
                          aria-label={`Manage ${fullName}`}
                          onClick={(event) => handleMenuOpen(event, student)}
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
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={openSupportChat} disabled={startingChat}>
          <ChatBubbleOutlineIcon sx={{ mr: 1, fontSize: 20 }} />
          {startingChat ? "Opening chat..." : "Chat"}
        </MenuItem>
        <MenuItem
          onClick={() => {
            onEdit?.(selectedStudent);
            handleMenuClose();
          }}
          sx={{ color: "success.main" }}
        >
          <EditIcon sx={{ mr: 1, fontSize: 20 }} />
          Edit
        </MenuItem>
        {selectedStudent?.account_status === "expired" && (
          <MenuItem
            onClick={() => {
              onReactivate?.(selectedStudent);
              handleMenuClose();
            }}
            sx={{ color: "success.main" }}
          >
            <ReplayIcon sx={{ mr: 1, fontSize: 20 }} />
            Reactivate
          </MenuItem>
        )}
        {canEdit && !selectedStudent?.is_banned && (
          <MenuItem
            onClick={() => {
              setAccessAction("strike");
              handleMenuClose();
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
                selectedStudent?.is_banned ? "unban" : "ban",
              );
              handleMenuClose();
            }}
            sx={{
              color: selectedStudent?.is_banned
                ? "success.main"
                : "error.main",
            }}
          >
            <BlockIcon sx={{ mr: 1, fontSize: 20 }} />
            {selectedStudent?.is_banned
              ? "Unban account"
              : "Ban account"}
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            onDelete?.(selectedStudent);
            handleMenuClose();
          }}
          sx={{ color: "error.main" }}
        >
          <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
          Delete
        </MenuItem>
      </Menu>

      <StudentInfo
        open={openInfoDialog}
        handleClose={() => setOpenInfoDialog(false)}
        selectedStudent={selectedStudent}
      />
      <AccessReason
        open={Boolean(accessAction)}
        handleClose={() => setAccessAction("")}
        selectedAccount={
          selectedStudent && {
            ...selectedStudent,
            role: "seller",
            account_id: getId(selectedStudent),
            username: selectedStudent.student_number,
          }
        }
        action={accessAction}
        submitAction={submitAccessAction}
      />
    </>
  );
}

