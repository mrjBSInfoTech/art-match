import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";

import MoreVertIcon from "@mui/icons-material/MoreVert";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PermMediaOutlinedIcon from "@mui/icons-material/PermMediaOutlined";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import ChatPinDialog from "../../components/chat/ChatPinDialog";
import ChatRecoveryDialog from "../../components/chat/ChatRecoveryDialog";
import ChatWorkspace from "../../components/chat/ChatWorkspace";
import ChatComposer, {
  ChatAttachmentPreview,
} from "../../components/chat/ChatComposer";
import ConversationReturns from "../../components/buyer/Message/ConversationReturns";
import MessageCard from "../../components/seller/Message/MessageCard";
import MessageConversationCard from "../../components/seller/Message/MessageConversationCard";
import MessageNoticeCard from "../../components/seller/Message/MessageNoticeCard";
import MessageMedia from "../../components/seller/Message/MessageMedia";
import MessageMediaPreview from "../../components/seller/Message/MessageMediaPreview";
import MessageDelete from "../../components/seller/Message/MessageDelete";
import MessageBlock from "../../components/seller/Message/MessageBlock";
import ConnectionErrorPanel from "../../components/seller/ConnectionErrorPanel";
import SellerLoadingPanel from "../../components/seller/SellerLoadingPanel";
import { useSearchParams } from "react-router-dom";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

import {
  fetchSellerConversations,
  fetchSellerMessages,
  fetchSellerLatestMessage,
  fetchSellerNotifications,
  deleteSellerConversation,
  fetchSellerChatBlockStatus,
  blockSellerChatUser,
  unblockSellerChatUser,
  startSellerConversation,
  sendSellerMessage,
  registerSellerChatKey,
  fetchSellerOwnChatKey,
  fetchSellerChatRecoveryBackup,
  saveSellerChatRecoveryBackup,
  resetSellerChatRecoveryBackup,
  fetchBuyerChatKey,
} from "../../api/seller/messageAPI";
import { subscribeToChatEvents } from "../../api/chatEvents";
import {
  fetchSellerSupportConversation,
  fetchSellerSupportSummary,
  sendSellerSupportMessage,
} from "../../api/seller/supportChatAPI";
import {
  decryptChatMessage,
  encryptChatMessage,
  createChatKeyPair,
  encryptChatKeyBackup,
  loadChatKeyPair,
  restoreChatKeyPair,
} from "../../utils/chatEncryption";

const SUPPORT_CHAT_ID = "support";

const formatMessageTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};
const clearConversationUnreadCount = (items, conversationId) =>
  items.map((conversation) =>
    String(conversation.conversation_id) === String(conversationId)
      ? { ...conversation, unread_count: 0 }
      : conversation,
  );

const toAbsoluteMediaUrl = (url) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `http://localhost:5000${url}`;
  return `http://localhost:5000/${url}`;
};

const toAbsoluteProfileImageUrl = (image, accountType) => {
  if (!image) return accountType === "seller"
    ? "http://localhost:5000/uploads/seller/profile.jpg"
    : "http://localhost:5000/uploads/buyer/profile.jpg";
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith("/")) return `http://localhost:5000${image}`;
  const folder = "uploadProfile";
  return `http://localhost:5000/uploads/${accountType}/${folder}/${encodeURIComponent(image)}`;
};

export default function Messages() {
  const [searchParams] = useSearchParams();
  const targetConversationId = searchParams.get("conversation")?.trim() || "";
  const targetReturnId = searchParams.get("return")?.trim() || "";
  const targetBuyerId = searchParams.get("buyer")?.trim() || searchParams.get("customer")?.trim() || "";
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(
    () => /^\d+$/.test(targetConversationId) && Number(targetConversationId) > 0
      ? Number(targetConversationId) : null,
  );
  const [returnsRefreshVersion, setReturnsRefreshVersion] = useState(0);
  const [chatUnlockRequested, setChatUnlockRequested] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inboxFilter, setInboxFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [attachedPreview, setAttachedPreview] = useState(null);
  const [attachedFile, setAttachedFile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [recoveryVersion, setRecoveryVersion] = useState(0);
  const [recoveryStatus, setRecoveryStatus] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [, setNotifications] = useState([]);
  const [selectedNotificationId, setSelectedNotificationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState("");
  // "" = closed, "enter" = unlock a legacy PIN backup
  const [pinDialogMode, setPinDialogMode] = useState("");
  const pinDialogOpen = pinDialogMode !== "";
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState("");
  const [blockStatus, setBlockStatus] = useState({
    blocked_by_me: false,
    blocked_by_other: false,
  });
  const [blockStatusConversationId, setBlockStatusConversationId] = useState(null);
  const [supportSummary, setSupportSummary] = useState(null);
  const [supportMessages, setSupportMessages] = useState([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [sendingSupport, setSendingSupport] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const isSupportChat = selectedConversationId === SUPPORT_CHAT_ID;

  const fileInputRef = useRef(null);
  const privateKeyRef = useRef(null);
  const publicKeyJwkRef = useRef("");
  const recoveryBackupRef = useRef(null);
  const recoveryStorageKeyRef = useRef("");
  const pendingRecoveryRef = useRef(false);
  const previewPublicKeysRef = useRef(new Map());
  const decryptedPreviewCacheRef = useRef(new Map());
  const messagesContainerRef = useRef(null);
  const shouldScrollToBottomRef = useRef(true);
  const lastMessageIdsRef = useRef(null);
  const loadMessagesRef = useRef(null);

  useLayoutEffect(() => {
    if (!shouldScrollToBottomRef.current || !messagesContainerRef.current) return;
    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    shouldScrollToBottomRef.current = false;
  }, [messages, supportMessages]);

  useEffect(() => {
    const initializeEncryption = async () => {
      try {
        const accountId = localStorage.getItem("seller_student_id") || "current";
        const storageKey = `seller_chat_key_pair_${accountId}`;
        recoveryStorageKeyRef.current = storageKey;
        const [localKeyPair, backup] = await Promise.all([
          loadChatKeyPair(storageKey),
          fetchSellerChatRecoveryBackup(),
        ]);
        recoveryBackupRef.current = backup;

        if (!localKeyPair && backup) {
          if (Number(backup.backupVersion || 1) === 1) {
            setPinDialogMode("enter");
          } else {
            setRecoveryMode("restore-key");
          }
          return;
        }

        if (backup && localKeyPair && (localKeyPair.publicKey.x !== JSON.parse(backup.publicKey).x
          || localKeyPair.publicKey.y !== JSON.parse(backup.publicKey).y)) {
          if (Number(backup.backupVersion || 1) === 1) {
            setPinDialogMode("enter");
          } else {
            setRecoveryMode("restore-key");
          }
          return;
        }

        if (!localKeyPair && !backup) {
          const existingPublicKey = await fetchSellerOwnChatKey();
          if (existingPublicKey) {
            setRecoveryMode("fresh");
            return;
          }
          setRecoveryMode("setup");
          return;
        }

        const keyPair = localKeyPair || await createChatKeyPair(storageKey);
        privateKeyRef.current = keyPair.privateKey;
        publicKeyJwkRef.current = keyPair.publicKeyJwk;
        await registerSellerChatKey(keyPair.publicKeyJwk);
        if (!backup) {
          privateKeyRef.current = null;
          publicKeyJwkRef.current = "";
          setRecoveryMode("setup");
          return;
        }
        setEncryptionReady(true);
        if (Number(backup.backupVersion || 1) === 1) {
          setRecoveryMode("upgrade");
        }
      } catch (err) {
        setError(err.message || "Secure messaging could not be initialized");
      }
    };

    initializeEncryption();
  }, []);

  const handleRecoverySubmit = async (pin) => {
    setRecoveryBusy(true);
    setRecoveryError("");
    try {
      if (recoveryMode === "setup" || recoveryMode === "upgrade") {
        if (!privateKeyRef.current) {
          const keyPair = await createChatKeyPair(recoveryStorageKeyRef.current);
          privateKeyRef.current = keyPair.privateKey;
          publicKeyJwkRef.current = keyPair.publicKeyJwk;
          await registerSellerChatKey(keyPair.publicKeyJwk);
          pendingRecoveryRef.current = true;
        }
        const backup = await encryptChatKeyBackup(
          {
            privateKey: privateKeyRef.current,
            publicKeyJwk: publicKeyJwkRef.current,
          },
          pin,
        );
        await saveSellerChatRecoveryBackup(backup);
        recoveryBackupRef.current = backup;
      } else {
        pendingRecoveryRef.current = true;
        const keyPair = await restoreChatKeyPair(
          recoveryStorageKeyRef.current,
          recoveryBackupRef.current,
          pin,
        );
        privateKeyRef.current = keyPair.privateKey;
        publicKeyJwkRef.current = keyPair.publicKeyJwk;
        await registerSellerChatKey(keyPair.publicKeyJwk);
      }
      const restoredExistingKey = pinDialogMode !== "" || recoveryMode === "restore-key";
      setRecoveryMode("");
      setPinDialogMode("");
      setEncryptionReady(true);
      if (restoredExistingKey) {
        decryptedPreviewCacheRef.current.clear();
        lastMessageIdsRef.current = null;
        previewPublicKeysRef.current.clear();
        setRecoveryVersion((version) => version + 1);
      }
    } catch (err) {
      setRecoveryError(
        err.message
          || (recoveryMode === "setup" || recoveryMode === "upgrade"
            ? "Unable to create your recovery key"
            : "Unable to unlock secure messaging"),
      );
    } finally {
      setRecoveryBusy(false);
    }
  };

  const handleRecoverMessages = () => {
    if (!recoveryBackupRef.current) {
      setRecoveryError("No recovery backup is saved for this account.");
      return;
    }
    setRecoveryError("");
    setRecoveryStatus("");
    setChatUnlockRequested(true);
    if (Number(recoveryBackupRef.current.backupVersion || 1) === 1) {
      setPinDialogMode("restore");
    } else {
      setRecoveryMode("restore-key");
    }
  };
  const recoveryLabel =
    Number(recoveryBackupRef.current?.backupVersion || 1) === 1
      ? "Recover with six-digit passkey"
      : "Recover with recovery key";

  const handleRecoveryReset = async () => {
    setRecoveryBusy(true);
    setRecoveryError("");
    try {
      await resetSellerChatRecoveryBackup();
      setRecoveryMode("");
      const keyPair = await createChatKeyPair(recoveryStorageKeyRef.current);
      privateKeyRef.current = keyPair.privateKey;
      publicKeyJwkRef.current = keyPair.publicKeyJwk;
      await registerSellerChatKey(keyPair.publicKeyJwk);
      setRecoveryMode("setup");
      setRecoveryError("");
    } catch (err) {
      setRecoveryError(err.message || "Unable to reset chat recovery");
    } finally {
      setRecoveryBusy(false);
    }
  };

  const loadSupportThread = useCallback(async ({ silent } = {}) => {
    if (!silent) setSupportLoading(true);
    try {
      const data = await fetchSellerSupportConversation();
      const summary = await fetchSellerSupportSummary();
      setSupportMessages(
        data.messages.map((message) => ({
          id: `support-${message.support_message_id}`,
          sender: message.sender_type === "seller" ? "seller" : "admin",
          text: message.message_data,
          image: toAbsoluteMediaUrl(message.image),
          mediaType: message.media_type || "",
          fileName: message.file_name || "",
          time: formatMessageTime(message.created_at),
        })),
      );
      setSupportSummary(summary);
    } catch (error) {
      setError(error.message || "Unable to load support messages.");
    } finally {
      if (!silent) setSupportLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setSupportSummary(await fetchSellerSupportSummary());
      } catch (error) {
        setError(error.message || "Unable to load support messages.");
      }
    };
    loadSummary();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") loadSummary();
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isSupportChat) return undefined;
    loadSupportThread();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadSupportThread({ silent: true });
      }
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [isSupportChat, loadSupportThread]);

  const activeChat = useMemo(
    () =>
      conversations.find(
        (chat) => chat.conversation_id === selectedConversationId,
      ) || null,
    [conversations, selectedConversationId],
  );
  const supportChatEntry = useMemo(() => {
    if (!supportSummary && !isSupportChat) return null;
    return {
      conversation_id: SUPPORT_CHAT_ID,
      other_name: "ArtMatch Support",
      other_id: null,
      unread_count: Number(supportSummary?.unread_count || 0),
      last_message: supportSummary?.last_message || "",
      last_message_time: supportSummary?.last_message_time,
      last_message_encrypted: false,
      is_support: true,
    };
  }, [isSupportChat, supportSummary]);
  const activeSupportChat = isSupportChat && supportChatEntry;
  const displayedMessages = activeSupportChat ? supportMessages : messages;
  const loadConversationList = useCallback(async () => {
    const conversationList = (await fetchSellerConversations()) || [];
    if (!privateKeyRef.current) return conversationList;

    return Promise.all(
      conversationList.map(async (chat) => {
        try {
          const latestMessage = await fetchSellerLatestMessage(
            chat.conversation_id,
          );
          if (!latestMessage) {
            return { ...chat, last_message: "", last_message_encrypted: false };
          }
          if (!latestMessage.encryption_iv) {
            return {
              ...chat,
              last_message:
                latestMessage.message_data ||
                (latestMessage.image ? "Attachment" : ""),
              last_message_encrypted: false,
            };
          }

          const cachedPreview = decryptedPreviewCacheRef.current.get(
            String(chat.conversation_id),
          );
          if (
            cachedPreview &&
            String(cachedPreview.messageId) === String(latestMessage.message_id)
          ) {
            return {
              ...chat,
              last_message: cachedPreview.text,
              last_message_encrypted: false,
            };
          }

          let keyAgreementPublicKey = latestMessage.sender_public_key;
          if (latestMessage.sender_type === "seller" && chat.other_id) {
            const otherId = String(chat.other_id);
            if (!previewPublicKeysRef.current.has(otherId)) {
              const keyRequest = fetchBuyerChatKey(chat.other_id).catch(
                (error) => {
                  previewPublicKeysRef.current.delete(otherId);
                  throw error;
                },
              );
              previewPublicKeysRef.current.set(
                otherId,
                keyRequest,
              );
            }
            keyAgreementPublicKey =
              await previewPublicKeysRef.current.get(otherId);
          }

          const decrypted = await decryptChatMessage({
            privateKey: privateKeyRef.current,
            message: latestMessage,
            keyAgreementPublicKey,
          });
          const previewText =
            decrypted.text.trim() || (latestMessage.image ? "Attachment" : "");
          decryptedPreviewCacheRef.current.set(
            String(chat.conversation_id),
            { messageId: latestMessage.message_id, text: previewText },
          );

          return {
            ...chat,
            last_message: previewText,
            last_message_encrypted: false,
          };
        } catch {
          return {
            ...chat,
            last_message: "Unable to decrypt this message on this device.",
            last_message_encrypted: false,
          };
        }
      }),
    );
  }, []);
  const visibleNotifications = [];
  const activeNotification = null;
  const selectedReturnId = String(selectedConversationId) === targetConversationId ? targetReturnId : "";
  const isReturnConversation = Boolean(Number(activeChat?.has_return_requests) || selectedReturnId);
  const showChatUnlockDialogs = !loading && (!isReturnConversation || chatUnlockRequested);
  const isChatBlocked =
    String(blockStatusConversationId) === String(selectedConversationId) &&
    (Boolean(blockStatus.blocked_by_me) || Boolean(blockStatus.blocked_by_other));
  const sharedMedia = displayedMessages.filter((message) => {
    if (!message.image) return false;
    return (
      !message.mediaType ||
      message.mediaType.startsWith("image/") ||
      message.mediaType.startsWith("video/") ||
      /\.(jpg|jpeg|png|gif|webp|bmp|avif|mp4|mov|webm|ogg|m4v)(\?|$)/i.test(message.image)
    );
  });

  useEffect(() => {
    if (!/^\d+$/.test(targetConversationId) || Number(targetConversationId) <= 0) return;
    setSelectedConversationId(Number(targetConversationId));
    setSelectedNotificationId(null);
  }, [targetConversationId]);

  useEffect(() => {
    if (!targetBuyerId || targetConversationId) return undefined;
    let active = true;

    const openBuyerConversation = async () => {
      try {
        setError("");
        const result = await startSellerConversation(targetBuyerId);
        const updated = await loadConversationList();
        if (!active) return;
        setConversations(
          clearConversationUnreadCount(updated || [], result.conversation_id),
        );
        setSelectedNotificationId(null);
        setSelectedConversationId(result.conversation_id);
      } catch (err) {
        if (active) setError(err.message || "Unable to open buyer conversation");
      }
    };

    openBuyerConversation();
    return () => {
      active = false;
    };
  }, [encryptionReady, loadConversationList, targetBuyerId, targetConversationId]);

  useEffect(() => {
    if (!selectedConversationId || isSupportChat) {
      setBlockStatusConversationId(null);
      setBlockStatus({ blocked_by_me: false, blocked_by_other: false });
      return undefined;
    }

    let active = true;
    fetchSellerChatBlockStatus(selectedConversationId)
      .then((status) => {
        if (!active) return;
        setBlockStatus(status);
        setBlockStatusConversationId(selectedConversationId);
      })
      .catch((err) => {
        if (active) setError(err.message || "Unable to load chat settings");
      });

    return () => {
      active = false;
    };
  }, [isSupportChat, selectedConversationId]);

  useEffect(() => {
    const loadConversations = async (initialLoad = false) => {
      try {
        if (initialLoad) {
          setLoading(true);
          setError("");
        }
        const conversationList = await loadConversationList();
        const nextSelectedConversationId =
          selectedConversationId ||
          (!isMobile && !selectedNotificationId
            ? conversationList[0]?.conversation_id
            : null);
        setConversations(
          nextSelectedConversationId
            ? clearConversationUnreadCount(
                conversationList,
                nextSelectedConversationId,
              )
            : conversationList,
        );
        if (
          !isMobile &&
          conversationList.length > 0 &&
          !selectedConversationId &&
          !selectedNotificationId
        ) {
          setSelectedConversationId(conversationList[0].conversation_id);
        }
      } catch (err) {
        setError(err.message || "Unable to load conversations");
      } finally {
        if (initialLoad) setLoading(false);
      }
    };

    loadConversations(true);
    const unsubscribe = subscribeToChatEvents("seller", (event) => {
      loadConversations();
      if (
        event.type === "ready" ||
        Number(event.conversation_id) === Number(selectedConversationId)
      ) {
        if (event.type === "ready" || event.type === "return_updated") {
          setReturnsRefreshVersion((current) => current + 1);
        }
        if (event.type !== "return_updated") loadMessagesRef.current?.();
      }
    });

    return unsubscribe;
  }, [
    encryptionReady,
    isMobile,
    loadConversationList,
    selectedConversationId,
    selectedNotificationId,
  ]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setNotifications((await fetchSellerNotifications()) || []);
      } catch (err) {
        setError(err.message || "Unable to load account notices");
      }
    };

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 3000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!selectedConversationId || isSupportChat || !encryptionReady) {
      loadMessagesRef.current = null;
      lastMessageIdsRef.current = null;
      shouldScrollToBottomRef.current = true;
      setMessages([]);
      return;
    }

    lastMessageIdsRef.current = null;
    shouldScrollToBottomRef.current = true;
    setMessages([]);

    const loadMessages = async () => {
      try {
        const data = await fetchSellerMessages(selectedConversationId);
        let recipientPublicKey = null;
        const buyerId = activeChat?.other_id || (data && data.find((m) => m.sender_type === "buyer")?.sender_id);
        if (buyerId) {
          try {
            recipientPublicKey = await fetchBuyerChatKey(buyerId);
          } catch {
            // Show the existing encrypted-message fallback if the buyer key is unavailable.
          }
        }
        const decryptedMessages = await Promise.all(
          (data || []).map(async (msg) => {
            try {
              const decrypted = msg.encryption_iv
                ? await decryptChatMessage({
                    privateKey: privateKeyRef.current,
                    message: msg,
                    attachmentUrl: toAbsoluteMediaUrl(msg.image),
                    accountType: "seller",
                    keyAgreementPublicKey:
                      msg.sender_type === "seller"
                        ? recipientPublicKey
                        : msg.sender_public_key,
                  })
                : {
                    text: msg.message_data || "",
                    image: msg.media_type === "application/vnd.artmatch.certificate-link"
                      ? msg.image
                      : toAbsoluteMediaUrl(msg.image),
                  };
              return {
                id: msg.message_id,
                sender: msg.sender_type,
                text: decrypted.text,
                image: decrypted.image,
                attachmentError: decrypted.attachmentError,
                mediaType: msg.media_type || "",
                time: formatMessageTime(msg.date_created),
              };
            } catch {
              return {
                id: msg.message_id,
                sender: msg.sender_type,
                text: "Unable to decrypt this message on this device.",
                image: null,
                mediaType: "",
                time: formatMessageTime(msg.date_created),
                decryptionFailed: Boolean(msg.encryption_iv),
                canRecover: Boolean(msg.encryption_iv && recoveryBackupRef.current),
                recoveryUnavailable: Boolean(msg.encryption_iv && !recoveryBackupRef.current),
              };
            }
          }),
        );
        if (pendingRecoveryRef.current) {
          const undecryptedCount = decryptedMessages.filter(
            (message) => message.decryptionFailed,
          ).length;
          setRecoveryStatus(
            undecryptedCount
              ? `The passkey was accepted, but ${undecryptedCount} encrypted message${undecryptedCount === 1 ? "" : "s"} still could not be decrypted. This backup may not match the key used for this conversation.`
              : "The chat key was restored and the messages in this conversation are readable.",
          );
          pendingRecoveryRef.current = false;
        }
        const messageIds = decryptedMessages.map((message) => message.id).join(",");
        if (messageIds !== lastMessageIdsRef.current) {
          const container = messagesContainerRef.current;
          const isNearBottom =
            !container ||
            container.scrollHeight - container.scrollTop - container.clientHeight < 80;
          shouldScrollToBottomRef.current =
            lastMessageIdsRef.current === null || isNearBottom;
          lastMessageIdsRef.current = messageIds;
          setMessages(decryptedMessages);

          const latestText = decryptedMessages.at(-1)?.text || "";
          if (latestText) {
            const latestMessage = data?.at(-1);
            if (latestMessage) {
              decryptedPreviewCacheRef.current.set(
                String(selectedConversationId),
                { messageId: latestMessage.message_id, text: latestText },
              );
            }
            setConversations((current) =>
              current.map((chat) =>
                String(chat.conversation_id) === String(selectedConversationId)
                  ? {
                      ...chat,
                      last_message: latestText,
                      last_message_encrypted: false,
                      last_message_time: decryptedMessages.at(-1)?.time
                        ? new Date().toISOString()
                        : chat.last_message_time,
                    }
                  : chat,
              ),
            );
          }
        }
      } catch (err) {
        setError(err.message || "Unable to load messages");
      }
    };

    loadMessagesRef.current = loadMessages;
    loadMessages();

    return () => {
      if (loadMessagesRef.current === loadMessages) loadMessagesRef.current = null;
    };
  }, [selectedConversationId, isSupportChat, encryptionReady, recoveryVersion, activeChat?.other_id]);

  const normalizeConversationPreview = (value, chat) => {
    const text = String(value ?? "").trim();
    if (chat?.last_message_encrypted) return "Loading message...";
    if (!text || /^\[?encrypted message\]?$/i.test(text)) return "No messages yet";
    return text;
  };

  const activePlaceholder = "Type a message...";

  const chatListItems = useMemo(
    () => (supportChatEntry ? [supportChatEntry, ...conversations] : conversations),
    [conversations, supportChatEntry],
  );

  const inboxFilters = useMemo(() => {
    const unreadCount = chatListItems.filter(
      (chat) => Number(chat.unread_count || 0) > 0,
    ).length;
    const supportCount = chatListItems.filter((chat) => Boolean(chat.is_support)).length;
    return [
      { id: "all", label: "All", count: chatListItems.length },
      { id: "unread", label: "Unread", count: unreadCount },
      { id: "support", label: "Support", count: supportCount },
    ];
  }, [chatListItems]);

  const filteredConversations = [...chatListItems]
    .filter((chat) => {
      if (inboxFilter === "unread" && Number(chat.unread_count || 0) <= 0) return false;
      if (inboxFilter === "support" && !chat.is_support) return false;
      const q = searchQuery.toLowerCase();
      return (
        (chat.other_name || "").toLowerCase().includes(q) ||
        String(chat.other_id || "").includes(searchQuery.trim())
      );
    })
    .sort((a, b) => {
      const aTime = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
      const bTime = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
      return bTime - aTime;
    });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const updated = await loadConversationList();
      setConversations(updated || []);
      const summary = await fetchSellerSupportSummary();
      setSupportSummary(summary);
      if (isSupportChat) {
        await loadSupportThread({ silent: true });
      } else if (selectedConversationId && loadMessagesRef.current) {
        await loadMessagesRef.current();
      }
    } catch (err) {
      setError(err.message || "Unable to refresh messages");
    } finally {
      setRefreshing(false);
    }
  }, [isSupportChat, loadConversationList, loadSupportThread, selectedConversationId]);

  const searchedBuyerId = searchQuery.trim();
  const canStartConversation =
    /^\d+$/.test(searchedBuyerId) &&
    !conversations.some((chat) => String(chat.other_id) === searchedBuyerId);

  const handleStartConversation = async () => {
    try {
      setError("");
      const result = await startSellerConversation(searchedBuyerId);
      const updated = await loadConversationList();
      setConversations(updated || []);
      setSelectedConversationId(result.conversation_id);
    } catch (err) {
      setError(err.message || "Unable to start conversation");
    }
  };

  const handleSelectChat = async (conversationId) => {
    if (conversationId === SUPPORT_CHAT_ID) {
      setInputMessage("");
      handleRemoveImage();
      setSelectedConversationId(SUPPORT_CHAT_ID);
      return;
    }
    setConversations((current) =>
      clearConversationUnreadCount(current, conversationId),
    );
    setSelectedConversationId(conversationId);

    try {
      const updated = await loadConversationList();
      setConversations(updated || []);
    } catch {
      // keep the current thread list if preview hydration fails
    }
  };

  const handleDeleteChat = async () => {
    try {
      await deleteSellerConversation(selectedConversationId);
      if (isReturnConversation) {
        setConversations(await loadConversationList());
      } else {
        setConversations((current) =>
          current.filter(
            (chat) => String(chat.conversation_id) !== String(selectedConversationId),
          ),
        );
        setSelectedConversationId(null);
      }
      setMessages([]);
      setActionDialog("");
    } catch (err) {
      setError(err.message || "Unable to delete chat");
    }
  };

  const handleBlockUser = async () => {
    try {
      await blockSellerChatUser(selectedConversationId);
      setBlockStatus((current) => ({ ...current, blocked_by_me: true }));
      setActionDialog("");
    } catch (err) {
      setError(err.message || "Unable to block user");
    }
  };

  const handleUnblockUser = async () => {
    try {
      await unblockSellerChatUser(selectedConversationId);
      setBlockStatus((current) => ({ ...current, blocked_by_me: false }));
    } catch (err) {
      setError(err.message || "Unable to unblock user");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError("Attachments must be 20MB or smaller.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (attachedPreview) {
      URL.revokeObjectURL(attachedPreview);
    }
    setError("");
    const imageUrl = URL.createObjectURL(file);
    setAttachedPreview(imageUrl);
    setAttachedFile(file);
  };

  const handleRemoveImage = () => {
    if (attachedPreview) {
      URL.revokeObjectURL(attachedPreview);
    }
    setAttachedPreview(null);
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async () => {
    if (isSupportChat) {
      const message = inputMessage.trim();
      if ((!message && !attachedFile) || sendingSupport) return;
      try {
        setSendingSupport(true);
        setError("");
        let payload = message;
        if (attachedFile) {
          const formData = new FormData();
          formData.append("message", message);
          formData.append("image", attachedFile);
          payload = formData;
        }
        await sendSellerSupportMessage(payload);
        setInputMessage("");
        handleRemoveImage();
        shouldScrollToBottomRef.current = true;
        await loadSupportThread({ silent: true });
      } catch (error) {
        setError(error.message || "Unable to send your message.");
      } finally {
        setSendingSupport(false);
      }
      return;
    }
    if ((!inputMessage.trim() && !attachedFile) || !activeChat || sendingMessage) return;
    if (!encryptionReady || !privateKeyRef.current) {
      setError("Unlock secure messaging before sending messages");
      return;
    }

    const formData = new FormData();
    formData.append("message", inputMessage.trim());
    if (attachedFile) {
      formData.append("image", attachedFile);
    }

    try {
      setSendingMessage(true);
      const recipientPublicKey = await fetchBuyerChatKey(activeChat.other_id);
      const encrypted = await encryptChatMessage({
        privateKey: privateKeyRef.current,
        recipientPublicKeyJwk: recipientPublicKey,
        text: inputMessage.trim(),
        file: attachedFile,
      });
      formData.set("message", encrypted.encryptedText);
      if (encrypted.encryptedFile) formData.set("image", encrypted.encryptedFile);
      formData.append("sender_public_key", publicKeyJwkRef.current);
      formData.append("encryption_iv", encrypted.encryptionIv);
      formData.append("attachment_iv", encrypted.attachmentIv);
      formData.append("media_type", encrypted.mediaType);
      const sentMessage = await sendSellerMessage(activeChat.other_id, formData);
      shouldScrollToBottomRef.current = true;
      setMessages((prev) =>
        prev.some((message) => String(message.id) === String(sentMessage.message_id))
          ? prev
          : [
              ...prev,
              {
                id: sentMessage.message_id,
                sender: "seller",
                text: inputMessage.trim(),
                image: attachedPreview,
                mediaType: attachedFile?.type || "",
                time: formatMessageTime(new Date().toISOString()),
              },
            ],
      );
      setInputMessage("");
      handleRemoveImage();
      const updated = await loadConversationList();
      setConversations(updated || []);
    } catch (err) {
      setError(err.message || "Unable to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  if (
    loading &&
    !conversations.length &&
    !selectedConversationId &&
    !supportChatEntry &&
    !pinDialogOpen &&
    !recoveryMode
  ) {
    return (
      <SellerLoadingPanel
        title="Messages"
        subtitle="Communicate securely with buyers and manage return requests."
        showMetrics={false}
        showFilters={false}
      />
    );
  }

  if (error && !conversations.length && !selectedConversationId && !supportChatEntry) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Messages</title>
        </Helmet>
        <ConnectionErrorPanel
          title="Messages Unavailable"
          message={error}
          onRetry={loadConversationList}
        />
      </Box>
    );
  }

  const hasActiveThread = Boolean(activeChat || activeSupportChat || activeNotification);
  const showLockedBanner =
    !isSupportChat &&
    !encryptionReady &&
    (!showChatUnlockDialogs || (!pinDialogOpen && recoveryMode !== "setup" && recoveryMode !== "fresh"));

  const activeThreadTitle = activeNotification
    ? "Account notice"
    : activeSupportChat
      ? "ArtMatch Support"
      : activeChat?.other_name || "Buyer";

  const activeThreadSubtitle = activeNotification
    ? "From ArtMatch administration"
    : activeSupportChat
      ? "Admin support"
      : "End-to-end encrypted chat";

  const getInitials = (name) =>
    (name || "B")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "B";

  return (
    <>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Messages</title>
      </Helmet>

      <ChatWorkspace
        title="Messages"
        subtitle="Communicate securely with buyers, track return conversations, and reach ArtMatch Support."
        onRefresh={handleRefresh}
        refreshing={refreshing}
        isMobile={isMobile}
        hasActiveThread={hasActiveThread}
        onBack={() => {
          handleRemoveImage();
          setSelectedConversationId(null);
          setSelectedNotificationId(null);
        }}
        alerts={
          (error || recoveryStatus || showLockedBanner) && (
            <Stack spacing={1} sx={{ mb: 1.5 }}>
              {error && (
                <Alert severity="error" onClose={() => setError("")}>
                  {error}
                </Alert>
              )}
              {recoveryStatus && (
                <Alert
                  severity={
                    recoveryStatus.startsWith("The passkey was accepted")
                      ? "warning"
                      : "success"
                  }
                  onClose={() => setRecoveryStatus("")}
                >
                  {recoveryStatus}
                </Alert>
              )}
              {showLockedBanner && (
                <Alert
                  severity="info"
                  icon={<LockOutlinedIcon />}
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() => {
                        setRecoveryError("");
                        setChatUnlockRequested(true);
                        if (!pinDialogMode && recoveryMode !== "setup" && recoveryMode !== "fresh") {
                          setPinDialogMode("enter");
                        }
                      }}
                    >
                      Unlock
                    </Button>
                  }
                >
                  Secure messaging is locked. Enter your six-digit recovery PIN to read and send messages.
                </Alert>
              )}
            </Stack>
          )
        }
        searchPlaceholder="Search buyer or buyer ID..."
        searchQuery={searchQuery}
        onSearchChange={(e) => setSearchQuery(e.target.value)}
        onSearchKeyDown={(e) => {
          if (e.key === "Enter" && canStartConversation) {
            handleStartConversation();
          }
        }}
        sidebarExtra={
          canStartConversation && (
            <Button
              fullWidth
              size="small"
              variant="outlined"
              color="error"
              sx={{ mt: 1, textTransform: "none", fontWeight: 600, borderRadius: 2 }}
              onClick={handleStartConversation}
            >
              Message buyer #{searchedBuyerId}
            </Button>
          )
        }
        filters={inboxFilters}
        activeFilter={inboxFilter}
        onFilterChange={setInboxFilter}
        listLoading={loading && !conversations.length && !supportChatEntry}
        listEmpty={
          filteredConversations.length === 0 && visibleNotifications.length === 0 ? (
            <Stack alignItems="center" spacing={1} sx={{ textAlign: "center" }}>
              <ForumOutlinedIcon sx={{ fontSize: 40, color: "text.disabled" }} />
              <Typography variant="body2" color="text.secondary">
                {chatListItems.length
                  ? "No conversations match this filter."
                  : "No conversations yet."}
              </Typography>
            </Stack>
          ) : null
        }
        listContent={
          <>
            {visibleNotifications.map((notification) => (
              <MessageNoticeCard
                key={notification.notification_id}
                notification={notification}
                selected={notification.notification_id === selectedNotificationId}
                onSelect={() => {
                  setSelectedNotificationId(notification.notification_id);
                  setSelectedConversationId(null);
                }}
              />
            ))}
            {filteredConversations.map((chat) => (
              <MessageConversationCard
                key={chat.conversation_id}
                chat={chat}
                isSelected={
                  String(chat.conversation_id) === String(selectedConversationId)
                }
                avatarSrc={
                  chat.is_support
                    ? undefined
                    : toAbsoluteProfileImageUrl(chat.other_avatar, "buyer")
                }
                timeLabel={
                  chat.last_message_time
                    ? formatMessageTime(chat.last_message_time)
                    : ""
                }
                preview={normalizeConversationPreview(chat.last_message, chat)}
                onSelect={() => {
                  handleSelectChat(chat.conversation_id);
                  setSelectedNotificationId(null);
                }}
              />
            ))}
          </>
        }
        threadHeaderLeft={
          <>
            <Avatar
              src={
                activeSupportChat
                  ? undefined
                  : toAbsoluteProfileImageUrl(activeChat?.other_avatar, "buyer")
              }
              alt={activeThreadTitle}
              sx={{
                bgcolor: "error.main",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {activeSupportChat ? (
                <SupportAgentOutlinedIcon fontSize="small" />
              ) : (
                getInitials(activeThreadTitle)
              )}
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
                  {activeThreadTitle}
                </Typography>
                {activeSupportChat ? (
                  <Chip
                    size="small"
                    color="error"
                    variant="outlined"
                    label="Support"
                    sx={{ height: 22, fontSize: 11 }}
                  />
                ) : activeNotification ? (
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    label="Notice"
                    sx={{ height: 22, fontSize: 11 }}
                  />
                ) : (
                  <Chip
                    size="small"
                    variant="outlined"
                    label="Buyer"
                    sx={{ height: 22, fontSize: 11 }}
                  />
                )}
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                component="div"
              >
                {activeThreadSubtitle}
              </Typography>
            </Box>
          </>
        }
        threadHeaderRight={
          (activeChat || activeSupportChat) && (
            <>
              <IconButton
                size="small"
                aria-label="Conversation options"
                aria-controls={menuAnchorEl ? "seller-chat-actions" : undefined}
                aria-haspopup="true"
                onClick={(event) => setMenuAnchorEl(event.currentTarget)}
              >
                <MoreVertIcon />
              </IconButton>
              <Menu
                id="seller-chat-actions"
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
                {activeChat && (
                  <MenuItem
                    onClick={() => {
                      setMenuAnchorEl(null);
                      setActionDialog("delete");
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Delete chat
                  </MenuItem>
                )}
                {activeChat && (
                  <MenuItem
                    onClick={() => {
                      setMenuAnchorEl(null);
                      if (blockStatus.blocked_by_me) {
                        handleUnblockUser();
                      } else {
                        setActionDialog("block");
                      }
                    }}
                  >
                    <BlockOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} />
                    {blockStatus.blocked_by_me ? "Unblock user" : "Block user"}
                  </MenuItem>
                )}
              </Menu>
            </>
          )
        }
        messagesRef={messagesContainerRef}
        messagesContent={
          <>
            {activeChat && (
              <ConversationReturns
                key={selectedConversationId}
                conversationId={selectedConversationId}
                role="seller"
                returnId={selectedReturnId}
                refreshVersion={returnsRefreshVersion}
              />
            )}
            {activeNotification ? (
              <MessageCard
                message={{
                  sender: "admin",
                  text: activeNotification.message,
                  time: formatMessageTime(activeNotification.created_at),
                }}
                onViewMedia={setSelectedMedia}
              />
            ) : activeSupportChat && supportLoading ? (
              <Box sx={{ flex: 1, display: "grid", placeItems: "center", py: 6 }}>
                <CircularProgress size={26} color="error" />
              </Box>
            ) : displayedMessages.length === 0 ? (
              <Typography color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
                {activeSupportChat
                  ? "Start a conversation with Admin Support."
                  : "Start the conversation."}
              </Typography>
            ) : (
              displayedMessages.map((message) => (
                <MessageCard
                  key={message.id}
                  message={message}
                  onViewMedia={setSelectedMedia}
                  onRecover={handleRecoverMessages}
                  recoveryLabel={recoveryLabel}
                />
              ))
            )}
          </>
        }
        attachmentPreview={
          (activeChat || activeSupportChat) && (
            <ChatAttachmentPreview
              file={attachedFile}
              previewUrl={attachedPreview}
              onRemove={handleRemoveImage}
            />
          )
        }
        composer={
          activeChat || activeSupportChat ? (
            <ChatComposer
              value={inputMessage}
              onChange={setInputMessage}
              onSend={handleSendMessage}
              placeholder={
                activeSupportChat ? "Message Admin Support..." : activePlaceholder
              }
              disabled={Boolean(activeChat && isChatBlocked)}
              sending={activeSupportChat ? sendingSupport : sendingMessage}
              canSend={
                activeChat
                  ? !isChatBlocked &&
                    encryptionReady &&
                    Boolean(inputMessage.trim() || attachedFile)
                  : Boolean(inputMessage.trim() || attachedFile)
              }
              hasAttachment={Boolean(attachedPreview)}
              fileInputRef={fileInputRef}
              accept={
                activeSupportChat
                  ? "image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                  : "image/*,video/*"
              }
              onFileChange={handleImageChange}
              helperText={
                activeChat && isChatBlocked
                  ? blockStatus.blocked_by_me
                    ? "You blocked this user. Unblock them to send messages."
                    : "This user has blocked you."
                  : ""
              }
            />
          ) : (
            <Box
              sx={{
                p: 2,
                borderTop: "1px solid",
                borderColor: "divider",
                textAlign: "center",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                You can&apos;t reply to this notice.
              </Typography>
            </Box>
          )
        }
        emptyThreadTitle="Select a conversation"
        emptyThreadSubtitle="Choose a buyer or support thread on the left to start chatting."
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

      <ChatRecoveryDialog
        mode={recoveryMode}
        busy={recoveryBusy}
        error={recoveryError}
        onSubmit={handleRecoverySubmit}
        onReset={handleRecoveryReset}
        onSkip={() => setRecoveryMode("")}
      />

      <ChatPinDialog
        open={showChatUnlockDialogs && pinDialogOpen}
        mode={pinDialogMode}
        busy={recoveryBusy}
        error={recoveryError}
        onSubmit={handleRecoverySubmit}
        onReset={handleRecoveryReset}
      />

      <MessageDelete
        open={actionDialog === "delete"}
        onClose={() => setActionDialog("")}
        onConfirm={handleDeleteChat}
        isReturnConversation={isReturnConversation}
      />
      <MessageBlock
        open={actionDialog === "block"}
        onClose={() => setActionDialog("")}
        onConfirm={handleBlockUser}
        isReturnConversation={isReturnConversation}
      />
    </>
  );
}
