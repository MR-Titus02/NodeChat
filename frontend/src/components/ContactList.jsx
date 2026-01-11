import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";

function ContactList() {
  const { getAllContacts, allContacts, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();

  useEffect(() => {
    getAllContacts();
  }, [getAllContacts]);

  if (isUsersLoading) return <UsersLoadingSkeleton />;

  return (
    <div className="overflow-y-auto max-h-[calc(100vh-160px)] space-y-2 p-2 md:p-4">
      {allContacts.map((contact) => {
        // Ensure IDs are strings for proper comparison
        const isOnline = onlineUsers.map(String).includes(String(contact._id));

        return (
          <div
            key={contact._id}
            className="bg-cyan-500/10 p-3 md:p-4 rounded-lg cursor-pointer hover:bg-cyan-500/20 transition-colors flex items-center gap-3"
            onClick={() => setSelectedUser(contact)}
          >
            <div className={`avatar ${isOnline ? "online" : "offline"}`}>
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden">
                <img
                  src={contact.profilePic?.trim() !== "" ? contact.profilePic : "/avatar.png"}
                  alt={contact.fullName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-slate-200 font-medium text-sm md:text-base truncate">
                {contact.fullName}
              </h4>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ContactList;
