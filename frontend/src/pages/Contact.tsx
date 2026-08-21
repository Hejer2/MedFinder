// src/pages/Contact.tsx
import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const Contact: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/contact', { email, message });
      toast.success('Your message has been sent!');
      setEmail('');
      setMessage('');
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md mt-12">
      <h1 className="text-2xl font-bold mb-4 flex items-center">
        <Mail className="mr-2" /> Contact Us
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            className="w-full p-2 border rounded-lg"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="message">
            Message
          </label>
          <textarea
            id="message"
            required
            rows={5}
            className="w-full p-2 border rounded-lg"
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          {loading ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  );
};

export default Contact;
