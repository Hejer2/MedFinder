// src/components/MessageInput.tsx
import React, { useState } from 'react';
import api from '../api/axios';

interface Props {
  receiverId: string;
  onSent: () => void; // callback to refresh conversation
}

const MessageInput: React.FC<Props> = ({ receiverId, onSent }) => {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!content.trim()) return;
    setIsSending(true);
    try {
      await api.post('/messages', { receiverId, content: content.trim() });
      setContent('');
      onSent();
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2 p-4 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <textarea
        rows={1}
        className="flex-1 resize-none rounded-xl border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
        placeholder="اكتب رسالتك..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isSending}
      />
      <button
        onClick={handleSend}
        disabled={isSending || !content.trim()}
        className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50"
      >
        إرسال
      </button>
    </div>
  );
};

export default MessageInput;
