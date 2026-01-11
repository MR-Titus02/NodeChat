import React from "react";
import { useChatStore } from "../store/useChatStore";
import BorderAnimationContainer from "../components/BorderAnimatedContainer";
import ActiveTabSwitch from "../components/ActiveTabSwitch";
import ChatList from "../components/ChatList";
import ContactsList from "../components/ContactList";
import ChatContainer from "../components/ChatContainer";
import NoConversationPlaceholder from "../components/NoConversationPlaceHolder";
import ProfileHeader from "../components/ProfileHeader";

function ChatPage() {
  const { activeTab, selectedUser } = useChatStore();

  return (
    <div className="relative w-full h-screen max-w-6xl mx-auto">
      <BorderAnimationContainer className="flex h-full">
        {/* ---------------- Sidebar (Left) ---------------- */}
        <div
          className={`bg-slate-800/50 backdrop-blur-sm w-full md:w-80 flex flex-col h-full
            ${selectedUser ? "hidden sm:flex" : "flex"}`}
        >
          <ProfileHeader />
          <ActiveTabSwitch />
          <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2">
            {activeTab === "chats" ? <ChatList /> : <ContactsList />}
          </div>
        </div>

        {/* ---------------- Chat Container ---------------- */}
        {selectedUser ? (
          <div
            className="fixed inset-0 z-50 md:relative md:flex-1 md:bg-slate-900/50 flex flex-col bg-slate-900/95 transition-transform transform"
          >
            <ChatContainer />
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-slate-900/50 backdrop-blur-sm">
            <NoConversationPlaceholder />
          </div>
        )}
      </BorderAnimationContainer>
    </div>
  );
}

export default ChatPage;
