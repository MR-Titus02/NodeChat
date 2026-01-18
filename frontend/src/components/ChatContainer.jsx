import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useEffect, useRef } from "react";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import MessageBubble from "./MessageBubble";

function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
    replyToMessage,
    clearReplyToMessage,
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    if (!selectedUser) return;

    getMessagesByUserId(selectedUser._id);
    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [
    getMessagesByUserId,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <ChatHeader />

      {/* Messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4">
        {isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : messages.length > 0 ? (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg) => (
              <MessageBubble key={msg._id} msg={msg} />
            ))}
            <div ref={messageEndRef} />
          </div>
        ) : (
          <NoChatHistoryPlaceholder name={selectedUser.fullName} />
        )}
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
