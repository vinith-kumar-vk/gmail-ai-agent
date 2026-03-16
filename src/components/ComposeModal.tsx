'use client';

import { useState } from 'react';
import { X, Send, Mic, Sparkles, Loader2, User, Type, AlignLeft, Paperclip, MoreVertical, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSent?: () => void;
}

export default function ComposeModal({ isOpen, onClose, onSent }: ComposeModalProps) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRefining, setIsRefining] = useState(false);

  const handleSend = async () => {
    if (!to || !subject || !content) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/threads/new/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, reply: content }),
      });
      if (res.ok) {
        onClose();
        onSent?.();
        setTo('');
        setSubject('');
        setContent('');
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Speech recognition not supported in this browser.');

    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setContent(prev => prev + ' ' + transcript);
    };
    recognition.start();
  };

  const refineWithAI = async () => {
    if (!content) return;
    setIsRefining(true);
    try {
      const res = await fetch('/api/ai/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript: content,
          context: { from: 'Me', subject: subject || 'New Message' }
        }),
      });
      const data = await res.json();
      if (data.refinedReply) setContent(data.refinedReply);
    } catch (error) {
      console.error(error);
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#202124]/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 40 }}
            className="bg-white border border-[#dadce0] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative flex flex-col"
          >
            {/* Header */}
            <div className="bg-[#f2f6fc] p-4 flex items-center justify-between border-b border-[#dadce0]">
              <div className="flex items-center gap-3">
                 <h2 className="text-[#202124] text-sm font-semibold ml-2">New Message</h2>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-black/5 rounded-md text-[#5f6368] transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-black/5 rounded-md text-[#5f6368] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Inputs */}
            <div className="flex-1 flex flex-col">
              <div className="px-6 py-2 border-b border-[#f1f3f4] flex items-center gap-3">
                <span className="text-sm font-medium text-[#5f6368] w-12">To</span>
                <input
                  type="text"
                  placeholder="Recipients"
                  className="bg-transparent border-none outline-none text-sm text-[#202124] w-full py-2 placeholder:text-[#9aa0a6]"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>

              <div className="px-6 py-2 border-b border-[#f1f3f4] flex items-center gap-3">
                <span className="text-sm font-medium text-[#5f6368] w-12">Subject</span>
                <input
                  type="text"
                  placeholder="Add a subject"
                  className="bg-transparent border-none outline-none text-sm text-[#202124] w-full py-2 placeholder:text-[#9aa0a6]"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              {/* Text Area */}
              <div className="flex-1 min-h-[300px] relative">
                <textarea
                  placeholder="Draft your message..."
                  className="w-full h-full p-6 text-[14px] leading-relaxed outline-none resize-none placeholder:text-[#9aa0a6] text-[#202124]"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-white border-t border-[#f1f3f4] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSend}
                    disabled={isSending || !to || !subject || !content}
                    className="bg-[#1a73e8] hover:bg-[#1b66c9] text-white px-6 py-2 rounded-full font-semibold text-sm flex items-center gap-2 transition-all shadow-md shadow-[#1a73e8]/20 disabled:opacity-50 disabled:shadow-none"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                    <Send className="w-3.5 h-3.5" />
                  </button>
                  
                  <div className="w-[1px] h-6 bg-[#dadce0] mx-2" />

                  <button
                    onClick={startVoiceInput}
                    className={`p-2 rounded-full transition-all ${
                      isRecording ? 'bg-red-50 text-red-500 scale-110 shadow-md' : 'hover:bg-gray-100 text-[#5f6368]'
                    }`}
                    title="Voice Input"
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  <button
                    onClick={refineWithAI}
                    disabled={isRefining || !content}
                    className={`h-9 px-3 rounded-lg flex items-center gap-2 transition-all border ${
                      isRefining ? 'bg-gray-50 border-[#dadce0] text-gray-400' : 'bg-white border-[#dadce0] text-[#1a73e8] hover:bg-[#e8f0fe] hover:border-[#1a73e8]/30'
                    }`}
                  >
                    {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span className="text-xs font-bold tracking-tight">AI REFINE</span>
                  </button>
                  
                  <button className="p-2 hover:bg-gray-100 rounded-full text-[#5f6368] transition-colors" title="Attach Files">
                    <Paperclip className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 opacity-50">
                    <Trash2 className="w-4 h-4 text-[#5f6368] cursor-pointer hover:text-red-500 transition-colors" onClick={() => { setContent(''); setTo(''); setSubject(''); }} />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
