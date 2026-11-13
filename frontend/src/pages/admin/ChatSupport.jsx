import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PermMediaOutlinedIcon from "@mui/icons-material/PermMediaOutlined";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import { useSearchParams } from "react-router-dom";
import {
  fetchSupportInbox,
  fetchSupportThread,
  sendSupportReply,
} from "../../api/admin/supportChatAPI";
import ConnectionErrorPanel from "../../components/admin/ConnectionErrorPanel";
import AdminLoadingPanel from "../../components/admin/AdminLoadingPanel";
import ChatWorkspace from "../../components/chat/ChatWorkspace";
import ChatConversationItem from "../../components/chat/ChatConversationItem";
import ChatMessageBubble from "../../components/chat/ChatMessageBubble";
import ChatComposer, {
  ChatAttachmentPreview,
} from "../../components/chat/ChatComposer";
import MessageMedia from "../../components/seller/Message/MessageMedia";
import MessageMediaPreview from "../../components/seller/Message/MessageMediaPreview";

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
  (name || "A")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";

const toAbsoluteMediaUrl = (url) => {
  if (!url) return null;
  if (/^(https?:|blob:|data:)/i.test(url)) return url;
  if (url.startsWith("/")) return `http://localhost:5000${url}`;
  return `http://localhost:5000/${url}`;
};

const toAbsoluteProfileImageUrl = (image, role) => {
  const folderRole = role === "seller" ? "seller" : "buyer";
  if (!image) {
    return `http://localhost:5000/uploads/${folderRole}/profile.jpg`;
  }
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith("/")) return `http://localhost:5000${image}`;
  return `http://localhost:5000/uploads/${folderRole}/uploadProfile/${encodeURIComponent(image)}`;
};

const isVideoAttachment = (url, mediaType) =>
  mediaType?.startsWith("video/") ||
  /\.(mp4|mov|webm|ogg|m4v)(\?|$)/i.test(url || "");

const isImageAttachment = (url, mediaType) =>
  !isVideoAttachment(url, mediaType) &&
  (mediaType?.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|bmp|avif)(\?|$)/i.test(url || ""));

const clearConversationUnread = (items, conversationId) =>
  items.map((item) =>
    String(item.support_conversation_id) === String(conversationId)
      ? { ...item, unread_count: 0 }
      : item,
  );

export default function ChatSupport() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [searchParams] = useSearchParams();
  const targetConversationId = searchParams.get("conversation")?.trim() || "";

  const [conversations, setConversations] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [inboxFilter, setInboxFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(targetConversationId || null);
  const [thread, setThread] = useState(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [reply, setReply] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachedPreview, setAttachedPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const shouldScrollToBottomRef = useRef(true);
  const selectedIdRef = useRef(selectedId);
  const lastThreadCountRef = useRef(0);
  const attachedPreviewRef = useRef(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    attachedPreviewRef.current = attachedPreview;
  }, [attachedPreview]);

  useEffect(
    () => () => {
      if (attachedPreviewRef.current) {
        URL.revokeObjectURL(attachedPreviewRef.current);
      }
    },
    [],
  );

  useLayoutEffect(() => {
    if (!shouldScrollToBottomRef.current || !messagesContainerRef.current) return;
    messagesContainerRef.current.scrollTop =
      messagesContainerRef.current.scrollHeight;
    shouldScrollToBottomRef.current = false;
  }, [thread]);

  const clearAttachment = useCallback(() => {
    if (attachedPreviewRef.current) {
      URL.revokeObjectURL(attachedPreviewRef.current);
    }
    setAttachedPreview(null);
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const loadInbox = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoadingInbox(true);
        setError("");
      }
      const rows = await fetchSupportInbox();
      setConversations(rows);
      return rows;
    } catch (loadError) {
      if (!silent) {
        setError(loadError.message || "Unable to load chat support.");
      }
      return null;
    } finally {
      if (!silent) setLoadingInbox(false);
    }
  }, []);

  const loadThread = useCallback(async (conversationId, { silent = false } = {}) => {
    if (!conversationId) return;
    if (!silent) {
      setLoadingThread(true);
      setThread(null);
      setError("");
    }
    try {
      const data = await fetchSupportThread(conversationId);
      if (String(selectedIdRef.current) !== String(conversationId)) return;
      const incomingCount = Array.isArray(data?.messages) ? data.messages.length : 0;
      if (!silent || incomingCount > lastThreadCountRef.current) {
        shouldScrollToBottomRef.current = true;
      }
      lastThreadCountRef.current = incomingCount;
      setThread(data);
      setConversations((prev) => clearConversationUnread(prev, conversationId));
    } catch (threadError) {
      if (String(selectedIdRef.current) !== String(conversationId)) return;
      if (!silent) {
        setError(threadError.message || "Unable to load this conversation.");
      }
    } finally {
      if (!silent && String(selectedIdRef.current) === String(conversationId)) {
        setLoadingThread(false);
      }
    }
  }, []);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    if (targetConversationId) {
      setSelectedId(targetConversationId);
    }
  }, [targetConversationId]);

  useEffect(() => {
    if (!selectedId) {
      setThread(null);
      lastThreadCountRef.current = 0;
      return;
    }
    shouldScrollToBottomRef.current = true;
    lastThreadCountRef.current = 0;
    loadThread(selectedId);
  }, [selectedId, loadThread]);

  // Keep the inbox and open thread fresh while visible.
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      loadInbox({ silent: true });
      if (selectedIdRef.current) {
        loadThread(selectedIdRef.current, { silent: true });
      }
    }, POLL_INTERVAL);

    return () => window.clearInterval(interval);
  }, [loadInbox, loadThread]);

  const handleSelectConversation = (conversationId) => {
    if (String(conversationId) === String(selectedId)) return;
    clearAttachment();
    setError("");
    setNotice("");
    setConversations((prev) => clearConversationUnread(prev, conversationId));
    setSelectedId(conversationId);
  };

  const handleAttachmentChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError("Attachments must be 20MB or smaller.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (attachedPreviewRef.current) {
      URL.revokeObjectURL(attachedPreviewRef.current);
    }
    setError("");
    setAttachedFile(file);
    setAttachedPreview(URL.createObjectURL(file));
  };

  const handleSend = async () => {
    const message = reply.trim();
    if ((!message && !attachedFile) || !selectedId || sending) return;

    setSending(true);
    setError("");
    setNotice("");
    try {
      let payload;
      if (attachedFile) {
        const formData = new FormData();
        formData.append("message", message);
        formData.append("image", attachedFile);
        payload = formData;
      } else {
        payload = { message };
      }
      await sendSupportReply(selectedId, payload);
      setReply("");
      clearAttachment();
      shouldScrollToBottomRef.current = true;
      await Promise.all([
        loadThread(selectedId, { silent: true }),
        loadInbox({ silent: true }),
      ]);
      setNotice("Reply sent.");
    } catch (sendError) {
      setError(sendError.message || "Unable to send your reply.");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const inboxFilters = useMemo(() => {
    const unreadCount = conversations.filter((item) => Number(item.unread_count || 0) > 0).length;
    const sellerCount = conversations.filter((item) => item.account_role === "seller").length;
    const buyerCount = conversations.filter((item) => item.account_role !== "seller").length;
    return [
      { id: "all", label: "All", count: conversations.length },
      { id: "unread", label: "Unread", count: unreadCount },
      { id: "seller", label: "Sellers", count: sellerCount },
      { id: "buyer", label: "Buyers", count: buyerCount },
    ];
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return conversations.filter((item) => {
      if (inboxFilter === "unread" && Number(item.unread_count || 0) <= 0) return false;
      if (inboxFilter === "seller" && item.account_role !== "seller") return false;
      if (inboxFilter === "buyer" && item.account_role === "seller") return false;
      if (!query) return true;
      return [
        item.account_name,
        item.account_email,
        item.account_role,
        item.last_message,
        item.last_issue_type,
      ].some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [conversations, inboxFilter, searchQuery]);

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (item) => String(item.support_conversation_id) === String(selectedId),
      ) ||
      thread?.conversation ||
      null,
    [conversations, selectedId, thread],
  );

  const sharedMedia = useMemo(() => {
    const list = Array.isArray(thread?.messages) ? thread.messages : [];
    return list
      .filter((msg) => {
        const url = toAbsoluteMediaUrl(msg.image);
        return url && (isImageAttachment(url, msg.media_type) || isVideoAttachment(url, msg.media_type));
      })
      .map((msg) => ({
        id: msg.support_message_id,
        image: toAbsoluteMediaUrl(msg.image),
        mediaType: msg.media_type || "",
      }));
  }, [thread]);

  if (loadingInbox && !conversations.length && !thread) {
    return (
      <AdminLoadingPanel
        title="Chat Support"
        subtitle="Communicate with buyers and sellers and manage support inquiries in one place."
        showMetrics={false}
        showFilters={false}
      />
    );
  }

  if (error && !conversations.length && !thread && !selectedId) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Chat Support</title>
        </Helmet>
        <ConnectionErrorPanel
          title="Chat Support Unavailable"
          message={error}
          onRetry={loadInbox}
        />
      </Box>
    );
  }

  const selectedDisplayName =
    selectedConversation?.account_name ||
    (selectedConversation?.account_role === "seller"
      ? "Seller"
      : selectedConversation?.account_role === "buyer"
        ? "Buyer"
        : "Support conversation");

  return (
    <>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Chat Support</title>
      </Helmet>

      <ChatWorkspace
        title="Chat Support"
        subtitle="Communicate with buyers and sellers and reply to support requests with text or attachments."
        onRefresh={() => {
          loadInbox();
          if (selectedId) loadThread(selectedId);
        }}
        refreshing={loadingInbox}
        isMobile={isMobile}
        hasActiveThread={Boolean(selectedId)}
        onBack={() => {
          clearAttachment();
          setSelectedId(null);
        }}
        alerts={
          (error || notice) && (
            <Stack spacing={1} sx={{ mb: 1.5 }}>
              {error && (
                <Alert severity="error" onClose={() => setError("")}>
                  {error}
                </Alert>
              )}
              {notice && (
                <Alert severity="success" onClose={() => setNotice("")}>
                  {notice}
                </Alert>
              )}
            </Stack>
          )
        }
        searchPlaceholder="Search buyer or seller..."
        searchQuery={searchQuery}
        onSearchChange={(event) => setSearchQuery(event.target.value)}
        filters={inboxFilters}
        activeFilter={inboxFilter}
        onFilterChange={setInboxFilter}
        listLoading={loadingInbox && !conversations.length}
        listEmpty={
          filteredConversations.length === 0 ? (
            <Stack alignItems="center" spacing={1} sx={{ textAlign: "center" }}>
              <ForumOutlinedIcon sx={{ fontSize: 40, color: "text.disabled" }} />
              <Typography variant="body2" color="text.secondary">
                {conversations.length
                  ? "No conversations match this filter."
                  : "No conversations yet. Start a chat from Customers or Students, or wait for support requests."}
              </Typography>
            </Stack>
          ) : null
        }
        listContent={filteredConversations.map((conversation) => {
          const displayName =
            conversation.account_name ||
            (conversation.account_role === "seller" ? "Seller" : "Buyer");
          const previewText = conversation.last_message
            ? `${conversation.last_sender_type === "admin" ? "You: " : ""}${conversation.last_message}`
            : "No messages yet";
          const chips = [
            {
              label: conversation.account_role === "seller" ? "Seller" : "Buyer",
              color: "default",
              variant: "outlined",
            },
            ...(conversation.last_issue_type
              ? [
                  {
                    label: conversation.last_issue_type,
                    color: "error",
                    variant: "outlined",
                  },
                ]
              : []),
          ];

          return (
            <ChatConversationItem
              key={conversation.support_conversation_id}
              name={displayName}
              avatarSrc={toAbsoluteProfileImageUrl(
                conversation.account_avatar,
                conversation.account_role,
              )}
              timeLabel={formatTime(conversation.last_message_time)}
              preview={previewText}
              unreadCount={conversation.unread_count}
              selected={
                String(conversation.support_conversation_id) === String(selectedId)
              }
              chips={chips}
              onSelect={() =>
                handleSelectConversation(conversation.support_conversation_id)
              }
            />
          );
        })}
        threadHeaderLeft={
          <>
            <Avatar
              src={
                selectedConversation
                  ? toAbsoluteProfileImageUrl(
                      selectedConversation.account_avatar,
                      selectedConversation.account_role,
                    )
                  : undefined
              }
              alt={selectedDisplayName}
              sx={{ bgcolor: "error.main", color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0 }}
            >
              {initials(selectedConversation?.account_name)}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.75}
                flexWrap="wrap"
                useFlexGap
              >
                <Typography variant="subtitle1" fontWeight={700} noWrap>
                  {selectedDisplayName}
                </Typography>
                {selectedConversation?.account_role && (
                  <Chip
                    size="small"
                    label={
                      selectedConversation.account_role === "seller"
                        ? "Seller"
                        : "Buyer"
                    }
                    variant="outlined"
                    sx={{ height: 22, fontSize: 11 }}
                  />
                )}
                {selectedConversation?.last_issue_type && (
                  <Chip
                    size="small"
                    color="error"
                    variant="outlined"
                    label={selectedConversation.last_issue_type}
                    sx={{ height: 22, fontSize: 11 }}
                  />
                )}
              </Stack>
              {selectedConversation?.account_email && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  component="div"
                >
                  {selectedConversation.account_email}
                </Typography>
              )}
            </Box>
          </>
        }
        threadHeaderRight={
          <>
            <IconButton
              size="small"
              aria-label="Conversation options"
              aria-controls={menuAnchorEl ? "support-chat-actions" : undefined}
              aria-haspopup="true"
              onClick={(event) => setMenuAnchorEl(event.currentTarget)}
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              id="support-chat-actions"
              anchorEl={menuAnchorEl}
              open={Boolean(menuAnchorEl)}
              onClose={() => setMenuAnchorEl(null)}
            >
              <MenuItem
                onClick={() => {
                  setMenuAnchorEl(null);
                  setMediaDialogOpen(true);
                }}
              >
                <PermMediaOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} />
                View photos and videos
              </MenuItem>
            </Menu>
          </>
        }
        messagesRef={messagesContainerRef}
        messagesContent={
          loadingThread ? (
            <Box sx={{ flex: 1, display: "grid", placeItems: "center", py: 6 }}>
              <CircularProgress size={26} color="error" />
            </Box>
          ) : !thread?.messages?.length ? (
            <Typography color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
              Start the conversation.
            </Typography>
          ) : (
            thread.messages.map((message) => {
              const isMine = message.sender_type === "admin";
              return (
                <ChatMessageBubble
                  key={message.support_message_id}
                  isMine={isMine}
                  senderName={!isMine ? message.sender_name : ""}
                  issueType={message.issue_type}
                  text={message.message_data}
                  image={toAbsoluteMediaUrl(message.image)}
                  mediaType={message.media_type}
                  fileName={message.file_name}
                  time={formatTime(message.created_at)}
                  footerLabel={isMine ? "Support · " : ""}
                  onViewMedia={setSelectedMedia}
                />
              );
            })
          )
        }
        attachmentPreview={
          <ChatAttachmentPreview
            file={attachedFile}
            previewUrl={attachedPreview}
            onRemove={clearAttachment}
          />
        }
        composer={
          <ChatComposer
            value={reply}
            onChange={setReply}
            onSend={handleSend}
            placeholder="Write a reply..."
            sending={sending}
            canSend={Boolean(reply.trim() || attachedFile)}
            hasAttachment={Boolean(attachedPreview)}
            fileInputRef={fileInputRef}
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            onFileChange={handleAttachmentChange}
          />
        }
        emptyThreadTitle="Select a support conversation"
        emptyThreadSubtitle="Choose a buyer or seller thread on the left to review their inquiry and reply."
      />

      <MessageMedia
        open={mediaDialogOpen}
        onClose={() => setMediaDialogOpen(false)}
        sharedMedia={sharedMedia}
        onViewMedia={setSelectedMedia}
      />
      <MessageMediaPreview
        selectedMedia={selectedMedia}
        onClose={() => setSelectedMedia(null)}
        isMobile={isMobile}
      />
    </>
  );
}
