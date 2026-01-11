import { useChatStore } from '../store/useChatStore';
import UsersLoadingSkeleton from './UsersLoadingSkeleton';
import NoChatsFound from './NoChatsFound';
import { useAuthStore } from '../store/useAuthStore';
import { useEffect } from 'react';

function ChatList() {
  const { getMyChatPartners, chats, isUsersLoading, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  useEffect(() => {
    getMyChatPartners();
  }, [getMyChatPartners]);

  if (isUsersLoading) return <UsersLoadingSkeleton />;
  if (chats.length === 0) return <NoChatsFound />;

  return (
    <div className="overflow-y-auto flex-1 p-2 md:p-4 space-y-2">
      {chats.map((chat) => {
        const isOnline = onlineUsers.map(String).includes(String(chat._id));

        // Last message preview (if available)
        const lastMessage = chat.lastMessage || null;
        const lastMsgText = lastMessage?.text || "";
        const lastMsgTime = lastMessage?.createdAt
          ? new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "";

        return (
          <div
            key={chat._id}
            className="bg-cyan-500/10 p-3 md:p-4 rounded-lg cursor-pointer hover:bg-cyan-500/20 transition-colors flex items-center justify-between"
            onClick={() => setSelectedUser(chat)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`avatar ${isOnline ? "online" : "offline"}`}>
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  <img src={chat.profilePic || "/avatar.png"} alt={chat.fullName} />
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <h4 className="text-slate-200 font-medium text-sm md:text-base truncate">
                  {chat.fullName}
                </h4>
                <p className="text-slate-400 text-xs md:text-sm truncate">
                  {lastMsgText ? lastMsgText : "No messages yet"}
                </p>
              </div>
            </div>

            {lastMsgTime && (
              <span className="text-slate-400 text-xs md:text-sm ml-2 flex-shrink-0">
                {lastMsgTime}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ChatList;
