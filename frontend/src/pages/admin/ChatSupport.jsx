import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import {
  fetchSupportInbox,
  fetchSupportThread,
  sendSupportReply,
} from "../../api/admin/supportChatAPI";

const POLL_INTERVAL = 5000;

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return new Intl.DateTimeFormat("en", {
    ...(sameDay ? {} : { month: "short", day: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const initials = (name) =>
  (name || "B")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "B";

export default function ChatSupport() {
  const [conversations, setConversations] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [thread, setThread] = useState(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const bottomRef = useRef(null);

  const loadInbox = useCallback(async () => {
    try {
      const rows = await fetchSupportInbox();
      setConversations(rows);
      return rows;
    } catch (loadError) {
      setError(loadError.message);
      return null;
    } finally {
      setLoadingInbox(false);
    }
  }, []);

  const loadThread = useCallback(async (conversationId, { silent } = {}) => {
    if (!conversationId) return;
    if (!silent) setLoadingThread(true);
    try {
      const data = await fetchSupportThread(conversationId);
      setThread(data);
    } catch (threadError) {
      if (!silent) setError(threadError.message);
    } finally {
      if (!silent) setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  // Keep the inbox and the open thread fresh while the page is visible.
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      loadInbox();
      if (selectedId) loadThread(selectedId, { silent: true });
    }, POLL_INTERVAL);
    return () => window.clearInterval(interval);
  }, [loadInbox, loadThread, selectedId]);

  useEffect(() => {
    if (selectedId) loadThread(selectedId);
  }, [selectedId, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread?.messages?.length]);

  const selectedConversation = conversations.find(
    (item) => String(item.support_conversation_id) === String(selectedId),
  );

  const handleSend = async () => {
    const message = reply.trim();
    if (!message || !selectedId || sending) return;

    setSending(true);
    setError("");
    setNotice("");
    try {
      await sendSupportReply(selectedId, message);
      setReply("");
      await Promise.all([loadThread(selectedId, { silent: true }), loadInbox()]);
      setNotice("Reply sent.");
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        minHeight: "100vh",
        width: "100%",
        boxSizing: "border-box",
        backgroundColor: (theme) => theme.palette.background.default,
        color: (theme) => theme.palette.text.primary,
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Chat Support</title>
      </Helmet>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <SupportAgentRoundedIcon sx={{ fontSize: { xs: 30, sm: 38 }, color: "error.main" }} />
        <Box>
          <Typography
            sx={{
              fontSize: { xs: 28, sm: 38 },
              fontWeight: 800,
              lineHeight: 1.1,
              color: "text.primary",
            }}
          >
            Chat Support
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 13 }}>
            Reply to buyers who contacted support from the Help &amp; Support page.
          </Typography>
        </Box>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>
          {notice}
        </Alert>
      )}

      <Paper
        variant="outlined"
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "320px 1fr" },
          height: { xs: "auto", md: "calc(100vh - 230px)" },
          minHeight: { xs: 420, md: 520 },
          borderRadius: 3,
          overflow: "hidden",
          borderColor: "divider",
        }}
      >
        {/* Inbox */}
        <Box
          sx={{
            borderRight: { md: "1px solid" },
            borderBottom: { xs: "1px solid", md: "none" },
            borderColor: "divider",
            display: { xs: selectedId ? "none" : "block", md: "block" },
            overflowY: "auto",
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
              CONVERSATIONS ({conversations.length})
            </Typography>
          </Box>
          <Divider />
          {loadingInbox ? (
            <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
              <CircularProgress size={26} />
            </Box>
          ) : !conversations.length ? (
            <Stack alignItems="center" spacing={1} sx={{ px: 2, py: 6 }}>
              <ForumOutlinedIcon sx={{ fontSize: 40, color: "text.disabled" }} />
              <Typography variant="body2" color="text.secondary" textAlign="center">
                No buyer messages yet. Conversations appear here as soon as a
                buyer sends a support message.
              </Typography>
            </Stack>
          ) : (
            <List disablePadding>
              {conversations.map((conversation) => {
                const active =
                  String(conversation.support_conversation_id) === String(selectedId);
                return (
                  <ListItemButton
                    key={conversation.support_conversation_id}
                    selected={active}
                    onClick={() =>
                      setSelectedId(conversation.support_conversation_id)
                    }
                    sx={{ alignItems: "flex-start", gap: 1.5, py: 1.5 }}
                  >
                    <Badge
                      color="error"
                      badgeContent={Number(conversation.unread_count) || 0}
                      overlap="circular"
                    >
                      <Avatar
                        src={conversation.buyer_avatar || undefined}
                        sx={{ width: 40, height: 40, bgcolor: "error.main", fontSize: 14 }}
                      >
                        {initials(conversation.buyer_name)}
                      </Avatar>
                    </Badge>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="baseline"
                        spacing={1}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={Number(conversation.unread_count) ? 800 : 600}
                          noWrap
                        >
                          {conversation.buyer_name || "Buyer"}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ flexShrink: 0 }}
                        >
                          {formatTime(conversation.last_message_time)}
                        </Typography>
                      </Stack>
                      {conversation.buyer_email && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          component="div"
                          sx={{ fontSize: 11 }}
                        >
                          {conversation.buyer_email}
                        </Typography>
                      )}
                      {conversation.last_issue_type && (
                        <Chip
                          size="small"
                          label={conversation.last_issue_type}
                          variant="outlined"
                          sx={{ height: 20, fontSize: 10.5, my: 0.25 }}
                        />
                      )}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        component="div"
                      >
                        {conversation.last_sender_type === "admin" ? "You: " : ""}
                        {conversation.last_message || ""}
                      </Typography>
                    </Box>
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Box>

        {/* Thread */}
        <Box
          sx={{
            display: { xs: selectedId ? "flex" : "none", md: "flex" },
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {!selectedId ? (
            <Stack
              alignItems="center"
              justifyContent="center"
              spacing={1}
              sx={{ flex: 1, p: 4, textAlign: "center" }}
            >
              <ForumOutlinedIcon sx={{ fontSize: 48, color: "text.disabled" }} />
              <Typography color="text.secondary">
                Select a conversation to read and reply.
              </Typography>
            </Stack>
          ) : (
            <>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}
              >
                <IconButton
                  size="small"
                  aria-label="Back to conversations"
                  onClick={() => setSelectedId(null)}
                  sx={{ display: { md: "none" } }}
                >
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
                <Avatar
                  src={selectedConversation?.buyer_avatar || undefined}
                  sx={{ width: 36, height: 36, bgcolor: "error.main", fontSize: 13 }}
                >
                  {initials(selectedConversation?.buyer_name)}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography fontWeight={700} noWrap>
                    {selectedConversation?.buyer_name || "Buyer"}
                  </Typography>
                  {selectedConversation?.buyer_email && (
                    <Typography variant="caption" color="text.secondary" noWrap component="div">
                      {selectedConversation.buyer_email}
                    </Typography>
                  )}
                </Box>
                {selectedConversation?.last_issue_type && (
                  <Chip
                    size="small"
                    color="error"
                    variant="outlined"
                    label={selectedConversation.last_issue_type}
                    sx={{ height: 24, fontSize: 11, flexShrink: 0 }}
                  />
                )}
              </Stack>

              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  p: { xs: 1.5, sm: 2 },
                  backgroundColor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(2, 6, 23, 0.35)"
                      : "rgba(248, 250, 252, 0.7)",
                }}
              >
                {loadingThread ? (
                  <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
                    <CircularProgress size={26} />
                  </Box>
                ) : !thread?.messages?.length ? (
                  <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 6 }}>
                    No messages in this conversation yet.
                  </Typography>
                ) : (
                  <Stack spacing={1.25}>
                    {thread.messages.map((message) => {
                      const fromAdmin = message.sender_type === "admin";
                      return (
                        <Box
                          key={message.support_message_id}
                          sx={{
                            display: "flex",
                            justifyContent: fromAdmin ? "flex-end" : "flex-start",
                          }}
                        >
                          <Box
                            sx={{
                              maxWidth: { xs: "88%", sm: "70%" },
                              px: 1.75,
                              py: 1,
                              borderRadius: 2.5,
                              backgroundColor: fromAdmin
                                ? "error.main"
                                : (theme) => theme.palette.background.paper,
                              color: fromAdmin ? "#fff" : "text.primary",
                              border: fromAdmin ? "none" : "1px solid",
                              borderColor: "divider",
                              boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
                            }}
                          >
                            {!fromAdmin && message.sender_name && (
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 700, display: "block", mb: 0.25 }}
                              >
                                {message.sender_name}
                              </Typography>
                            )}
                            {message.issue_type && (
                              <Chip
                                size="small"
                                label={message.issue_type}
                                sx={{
                                  height: 20,
                                  fontSize: 10.5,
                                  mb: 0.5,
                                  fontWeight: 700,
                                  backgroundColor: fromAdmin
                                    ? "rgba(255,255,255,0.22)"
                                    : "action.selected",
                                  color: fromAdmin ? "#fff" : "text.primary",
                                }}
                              />
                            )}
                            <Typography
                              variant="body2"
                              sx={{ whiteSpace: "pre-line", wordBreak: "break-word" }}
                            >
                              {message.message_data}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                display: "block",
                                mt: 0.5,
                                textAlign: "right",
                                opacity: 0.75,
                                fontSize: 10.5,
                              }}
                            >
                              {fromAdmin ? "Support · " : ""}
                              {formatTime(message.created_at)}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                    <Box ref={bottomRef} />
                  </Stack>
                )}
              </Box>

              <Box sx={{ p: { xs: 1.5, sm: 2 }, borderTop: "1px solid", borderColor: "divider" }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={5}
                  placeholder="Write a reply…"
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={sending}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            color="error"
                            aria-label="Send reply"
                            onClick={handleSend}
                            disabled={!reply.trim() || sending}
                          >
                            {sending ? (
                              <CircularProgress size={20} />
                            ) : (
                              <SendRoundedIcon />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Press Enter to send, Shift + Enter for a new line.
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </Paper>

      <Button
        variant="text"
        size="small"
        onClick={loadInbox}
        sx={{ mt: 1.5, textTransform: "none" }}
      >
        Refresh inbox
      </Button>
    </Box>
  );
}
