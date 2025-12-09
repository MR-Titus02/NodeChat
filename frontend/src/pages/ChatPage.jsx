import React from 'react'
import { useAuthStore } from '../store/useAuthStore';

function ChatPage() {

  const { logout } = useAuthStore();
  return (
    <>
    <div>ChatPage</div>
    <button className='z-10' onClick={logout}>LogOut</button>
    </>
  )
}

export default ChatPage