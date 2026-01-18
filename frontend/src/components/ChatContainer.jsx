import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useEffect, useRef, useCallback } from "react";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import MessageBubble from "./MessageBubble";

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
  } = useChatStore();

  const { authUser } = useAuthStore();
  const chatRef = useRef(null);
  const isInitialLoad = useRef(true);

  // Fetch messages on chat switch
  useEffect(() => {
    if (!selectedUser) return;

    isInitialLoad.current = true;
    fetchMessagesByUserId(selectedUser._id, true);
    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser, fetchMessagesByUserId, subscribeToMessages, unsubscribeFromMessages]);

  // Scroll to bottom on first load of messages
  useEffect(() => {
    if (!chatRef.current || messages.length === 0) return;

    if (isInitialLoad.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
      isInitialLoad.current = false;
    }
  }, [messages]);

  // Auto-scroll when current user sends a new message
  useEffect(() => {
    if (!chatRef.current || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (String(lastMessage.senderId) === String(authUser._id)) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, authUser._id]);

  // Handle scroll-to-top for older messages
  const handleScroll = useCallback(() => {
    if (!chatRef.current) return;
    if (chatRef.current.scrollTop !== 0) return;
    if (!hasMoreMessages || isMessagesLoading) return;

    const prevScrollHeight = chatRef.current.scrollHeight;

    fetchMessagesByUserId(selectedUser._id).then(() => {
      chatRef.current.scrollTop = chatRef.current.scrollHeight - prevScrollHeight;
    });
  }, [selectedUser, fetchMessagesByUserId, hasMoreMessages, isMessagesLoading]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <ChatHeader />

      {/* Messages area */}
      <div
        ref={chatRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4"
        onScroll={handleScroll}
      >
        {isMessagesLoading && messages.length === 0 ? (
          <MessagesLoadingSkeleton />
        ) : messages.length > 0 ? (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg) => (
              <MessageBubble key={msg._id} msg={msg} />
            ))}
          </div>
        ) : selectedUser ? (
          <NoChatHistoryPlaceholder name={selectedUser.fullName} />
        ) : null}
      </div>

      {/* Reply preview */}
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

      {/* Input */}
      <div className="flex-shrink-0">
        <MessageInput replyToMessage={replyToMessage} />
      </div>
    </div>
  );
}

export default ChatContainer;
