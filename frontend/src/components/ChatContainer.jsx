import React from 'react'
import { useChatStore } from '../store/useChatStore'
import { useAuthStore } from '../store/useAuthStore'
import { useEffect, useRef } from 'react';
import ChatHeader from './ChatHeader';
import NoChatHistoryPlaceholder from './NoChatHistoryPlaceholder';
import MessageInput from './MessageInput';
import MessagesLoadingSkeleton from './MessagesLoadingSkeleton';

function ChatContainer() {
const {selectedUser, getMessagesByUserId, messages, isMessagesLoading, subscribeToMessages, unsubscribeFromMessages} = useChatStore();
const {authUser} = useAuthStore();
const messageEndRef = useRef(null)
console.log(useChatStore.getState().messages)

useEffect(() => {
  getMessagesByUserId(selectedUser._id);
  subscribeToMessages()

  //clean up
  return () => unsubscribeFromMessages();
}, [selectedUser, getMessagesByUserId, subscribeToMessages, unsubscribeFromMessages])

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);


  return (
    <>
    <ChatHeader />
    <div className="flex-1 px-6 overflow-y-auto py-8">
      {messages.length > 0 && !isMessagesLoading ? (
        <div className='max-w-3xl mx-auto space-y-6'>
{messages.map(msg => {
  return (
    <div key={msg._id}
      className={`chat ${String(msg.senderId) === String(authUser._id) ? "chat-end" : "chat-start"}`}
    >
      <div className={`chat-bubble relative ${
        String(msg.senderId) === String(authUser._id)
        ? "bg-cyan-600 text-white"
        : "bg-slate-800 text-slate-200"
      }`}>
        {msg.image && <img src={msg.image} className='rounded-lg h-48 object-cover' />}
        {msg.text && <p className='mt-2'>{msg.text}</p>}

        <p className='text-xs mt-1 opacity-75'>
          {new Date(msg.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })}
        </p>
      </div>
    </div>
  )
})}
                   {/* 👇 scroll target */}
            <div ref={messageEndRef} />
        </div>
      ) : isMessagesLoading ? <MessagesLoadingSkeleton /> : (
        <NoChatHistoryPlaceholder name={selectedUser.fullName}/>
      )}
    
    </div>

      <MessageInput />

    </>
    ) 
}

export default ChatContainer