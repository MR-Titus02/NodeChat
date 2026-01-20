import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useEffect, useRef, useCallback, useState } from "react";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import MessageBubble from "./MessageBubble";

/* -------------------- helpers -------------------- */
const formatDate = (date) =>
  new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

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
  const prevMessageCount = useRef(0);

  const [activeDate, setActiveDate] = useState(null);

  /* -------------------- fetch & socket -------------------- */
  useEffect(() => {
    if (!selectedUser) return;

    isInitialLoad.current = true;
    fetchMessagesByUserId(selectedUser._id, true);
    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser]);

  /* -------------------- initial scroll -------------------- */
  useEffect(() => {
    if (!chatRef.current || messages.length === 0) return;

    if (isInitialLoad.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
      isInitialLoad.current = false;
    }
  }, [messages]);

  /* -------------------- auto-scroll ONLY for new messages -------------------- */
  useEffect(() => {
    if (!chatRef.current) return;

    const isNewMessage = messages.length > prevMessageCount.current;

    if (isNewMessage) {
      const scrollBottom =
        chatRef.current.scrollHeight -
        chatRef.current.scrollTop -
        chatRef.current.clientHeight;

      // auto-scroll only if user is near bottom
      if (scrollBottom < 120) {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }
    }

    prevMessageCount.current = messages.length;
  }, [messages]);

  /* -------------------- pagination (scroll up) -------------------- */
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleScroll = useCallback(() => {
    if (!chatRef.current) return;
    if (chatRef.current.scrollTop !== 0) return;
    if (!hasMoreMessages || isMessagesLoading) return;

    const prevScrollHeight = chatRef.current.scrollHeight;

    fetchMessagesByUserId(selectedUser._id).then(() => {
      requestAnimationFrame(() => {
        chatRef.current.scrollTop =
          chatRef.current.scrollHeight - prevScrollHeight;
      });
    });
  }, [selectedUser, hasMoreMessages, isMessagesLoading]);

  /* -------------------- sticky date (WhatsApp style) -------------------- */
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

    const dateEls = chatRef.current.querySelectorAll("[data-date]");
    dateEls.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [messages]);

  /* -------------------- seen logic -------------------- */
  useEffect(() => {
    if (!selectedUser || messages.length === 0) return;

    const checkSeen = () => {
      if (!chatRef.current) return;

      const scrollBottom =
        chatRef.current.scrollHeight -
        chatRef.current.scrollTop -
        chatRef.current.clientHeight;

      if (scrollBottom > 150 || document.visibilityState !== "visible") return;

      const hasUnseen = messages.some(
        (msg) => msg.senderId === selectedUser._id && !msg.seenAt
      );

      if (hasUnseen) {
        markMessagesAsSeen(selectedUser._id);
      }
    };

    checkSeen();
    chatRef.current.addEventListener("scroll", checkSeen);
    document.addEventListener("visibilitychange", checkSeen);

    return () => {
      chatRef.current?.removeEventListener("scroll", checkSeen);
      document.removeEventListener("visibilitychange", checkSeen);
    };
  }, [messages, selectedUser]);

  /* -------------------- render -------------------- */
  return (
    <div className="flex flex-col h-full min-h-0">
      <ChatHeader />

      {/* sticky date */}
      {activeDate && (
        <div className="sticky top-0 z-10 flex justify-center pointer-events-none">
          <div className="mt-2 px-3 py-1 text-xs bg-slate-800/90 text-slate-200 rounded-full shadow">
            {activeDate}
          </div>
        </div>
      )}

      {/* messages */}
      <div
        ref={chatRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4"
        onScroll={handleScroll}
      >
        {isMessagesLoading && messages.length === 0 ? (
          <MessagesLoadingSkeleton />
        ) : messages.length > 0 ? (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg, index) => {
              const prevMsg = messages[index - 1];
              const showDate =
                !prevMsg ||
                formatDate(prevMsg.createdAt) !==
                  formatDate(msg.createdAt);

              return (
                <div key={msg._id}>
                  {showDate && (
                    <div
                      data-date={formatDate(msg.createdAt)}
                      className="my-3 flex justify-center"
                    >
                      <span className="px-3 py-1 text-xs bg-slate-700 text-slate-300 rounded-full">
                        {formatDate(msg.createdAt)}
                      </span>
                    </div>
                  )}

                  <MessageBubble msg={msg} />
                </div>
              );
            })}
          </div>
        ) : selectedUser ? (
          <NoChatHistoryPlaceholder name={selectedUser.fullName} />
        ) : null}
      </div>

      {/* reply preview */}
      {replyToMessage && (
        <div className="px-4 py-2 bg-slate-800 border-t border-slate-700 flex items-center justify-between">
          <div className="text-sm text-slate-300 truncate">
            <span className="text-cyan-400 font-medium">
              Replying to{" "}
              {replyToMessage.senderId === authUser._id
                ? "yourself"
                : selectedUser.fullName}
            </span>
            <div className="truncate text-slate-400">
              {replyToMessage.text || "📷 Image"}
            </div>
          </div>

          <button
            onClick={clearReplyToMessage}
            className="ml-3 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* input */}
      <div className="flex-shrink-0">
        <MessageInput replyToMessage={replyToMessage} />
      </div>
    </div>
  );
}

export default ChatContainer;
