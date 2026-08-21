// src/components/MessageList.tsx
import React from 'react';
import { useAuth } from '../context/AuthContext';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

interface Props {
  messages: Message[];
}

const MessageList: React.FC<Props> = ({ messages }) => {
  const { user } = useAuth();
  const isOwn = (msg: Message) => user && msg.senderId === user.id;

  return (
    <div className="flex flex-col space-y-2 p-4 overflow-y-auto max-h-[60vh]">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${isOwn(msg) ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`rounded-xl px-4 py-2 max-w-xs break-words ${
              isOwn(msg) ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-900'
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageList;
