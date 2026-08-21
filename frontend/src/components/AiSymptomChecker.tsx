import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, Bot, Sparkles, AlertTriangle } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  specialty?: string;
  severity?: 'low' | 'medium' | 'high';
}

const AiSymptomChecker: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: 'مرحباً! أنا المساعد الطبي الذكي لـ MedFinder. اكتب الأعراض التي تشعر بها وسأقترح عليك التخصص الأنسب لحالتك.\n\nHello! I am your MedFinder AI Medical Assistant. Describe your symptoms, and I will recommend the best specialty for your needs.'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post('/ai/analyze-symptoms', { symptoms: userText });
      const data = res.data;
      
      const responseText = `**[Analysis / التحليل]**\n\n${data.analysisAr}\n\n${data.analysisEn}`;
      
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: responseText,
          specialty: data.specialty,
          severity: data.severity
        }
      ]);
    } catch (err: any) {
      toast.error('Failed to connect to AI Assistant.');
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: 'عذراً، واجهت مشكلة في الاتصال بالخادم. يرجى المحاولة لاحقاً.\n\nSorry, I failed to connect to the server. Please try again later.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookSpecialty = (specialty: string) => {
    setIsOpen(false);
    navigate(`/search?specialty=${specialty}`);
    toast.success(`Filtering doctors by: ${specialty}`);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center relative group border border-emerald-500/20"
        >
          <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping group-hover:animate-none opacity-75"></div>
          <Sparkles size={24} className="relative z-10 animate-pulse" />
          <span className="absolute right-14 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-md whitespace-nowrap border border-slate-800">
            AI Symptom Checker
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[380px] sm:w-[400px] h-[550px] bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl shadow-slate-900/30 border border-slate-100 flex flex-col overflow-hidden transition-all duration-300 transform scale-100 origin-bottom-right">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center relative overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)] pointer-events-none"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="p-2 bg-white/10 rounded-xl">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm tracking-tight flex items-center gap-1.5">
                  AI Medical Assistant
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                </h3>
                <p className="text-[10px] text-emerald-100 font-medium">MedFinder Smart Guide</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                    <Bot size={16} />
                  </div>
                )}
                
                <div className="max-w-[80%] space-y-3">
                  <div
                    className={`rounded-2xl p-3.5 text-xs leading-relaxed shadow-sm border ${
                      msg.sender === 'user'
                        ? 'bg-slate-900 text-white border-slate-800 rounded-tr-none font-medium'
                        : 'bg-white text-slate-800 border-slate-100 rounded-tl-none font-normal'
                    }`}
                    style={{ whiteSpace: 'pre-line' }}
                  >
                    {msg.text}

                    {/* Critical Severity Alert */}
                    {msg.severity === 'high' && (
                      <div className="mt-3 p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 font-bold flex gap-2 items-start animate-bounce">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <span>Emergency advise / تنبيه طوارئ</span>
                      </div>
                    )}
                  </div>

                  {/* Recommendation Action Button */}
                  {msg.sender === 'bot' && msg.specialty && (
                    <div className="animate-fade-in pl-1">
                      <button
                        onClick={() => handleBookSpecialty(msg.specialty!)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10 border border-emerald-500/10 active:scale-95"
                      >
                        <Sparkles size={12} /> Book {msg.specialty}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                  <Bot size={16} />
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-4 flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-slate-100 bg-white flex gap-2 items-center shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="اكتب أعراضك هنا... / Describe symptoms..."
              disabled={isLoading}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-slate-900 flex items-center justify-center"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AiSymptomChecker;
