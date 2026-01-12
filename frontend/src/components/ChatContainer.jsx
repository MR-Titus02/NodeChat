import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useEffect, useRef } from "react";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";

function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  // Load messages & subscribe to real-time
  useEffect(() => {
    getMessagesByUserId(selectedUser._id);
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [
    selectedUser,
    getMessagesByUserId,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  // Scroll to latest message
  useEffect(() => {
    const timeout = setTimeout(() => {
      messageEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 100);

    return () => clearTimeout(timeout);
  }, [messages]);

  return (
    <div className="flex flex-col h-[100dvh]">
      {/* Chat Header with single close button */}
      <ChatHeader />

      {/* Messages scroll area */}
      <div className="flex-1 px-4 md:px-6 py-6 md:py-10 overflow-y-auto">
        {isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : messages.length > 0 ? (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg._id}
                className={`chat ${
                  String(msg.senderId) === String(authUser._id)
                    ? "chat-end"
                    : "chat-start"
                }`}
              >
                <div
                  className={`chat-bubble relative ${
                    String(msg.senderId) === String(authUser._id)
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-800 text-slate-200"
                  }`}
                >
                  {msg.image && (
                    <img
                      src={msg.image}
                      className="rounded-lg h-48 object-cover"
                    />
                  )}
                  {msg.text && <p className="mt-2">{msg.text}</p>}
                  <p className="text-xs mt-1 opacity-75">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messageEndRef} />
          </div>
        ) : (
          <NoChatHistoryPlaceholder name={selectedUser.fullName} />
        )}
      </div>

      {/* Message input always sticks to bottom */}
      <MessageInput />
    </div>
  );
}

export default ChatContainer;
