import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import MessageBubble from "./MessageBubble";

const BOTTOM_THRESHOLD = 24;
const TOP_LOAD_THRESHOLD = 40;
const OVERSCAN_PX = 700;
const MESSAGE_ESTIMATED_HEIGHT = 96;
const DATE_ESTIMATED_HEIGHT = 44;

const formatDate = (date) =>
  new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function ChatRow({ item, onMeasure }) {
  const rowRef = useRef(null);

  useLayoutEffect(() => {
    if (!rowRef.current) return;

    const measure = () => {
      const height = rowRef.current?.offsetHeight ?? 0;
      if (height > 0) {
        onMeasure(item.key, height);
      }
    };

    measure();

    if (typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(measure);
    observer.observe(rowRef.current);
    return () => observer.disconnect();
  }, [item.key, onMeasure]);

  if (item.type === "date") {
    return (
      <div ref={rowRef} data-date={item.dateLabel} className="my-3 flex justify-center">
        <span className="rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-300">
          {item.dateLabel}
        </span>
      </div>
    );
  }

  return (
    <div ref={rowRef}>
      <MessageBubble msg={item.message} />
    </div>
  );
}

function ChatContainer() {
  const {
    selectedUser,
    fetchMessagesByUserId,
    messages,
    isMessagesLoading,
    hasMoreMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
    replyToMessage,
    clearReplyToMessage,
    markMessagesAsSeen,
  } = useChatStore();

  const { authUser } = useAuthStore();

  const chatRef = useRef(null);
  const isInitialLoad = useRef(true);
  const prevMessageMeta = useRef({ count: 0, firstId: null, lastId: null });
  const nearBottomRef = useRef(true);
  const prependSnapshotRef = useRef(null);
  const resizeFrameRef = useRef(null);
  const scrollFrameRef = useRef(null);

  const [activeDate, setActiveDate] = useState(null);
  const [scrollMetrics, setScrollMetrics] = useState({ top: 0, height: 0 });
  const [rowHeights, setRowHeights] = useState({});

  const isNearBottom = useCallback(
    (element) =>
      element.scrollTop + element.clientHeight >=
      element.scrollHeight - BOTTOM_THRESHOLD,
    []
  );

  const syncScrollState = useCallback(
    (element) => {
      if (!element) return;

      nearBottomRef.current = isNearBottom(element);
      setScrollMetrics({
        top: element.scrollTop,
        height: element.clientHeight,
      });
    },
    [isNearBottom]
  );

  const scrollToBottom = useCallback(() => {
    if (!chatRef.current) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!chatRef.current) return;
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
        syncScrollState(chatRef.current);
      });
    });
  }, [syncScrollState]);

  useEffect(() => {
    if (!selectedUser) return;

    isInitialLoad.current = true;
    prevMessageMeta.current = { count: 0, firstId: null, lastId: null };
    prependSnapshotRef.current = null;

    fetchMessagesByUserId(selectedUser._id, true);
    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser, fetchMessagesByUserId, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (!chatRef.current) return undefined;

    const element = chatRef.current;
    syncScrollState(element);

    if (typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(() => {
      if (resizeFrameRef.current) {
        cancelAnimationFrame(resizeFrameRef.current);
      }

      resizeFrameRef.current = requestAnimationFrame(() => {
        syncScrollState(element);
      });
    });

    observer.observe(element);

    return () => {
      if (resizeFrameRef.current) {
        cancelAnimationFrame(resizeFrameRef.current);
      }
      observer.disconnect();
    };
  }, [selectedUser, syncScrollState]);

  const items = useMemo(() => {
    const nextItems = [];

    messages.forEach((message, index) => {
      const prevMessage = messages[index - 1];
      const messageDate = formatDate(message.createdAt);
      const prevDate = prevMessage ? formatDate(prevMessage.createdAt) : null;

      if (!prevMessage || prevDate !== messageDate) {
        nextItems.push({
          key: `date-${messageDate}`,
          type: "date",
          dateLabel: messageDate,
          estimatedHeight: DATE_ESTIMATED_HEIGHT,
        });
      }

      nextItems.push({
        key: `message-${message._id}`,
        type: "message",
        message,
        estimatedHeight: MESSAGE_ESTIMATED_HEIGHT,
      });
    });

    return nextItems;
  }, [messages]);

  const virtualRows = useMemo(() => {
    const positions = [];
    const heights = [];
    let offset = 0;

    for (const item of items) {
      positions.push(offset);
      const height = rowHeights[item.key] ?? item.estimatedHeight;
      heights.push(height);
      offset += height;
    }

    const viewportTop = Math.max(scrollMetrics.top - OVERSCAN_PX, 0);
    const viewportBottom = scrollMetrics.top + scrollMetrics.height + OVERSCAN_PX;

    let start = 0;
    while (
      start < items.length &&
      positions[start] + heights[start] < viewportTop
    ) {
      start += 1;
    }

    let end = start;
    while (end < items.length && positions[end] < viewportBottom) {
      end += 1;
    }

    if (end === start && items.length > 0) {
      end = Math.min(start + 1, items.length);
    }

    const topSpacer = start > 0 ? positions[start] : 0;
    const bottomStart =
      end > 0 ? positions[end - 1] + heights[end - 1] : 0;
    const bottomSpacer = Math.max(offset - bottomStart, 0);

    return {
      start,
      end,
      topSpacer,
      bottomSpacer,
      visibleItems: items.slice(start, end),
    };
  }, [items, rowHeights, scrollMetrics]);

  const handleMeasure = useCallback((key, height) => {
    setRowHeights((currentHeights) => {
      const previous = currentHeights[key];
      if (previous && Math.abs(previous - height) < 4) {
        return currentHeights;
      }

      return {
        ...currentHeights,
        [key]: height,
      };
    });
  }, []);

  useLayoutEffect(() => {
    if (!chatRef.current || messages.length === 0) return;

    const previous = prevMessageMeta.current;
    const firstId = messages[0]?._id ?? null;
    const lastId = messages[messages.length - 1]?._id ?? null;
    const prependingOlderMessages =
      prependSnapshotRef.current &&
      previous.firstId &&
      firstId !== previous.firstId &&
      lastId === previous.lastId;
    const appendingNewMessage =
      previous.lastId && lastId !== previous.lastId && !prependingOlderMessages;

    if (isInitialLoad.current) {
      scrollToBottom();
      isInitialLoad.current = false;
    } else if (prependingOlderMessages) {
      const snapshot = prependSnapshotRef.current;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!chatRef.current) return;
          chatRef.current.scrollTop =
            chatRef.current.scrollHeight - snapshot.scrollHeight + snapshot.scrollTop;
          syncScrollState(chatRef.current);
        });
      });
      prependSnapshotRef.current = null;
    } else if (
      appendingNewMessage &&
      (nearBottomRef.current ||
        String(messages[messages.length - 1]?.senderId) === String(authUser._id))
    ) {
      scrollToBottom();
    }

    prevMessageMeta.current = {
      count: messages.length,
      firstId,
      lastId,
    };
  }, [authUser._id, messages, scrollToBottom, syncScrollState]);

  useLayoutEffect(() => {
    if (!chatRef.current || messages.length === 0) return;
    if (prependSnapshotRef.current || !nearBottomRef.current) return;
    scrollToBottom();
  }, [messages.length, rowHeights, scrollToBottom]);

  const handleScroll = () => {
    if (!chatRef.current) return;

    const element = chatRef.current;
    nearBottomRef.current = isNearBottom(element);

    if (scrollFrameRef.current) {
      cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = requestAnimationFrame(() => {
      setScrollMetrics({
        top: element.scrollTop,
        height: element.clientHeight,
      });
    });

    if (
      element.scrollTop <= TOP_LOAD_THRESHOLD &&
      hasMoreMessages &&
      !isMessagesLoading &&
      selectedUser
    ) {
      prependSnapshotRef.current = {
        scrollHeight: element.scrollHeight,
        scrollTop: element.scrollTop,
      };
      fetchMessagesByUserId(selectedUser._id);
    }
  };

  useEffect(
    () => () => {
      if (scrollFrameRef.current) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!chatRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveDate(entry.target.dataset.date);
          }
        });
      },
      {
        root: chatRef.current,
        threshold: 0.6,
      }
    );

    const dateElements = chatRef.current.querySelectorAll("[data-date]");
    dateElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [virtualRows.visibleItems]);

  useEffect(() => {
    if (!selectedUser || messages.length === 0) return undefined;

    const checkSeen = () => {
      if (!chatRef.current || document.visibilityState !== "visible") return;

      const element = chatRef.current;
      const closeToBottom = isNearBottom(element);
      if (!closeToBottom) return;

      const hasUnseen = messages.some(
        (message) =>
          String(message.senderId) === String(selectedUser._id) && !message.seenAt
      );

      if (hasUnseen) {
        markMessagesAsSeen(selectedUser._id);
      }
    };

    checkSeen();
    const element = chatRef.current;
    element?.addEventListener("scroll", checkSeen);
    document.addEventListener("visibilitychange", checkSeen);

    return () => {
      element?.removeEventListener("scroll", checkSeen);
      document.removeEventListener("visibilitychange", checkSeen);
    };
  }, [isNearBottom, markMessagesAsSeen, messages, selectedUser]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader />

      {activeDate && (
        <div className="pointer-events-none sticky top-0 z-10 flex justify-center">
          <div className="mt-2 rounded-full bg-slate-800/90 px-3 py-1 text-xs text-slate-200 shadow">
            {activeDate}
          </div>
        </div>
      )}

      <div
        ref={chatRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 md:px-6"
        onScroll={handleScroll}
      >
        {isMessagesLoading && messages.length === 0 ? (
          <MessagesLoadingSkeleton />
        ) : messages.length > 0 ? (
          <div className="mx-auto max-w-3xl">
            {isMessagesLoading && hasMoreMessages && (
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-slate-800/80 px-3 py-1 text-xs text-slate-300">
                  Loading older messages...
                </div>
              </div>
            )}

            <div style={{ height: virtualRows.topSpacer }} />

            {virtualRows.visibleItems.map((item) => (
              <ChatRow key={item.key} item={item} onMeasure={handleMeasure} />
            ))}

            <div style={{ height: virtualRows.bottomSpacer }} />
          </div>
        ) : selectedUser ? (
          <NoChatHistoryPlaceholder name={selectedUser.fullName} />
        ) : null}
      </div>

      {replyToMessage && (
        <div className="flex items-center justify-between border-t border-slate-700 bg-slate-800 px-4 py-2">
          <div className="truncate text-sm text-slate-300">
            <span className="font-medium text-cyan-400">
              Replying to{" "}
              {replyToMessage.senderId === authUser._id
                ? "yourself"
                : selectedUser.fullName}
            </span>
            <div className="truncate text-slate-400">
              {replyToMessage.text || "Image"}
            </div>
          </div>

          <button
            onClick={clearReplyToMessage}
            className="ml-3 text-slate-400 hover:text-white"
          >
            x
          </button>
        </div>
      )}

      <div className="flex-shrink-0">
        <MessageInput replyToMessage={replyToMessage} />
      </div>
    </div>
  );
}

export default ChatContainer;
