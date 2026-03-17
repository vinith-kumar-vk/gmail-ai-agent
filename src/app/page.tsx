'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox,
  Activity,
  CheckCircle,
  RefreshCw,
  Mail,
  Clock,
  Search,
  Trash2,
  ShieldCheck,
  Zap,
  Settings,
  ChevronRight,
  AlertCircle,
  Mic,
  MicOff,
  Send,
  Loader2,
  Plus,
  LogOut,
  Star,
  FileText,
  Archive,
  Menu,
  MoreVertical,
  Grid,
  Paperclip,
  Sparkles,
} from 'lucide-react';
import ComposeModal from '@/components/ComposeModal';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'active'>('idle');
  const [settings, setSettings] = useState<any>({ autoReplyEnabled: false, targetEmail: 'vinithkumar78876@gmail.com' });
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecordingGlobal, setIsRecordingGlobal] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'inbox' | 'sent' | 'starred' | 'settings'>('dashboard');
  const [emailDraft, setEmailDraft] = useState('');
  const [appPasswordDraft, setAppPasswordDraft] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null); // for confirm modal

  const stripMarkdown = (md: string) => {
    if (!md) return '';
    return md
      // Strip links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Strip images ![text](url) -> text
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      // Strip bold/italics
      .replace(/(\*\*|__|\*|_)(.*?)\1/g, '$2')
      // Strip headers
      .replace(/^#+\s+/gm, '')
      // Strip strikethrough
      .replace(/~~(.*?)~~/g, '$1')
      // Strip inline code
      .replace(/`([^`]+)`/g, '$1')
      // Strip blockquotes
      .replace(/^\s*>+\s?/gm, '')
      // Strip horizontal rules
      .replace(/^---+$/gm, '')
      // Strip links like <http...>
      .replace(/<([^>]+)>/g, '$1')
      // Clean up multiple spaces/newlines
      .replace(/\\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    try {
      const [threadsRes, statusRes, settingsRes] = await Promise.all([
        fetch('/api/threads'),
        fetch('/api/agent/start'),
        fetch('/api/settings'),
      ]);
      const threadsJson = await threadsRes.json();
      const statusJson = await statusRes.json();
      const settingsJson = await settingsRes.json();

      setData(threadsJson);
      setAgentStatus(statusJson.status || 'idle');
      
      // Auto-trigger agent if idle and we have a password
      if (statusJson.status === 'idle' && settingsJson.hasAppPassword) {
         fetch('/api/agent/start', { method: 'POST' }).catch(e => console.error("Agent trigger fail:", e));
      }

      const email = settingsJson.targetEmail || '';
      setSettings({
        autoReplyEnabled: settingsJson.autoReplyEnabled ?? false,
        targetEmail: email,
        hasAppPassword: settingsJson.hasAppPassword
      });
      setEmailDraft(email);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoReply = async () => {
    const newVal = !settings.autoReplyEnabled;
    try {
      setSettings({ ...settings, autoReplyEnabled: newVal });
      await fetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify({ autoReplyEnabled: newVal }),
      });
    } catch (error) {
      console.error('Toggle error:', error);
    }
  };

  const handleUpdateEmail = async (newEmail: string, confirmed = false) => {
    const trimmed = newEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError('Please enter a valid email address.');
      showToast('Invalid email format', 'error');
      return;
    }
    setEmailError('');

    // If same email, just save without clearing
    const isSameEmail = trimmed === settings.targetEmail;
    if (!isSameEmail && !confirmed) {
      // Show confirmation modal
      setPendingEmail(trimmed);
      return;
    }

    setIsSavingEmail(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          targetEmail: trimmed, 
          appPassword: appPasswordDraft || undefined,
          clearData: !isSameEmail 
        }),
      });
      if (!res.ok) throw new Error('Server error');
      const json = await res.json();
      setSettings((prev: any) => ({ 
        ...prev, 
        targetEmail: trimmed,
        hasAppPassword: json.hasAppPassword 
      }));
      
      setEmailDraft(trimmed);
      setAppPasswordDraft(''); // Clear draft after save
      setPendingEmail(null);

      if (json.dataCleared) {
        showToast('Settings reset & data cleared.', 'success');
        setData((prev: any) => ({ ...prev, threads: [] }));
        fetchData();
      } else {
        showToast(`Settings saved successfully`, 'success');
      }
    } catch (error) {
      showToast('Failed to save. Please try again.', 'error');
      console.error('Update email error:', error);
    } finally {
      setIsSavingEmail(false);
    }
  };


  const handleDeleteThread = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Move conversation to trash?')) return;
    try {
      await fetch(`/api/threads/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleManualReply = async (threadId: string, to: string, subject: string, text: string) => {
    if (!text.trim()) return;
    try {
      const res = await fetch(`/api/threads/${threadId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: text, to, subject })
      });
      if (res.ok) {
        fetchData();
        return true;
      }
    } catch (error) {
      console.error(error);
    }
    return false;
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const startSpeechToText = (callback: (text: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Voice recognition not supported');
    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsRecordingGlobal(true);
    recognition.onend = () => setIsRecordingGlobal(false);
    recognition.onresult = (event: any) => {
      callback(event.results[0][0].transcript);
    };
    recognition.start();
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const filteredThreads = data?.threads?.filter((t: any) => {
    if (!t.messages || t.messages.length === 0) return false;
    
    const matchesSearch = t.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.messages.some((m: any) => m.from?.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    
    if (currentView === 'inbox') return t.messages.some((m: any) => m.role === 'user');
    if (currentView === 'sent') return t.messages.some((m: any) => m.role === 'ai' || m.from === 'me');
    if (currentView === 'starred') return t.messages.some((m: any) => m.sentiment === 'negative');
    return true;
  });

  const chartData = [
    { name: 'Positive', val: data?.stats?.positive || 0, fill: '#1e8e3e' },
    { name: 'Neutral', val: data?.stats?.neutral || 0, fill: '#f9ab00' },
    { name: 'Priority', val: data?.stats?.negative || 0, fill: '#d93025' },
  ];

  return (
    <div className="flex h-screen bg-[#f1f3f4] text-[#202124] font-sans antialiased overflow-hidden">
      
      {/* Refined Sidebar */}
      <aside className="w-[260px] flex flex-col pt-4 pr-3">
        <div className="flex items-center gap-3 px-6 mb-8">
           <Menu className="w-5 h-5 text-[#5f6368] cursor-pointer" />
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#1a73e8] rounded-md flex items-center justify-center">
                 <Mail className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-medium tracking-tight text-[#5f6368]">Tekquora</span>
           </div>
        </div>

        <button 
          onClick={() => setIsComposeOpen(true)}
          className="ml-2 mb-8 flex items-center gap-3 px-6 py-4 bg-white hover:shadow-md transition-all rounded-2xl text-[#3c4043] font-medium border border-[#dadce0] w-[150px]"
        >
          <Plus className="w-6 h-6 text-[#1a73e8]" />
          <span>Compose</span>
        </button>

        <nav className="flex flex-col">
          {[
            { id: 'dashboard', label: 'Monitor', icon: <Grid className="w-5 h-5" /> },
            { id: 'inbox', label: 'Inbox', icon: <Inbox className="w-5 h-5" />, count: data?.stats?.pending },
            { id: 'starred', label: 'Flagged', icon: <Star className="w-5 h-5" />, count: data?.stats?.flagged },
            { id: 'sent', label: 'Sent', icon: <Send className="w-5 h-5" /> },
            { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as any)}
              className={`flex items-center gap-4 px-6 py-2.5 rounded-r-full text-[14px] transition-all ${
                currentView === item.id ? 'bg-[#e8f0fe] text-[#1a73e8] font-semibold shadow-sm' : 'text-[#202124] opacity-80 hover:bg-[#e1e3e1] hover:opacity-100'
              }`}
            >
              <div className="flex-1 flex items-center gap-4">
                {item.icon}
                <span className="tracking-wide">{item.label}</span>
              </div>
              {item.count ? <span className="text-[11px] font-bold bg-[#1a73e8]/10 px-2 py-0.5 rounded-full">{item.count}</span> : null}
            </button>
          ))}
        </nav>

        <div className="mt-auto px-6 py-6 border-t border-[#dadce0]">
           <button 
             onClick={handleLogout}
             className="w-full flex items-center gap-3 py-2 text-sm text-[#5f6368] hover:text-[#d93025] transition-colors"
           >
             <LogOut className="w-4 h-4" />
             <span>Sign out</span>
           </button>
        </div>
      </aside>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl text-sm font-semibold ${
              toast.type === 'success'
                ? 'bg-[#1e8e3e] text-white'
                : 'bg-[#d93025] text-white'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Change Confirmation Modal */}
      <AnimatePresence>
        {pendingEmail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPendingEmail(null)}
              className="absolute inset-0 bg-[#202124]/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl border border-[#dadce0] max-w-md w-full p-8"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-[#fce8e6] rounded-xl flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-[#d93025]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#202124] mb-1">Change Agent Email?</h2>
                  <p className="text-sm text-[#5f6368] leading-relaxed">
                    Switching to <strong className="text-[#202124]">{pendingEmail}</strong> will permanently delete all current conversation data (threads &amp; messages). This cannot be undone.
                  </p>
                </div>
              </div>

              <div className="bg-[#fef7e0] border border-[#f9ab00]/40 rounded-xl p-4 mb-6 text-sm text-[#5f6368] leading-relaxed space-y-1">
                <p className="font-bold text-[#202124]">⚠ What will happen:</p>
                <p>• All stored email threads will be deleted</p>
                <p>• All conversation history will be cleared</p>
                <p>• Gmail OAuth token will be reset</p>
                <p>• Agent will start fresh for the new email</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setPendingEmail(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[#dadce0] text-sm font-semibold text-[#5f6368] hover:bg-[#f1f3f4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateEmail(pendingEmail, true)}
                  disabled={isSavingEmail}
                  className="flex-1 py-2.5 rounded-xl bg-[#d93025] hover:bg-[#c5221f] text-white text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSavingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Yes, Clear &amp; Switch
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content View */}
      <main className="flex-1 flex flex-col bg-white my-2 mr-2 rounded-2xl shadow-xl border border-[#dadce0] overflow-hidden">
        
        {/* Toolbelt Header */}
        <div className="h-14 px-6 flex items-center justify-between border-b border-[#f1f3f4] bg-[#f8f9fa]/50">
          <div className="flex-1 max-w-3xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368]" />
            <input 
              type="text" 
              placeholder="Filter conversations..."
              className="w-full bg-[#f1f3f4] focus:bg-white focus:ring-1 focus:ring-[#1a73e8] border-none rounded-lg py-2 pl-12 pr-4 outline-none transition-all text-sm placeholder:text-[#5f6368]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-6 ml-6">
             <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-[#5f6368] uppercase tracking-tighter">AI AGENT</span>
                <button 
                  onClick={handleToggleAutoReply}
                  className={`w-8 h-4 rounded-full relative transition-all ${settings.autoReplyEnabled ? 'bg-[#1a73e8]' : 'bg-[#dadce0]'}`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${settings.autoReplyEnabled ? 'left-4.5' : 'left-0.5'}`} />
                </button>
             </div>
             <div className="w-9 h-9 rounded-full bg-[#1a73e8] flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm cursor-pointer hover:scale-105 transition-transform">V</div>
          </div>
        </div>

        {/* Action Header */}
        <div className="h-12 px-6 flex items-center gap-6 border-b border-[#f1f3f4]">
           <button className="p-2 hover:bg-[#f1f3f4] rounded-full transition-colors" onClick={fetchData}>
              <RefreshCw className={`w-4 h-4 text-[#5f6368] ${loading ? 'animate-spin' : ''}`} />
           </button>
           <button className="p-2 hover:bg-[#f1f3f4] rounded-full transition-colors">
              <MoreVertical className="w-4 h-4 text-[#5f6368]" />
           </button>
           <div className="flex-1" />
           <div className="flex items-center gap-1 text-[#5f6368] text-xs">
              <span className="opacity-70 font-medium">Synced:</span>
              <span className="font-bold text-[#202124]">{data?.threads?.length || 0}</span>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {currentView === 'dashboard' ? (
            <div className="p-8 max-w-7xl mx-auto">
              <div className="flex items-end justify-between mb-10 pb-6 border-b border-[#f1f3f4]">
                <div>
                   <h1 className="text-3xl font-light text-[#202124] tracking-tight">Active Surveillance</h1>
                   <p className="text-[#5f6368] text-sm mt-1">Real-time status of your autonomous email delegate.</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold bg-[#f1f3f4] px-3 py-1.5 rounded-full text-[#5f6368]">
                   <span className={`w-2 h-2 rounded-full ${agentStatus === 'active' ? 'bg-[#1e8e3e]' : 'bg-[#d93025]'}`} />
                   {agentStatus.toUpperCase()}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-6 mb-10">
                {[
                  { label: 'Conversations', val: data?.threads?.length || 0, icon: <Mail />, color: '#1a73e8' },
                  { label: 'Auto-Replied', val: data?.stats?.replied || 0, icon: <CheckCircle />, color: '#1e8e3e' },
                  { label: 'Awaiting Actions', val: data?.stats?.pending || 0, icon: <Clock />, color: '#f9ab00' },
                  { label: 'Critical/Urgent', val: data?.stats?.flagged || 0, icon: <Star />, color: '#d93025' },
                ].map((s) => (
                  <div key={s.label} className="group bg-white border border-[#dadce0] p-6 rounded-xl hover:border-[#1a73e8] transition-all hover:shadow-lg hover:-translate-y-1">
                    <div className="flex items-center justify-between mb-4">
                       <div className="p-2 bg-[#f8f9fa] group-hover:bg-[#e8f0fe] rounded-lg transition-colors" style={{ color: s.color }}>
                          {React.cloneElement(s.icon as React.ReactElement, { size: 18 } as any)}
                       </div>
                    </div>
                    <div className="text-3xl font-normal text-[#202124]">{s.val}</div>
                    <div className="text-[12px] font-bold text-[#5f6368] mt-1 tracking-wider uppercase opacity-80">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 bg-[#f8f9fa] border border-[#dadce0] p-8 rounded-xl shadow-inner">
                  <h3 className="text-xs font-bold text-[#5f6368] mb-8 uppercase tracking-widest flex items-center gap-2">
                     <Activity size={14} className="text-[#1a73e8]" />
                     System Sentiment Distribution
                  </h3>
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#5f6368', fontWeight: 600 }} />
                        <YAxis hide />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.7)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="val" radius={[6, 6, 0, 0]} barSize={42}>
                          {chartData.map((e, idx) => <Cell key={idx} fill={e.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[#1a73e8] p-8 rounded-xl text-white relative overflow-hidden flex flex-col justify-between shadow-lg">
                    <div className="relative z-10">
                        <Zap className="w-8 h-8 text-[#e8f0fe] mb-6 opacity-30" />
                        <h3 className="text-xl font-medium mb-3">Live Feed</h3>
                        <p className="text-sm opacity-90 leading-relaxed font-light">
                            Analyzing intent and emotional tone across all incoming channels. Response latency: 124ms.
                        </p>
                    </div>
                    <div className="relative z-10 mt-6 pt-6 border-t border-white/20 flex items-center justify-between">
                       <span className="text-[10px] font-black tracking-widest">ENCRYPTED BRIDGE</span>
                       <div className="flex gap-1">
                          {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white opacity-40 animate-pulse" style={{ animationDelay: `${i*0.2}s` }} />)}
                       </div>
                    </div>
                    <div className="absolute top-[-20%] right-[-10%] w-[200px] h-[200px] bg-white/10 rounded-full blur-[60px]" />
                </div>
              </div>

              {/* Recent Activity Section */}
              <div className="mt-10 bg-white border border-[#dadce0] rounded-2xl overflow-hidden shadow-sm">
                <div className="px-8 py-4 bg-[#f8f9fa] border-b border-[#f1f3f4] flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <Clock size={16} className="text-[#1a73e8]" />
                      <span className="text-xs font-black text-[#5f6368] uppercase tracking-widest">Recent Surveillance Activity</span>
                   </div>
                   <button 
                     onClick={() => setCurrentView('inbox')}
                     className="text-[10px] font-bold text-[#1a73e8] hover:underline uppercase tracking-tighter"
                   >
                     Inspect All
                   </button>
                </div>
                <div className="divide-y divide-[#f1f3f4]">
                  {data?.threads?.slice(0, 5).map((t: any) => {
                    const lastM = t.messages?.[t.messages.length - 1];
                    if (!lastM) return null;
                    return (
                      <div key={t.id} className="px-8 py-5 flex items-center justify-between hover:bg-[#f8f9fa] transition-colors cursor-pointer group" onClick={() => { setCurrentView('inbox'); }}>
                        <div className="flex items-center gap-5 flex-1 overflow-hidden">
                          <div className={`w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0 ${lastM?.role === 'ai' ? 'bg-[#1a73e8]' : 'bg-[#1e8e3e]'}`} />
                          <div className="overflow-hidden">
                            <h4 className="text-[14px] font-bold text-[#202124] truncate group-hover:text-[#1a73e8] transition-colors">{t.subject || '(No Subject)'}</h4>
                            <p className="text-[12px] text-[#5f6368] truncate opacity-60 font-light mt-0.5">{stripMarkdown(lastM?.content)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-8 ml-4">
                           <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest border ${lastM?.role === 'ai' ? 'bg-[#e8f0fe] text-[#1a73e8] border-[#1a73e8]/20' : 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0]'}`}>
                             {lastM?.role === 'ai' ? 'Transmitted' : 'Received'}
                           </span>
                           <span className="text-[11px] font-bold text-[#5f6368] opacity-30 tabular-nums">
                             {new Date(t.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                        </div>
                      </div>
                    );
                  })}
                  {(!data?.threads || data.threads.length === 0) && (
                    <div className="p-12 text-center text-[#5f6368] opacity-30 text-sm font-light italic flex flex-col items-center gap-3">
                      <Inbox size={32} className="opacity-20" />
                      No recent activity detected.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : currentView === 'settings' ? (
            <div className="p-10 max-w-4xl">
              <div className="mb-10">
                <h1 className="text-3xl font-light text-[#202124] tracking-tight">System Settings</h1>
                <p className="text-[#5f6368] text-sm mt-1">Configure your AI agent behavior and identity.</p>
              </div>

              <div className="space-y-8">
                <div className="bg-white border border-[#dadce0] rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-8 py-6 border-b border-[#f1f3f4] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-[#e8f0fe] rounded-lg">
                        <Mail className="w-5 h-5 text-[#1a73e8]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#202124]">Agent Identity</h3>
                        <p className="text-xs text-[#5f6368]">Configure the primary email for the AI agent.</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black bg-[#1e8e3e]/10 text-[#1e8e3e] px-2 py-0.5 rounded-full uppercase">Secure</span>
                  </div>
                  <div className="p-8">
                    <div className="max-w-md">
                      <label className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider block mb-2">Target Email Address</label>
                      <div className="flex gap-3">
                        <input 
                          type="email"
                          id="targetEmailInput"
                          className={`flex-1 bg-[#f1f3f4] border-2 px-4 py-2.5 rounded-xl outline-none transition-all text-sm text-[#202124] focus:bg-white ${
                            emailError ? 'border-[#d93025] bg-red-50' : 'border-transparent focus:border-[#1a73e8]'
                          }`}
                          value={emailDraft}
                          placeholder="your-email@gmail.com"
                          onChange={(e) => { setEmailDraft(e.target.value); setEmailError(''); }}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateEmail(emailDraft)}
                          disabled={isSavingEmail}
                        />
                        <button 
                          onClick={() => handleUpdateEmail(emailDraft)}
                          disabled={isSavingEmail || !emailDraft.trim()}
                          className="px-6 py-2.5 bg-[#1a73e8] hover:bg-[#1b66c9] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-[#1a73e8]/20 active:scale-95 flex items-center gap-2 min-w-[96px] justify-center"
                        >
                          {isSavingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
                        </button>
                      </div>
                      {emailError && (
                        <p className="text-[11px] text-[#d93025] mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {emailError}
                        </p>
                      )}
                      {!emailError && settings.targetEmail && (
                        <p className="text-[11px] text-[#5f6368] mt-2 flex items-center gap-1.5">
                          <CheckCircle className="w-3 h-3 text-[#1e8e3e]" />
                          <span className="opacity-80">Currently active: <strong>{settings.targetEmail}</strong></span>
                        </p>
                      )}
                      <p className="text-[11px] text-[#5f6368] mt-3 opacity-60 leading-relaxed italic">
                        The agent uses this email to identify which messages are sent by you. It prevents self-replying and helps in message sentiment analysis.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-[#dadce0] rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-8 py-6 border-b border-[#f1f3f4] flex items-center justify-between bg-red-50/30">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Trash2 className="w-5 h-5 text-[#d93025]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#202124]">System Master Reset</h3>
                        <p className="text-xs text-[#5f6368]">Permanently wipe all conversations from the dashboard.</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-8">
                    <div className="max-w-md">
                      <p className="text-xs text-[#5f6368] mb-6 leading-relaxed">
                        This will clear every message and thread from your local database. 
                        <strong> Note:</strong> The AI Agent will re-sync your latest emails automatically unless you also delete them in Gmail.
                      </p>
                      <button 
                        onClick={async () => {
                          if (confirm('Are you absolutely sure? This will wipe ALL conversations from the dashboard.')) {
                            try {
                              const res = await fetch('/api/threads/wipe', { method: 'POST' });
                              if (res.ok) {
                                alert('Dashboard wiped successfully.');
                                fetchData();
                              }
                            } catch (e) {
                              alert('Error wiping data.');
                            }
                          }
                        }}
                        className="px-6 py-2.5 border-2 border-[#d93025] text-[#d93025] hover:bg-red-50 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center gap-2"
                      >
                        Wipe All Conversations
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-[#dadce0] rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-8 py-6 border-b border-[#f1f3f4] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-[#f8f9fa] rounded-lg">
                        <ShieldCheck className="w-5 h-5 text-[#5f6368]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#202124]">Gmail Connection</h3>
                        <p className="text-xs text-[#5f6368]">Link your Google account to enable AI monitoring.</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-8">
                    <div className="max-w-md">
                      <div className="mb-6">
                        <label className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider block mb-2">Google App Password</label>
                        <div className="flex gap-3">
                          <input 
                            type="password"
                            className="flex-1 bg-[#f1f3f4] border-2 border-transparent px-4 py-2.5 rounded-xl outline-none transition-all text-sm text-[#202124] focus:bg-white focus:border-[#1a73e8]"
                            value={appPasswordDraft}
                            placeholder={settings.hasAppPassword ? "•••• •••• •••• ••••" : "Enter 16-digit app password"}
                            onChange={(e) => setAppPasswordDraft(e.target.value)}
                          />
                          <button 
                            onClick={() => handleUpdateEmail(emailDraft)}
                            disabled={isSavingEmail || !appPasswordDraft.trim()}
                            className="px-6 py-2.5 bg-[#1a73e8] hover:bg-[#1b66c9] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-[#1a73e8]/20 flex items-center gap-2"
                          >
                            {isSavingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Key'}
                          </button>
                        </div>
                        {settings.hasAppPassword ? (
                          <p className="text-[11px] text-[#1e8e3e] mt-2 flex items-center gap-1.5 font-bold uppercase tracking-tight">
                            <ShieldCheck className="w-3.5 h-3.5" /> Security key established
                          </p>
                        ) : (
                          <p className="text-[11px] text-[#d93025] mt-2 flex items-center gap-1.5 font-bold uppercase tracking-tight">
                            <AlertCircle className="w-3.5 h-3.5" /> Connection Pending
                          </p>
                        )}
                      </div>

                      <div className="bg-[#f8f9fa] border border-[#dadce0] rounded-xl p-5">
                        <h4 className="text-[11px] font-black text-[#202124] uppercase mb-3 tracking-widest">Setup Instructions</h4>
                        <div className="space-y-3 text-[12px] text-[#5f6368] leading-relaxed">
                          <div className="flex gap-3">
                            <span className="w-5 h-5 bg-white border border-[#dadce0] rounded-md flex items-center justify-center flex-shrink-0 font-bold text-[#1a73e8]">1</span>
                            <p>Enable <a href="https://myaccount.google.com/signinoptions/two-step-verification" target="_blank" className="text-[#1a73e8] underline">2-Step Verification</a> in your Google Account.</p>
                          </div>
                          <div className="flex gap-3">
                            <span className="w-5 h-5 bg-white border border-[#dadce0] rounded-md flex items-center justify-center flex-shrink-0 font-bold text-[#1a73e8]">2</span>
                            <p>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" className="text-[#1a73e8] underline">App Passwords</a> and generate a 16-digit key.</p>
                          </div>
                          <div className="flex gap-3">
                            <span className="w-5 h-5 bg-white border border-[#dadce0] rounded-md flex items-center justify-center flex-shrink-0 font-bold text-[#1a73e8]">3</span>
                            <p>Paste the code above and click <strong>Save Key</strong> to start syncing.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full bg-white">
              {filteredThreads?.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[#5f6368]/40 scale-90">
                   <Inbox className="w-24 h-24 mb-6 stroke-[1px]" />
                   <p className="text-xl font-light">Clear horizon in {currentView}</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {filteredThreads?.map((t: any) => (
                    <ThreadRow 
                      key={t.id} 
                      thread={t} 
                      onDelete={handleDeleteThread}
                      onReply={handleManualReply}
                      onMic={startSpeechToText}
                      isRecordingGlobal={isRecordingGlobal}
                      stripMarkdown={stripMarkdown}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <ComposeModal 
        isOpen={isComposeOpen} 
        onClose={() => setIsComposeOpen(false)} 
        onSent={fetchData}
      />
    </div>
  );
}

function ThreadRow({ thread, onDelete, onReply, onMic, isRecordingGlobal, stripMarkdown }: any) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingLocal, setIsSendingLocal] = useState(false);
  const [isRefiningLocal, setIsRefiningLocal] = useState(false);
  
  const messages = thread.messages;
  const lastMsg = messages[messages.length - 1];
  const firstMsg = messages[0];
  const sentiment = firstMsg.sentiment || 'neutral';
  
  const sentimentColor = sentiment === 'positive' ? '#1e8e3e' : sentiment === 'negative' ? '#d93025' : '#f9ab00';

  return (
    <div className={`transition-all duration-300 ${isExpanded ? 'bg-[#f8faff] border-y border-[#d2e3fc] my-4 shadow-lg ring-1 ring-[#1a73e8]/10' : 'hover:bg-[#f2f6fc] bg-white border-b border-[#f1f3f4]'}`}>
      <div 
        className={`flex items-center gap-4 px-6 h-12 cursor-pointer select-none group relative transition-colors ${isExpanded ? 'bg-white border-b border-[#e8f0fe]' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Active Indicator Line */}
        {isExpanded && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1a73e8] rounded-r-full" />}

        <div className="flex items-center gap-4 w-52 flex-shrink-0">
           <Star className={`w-4 h-4 transition-colors ${isExpanded ? 'text-[#f9ab00]' : 'text-[#dadce0] hover:text-[#f9ab00]'}`} />
           <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: sentimentColor }} />
           <span className={`text-[13px] transition-all duration-200 truncate ${isExpanded ? 'text-[#1a73e8] font-black' : 'font-bold text-[#202124] group-hover:text-black'}`}>
              {firstMsg.from?.split('<')[0].trim() || 'Unknown'}
           </span>
        </div>
        
        <div className="flex-1 flex items-center gap-3 overflow-hidden text-sm">
           <span className={`transition-colors duration-200 truncate min-w-[120px] ${isExpanded ? 'font-bold text-[#202124]' : 'font-semibold text-[#202124]'}`}>
              {thread.subject || '(Subject Missing)'}
           </span>
           {!isExpanded && <span className="text-[#5f6368] truncate opacity-60">- {stripMarkdown(lastMsg.content)}</span>}
        </div>
        
        <div className="flex items-center gap-4">
           <div className={`text-[11px] font-bold min-w-[70px] text-right tabular-nums transition-opacity ${isExpanded ? 'text-[#1a73e8]' : 'text-[#5f6368] opacity-60'}`}>
              {new Date(thread.lastUpdate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
           </div>
           {!isExpanded && (
             <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-all">
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(thread.id, e); }}
                  className="p-1.5 hover:bg-white rounded-full shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5 text-[#d93025]" />
                </button>
             </div>
           )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-16 py-10 bg-[#f8faff]/50">
              <div className="flex items-start justify-between mb-10">
                <div>
                  <h2 className="text-2xl font-light text-[#202124] mb-3 tracking-tight">{thread.subject}</h2>
                  <div className="flex items-center gap-3">
                     <span className="px-2.5 py-1 bg-[#e8f0fe] text-[#1a73e8] rounded-md text-[9px] font-black uppercase tracking-widest border border-[#1a73e8]/20 shadow-sm">ACTIVE THREAD</span>
                     <span className="text-xs text-[#5f6368] font-medium opacity-60 flex items-center gap-1.5">
                        <Clock size={12} />
                        Syncing every 8s
                     </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <button className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all text-[#5f6368] hover:text-[#1a73e8] border border-transparent hover:border-[#dadce0]"><Archive size={18} /></button>
                   <button className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all text-[#5f6368] hover:text-[#202124] border border-transparent hover:border-[#dadce0]"><MoreVertical size={18} /></button>
                </div>
              </div>

              <div className="space-y-6 mb-12 pl-4 border-l-2 border-[#d2e3fc]">
                {messages.map((m: any, idx: number) => (
                  <div key={idx} className={`flex gap-5 relative group/msg ${m.role === 'ai' ? 'justify-start' : 'justify-start'}`}>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-md flex-shrink-0 transition-transform group-hover/msg:scale-105 ${m.role === 'ai' ? 'bg-[#1a73e8] rounded-tl-none' : 'bg-[#34a853] rounded-tl-none'}`}>
                       {m.role === 'ai' ? 'AI' : (m.from[0] || 'U').toUpperCase()}
                    </div>
                    <div className="flex-1 max-w-3xl bg-white p-6 rounded-2xl rounded-tl-none border border-[#e8f0fe] shadow-sm hover:shadow-md transition-shadow">
                       <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#f1f3f4]">
                          <div className="flex items-center gap-2">
                             <span className="text-sm font-black text-[#202124]">{m.role === 'ai' ? 'Tekquora Intelligence' : m.from}</span>
                             <span className="text-[10px] bg-[#f1f3f4] px-2 py-0.5 rounded-full text-[#5f6368] font-bold tracking-tight">VERIFIED</span>
                          </div>
                          <span className="text-[11px] font-bold text-[#5f6368] opacity-50 uppercase tracking-tighter">
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                       </div>
                       <div className="text-[15px] text-[#3c4043] leading-relaxed whitespace-pre-wrap font-light">
                          {m.content}
                       </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-10 border-t border-[#d2e3fc]">
                 <div className="bg-white border-2 border-[#d2e3fc] rounded-2xl shadow-xl overflow-hidden focus-within:border-[#1a73e8] transition-all">
                    <div className="px-6 py-4 bg-[#f8faff] border-b border-[#f1f3f4] flex items-center justify-between">
                       <span className="text-[11px] font-black text-[#1a73e8] uppercase tracking-widest">Autonomous Draft Engine</span>
                       <Zap size={14} className="text-[#f9ab00] animate-pulse" />
                    </div>
                    <textarea 
                      className="w-full h-40 p-8 text-[15px] bg-transparent outline-none resize-none placeholder:text-[#9aa0a6] text-[#202124] font-light leading-relaxed"
                      placeholder="Compose your high-priority response here..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <div className="p-5 flex items-center justify-between bg-[#f8faff] border-t border-[#f1f3f4]">
                       <div className="flex items-center gap-4">
                          <button 
                            onClick={() => onMic((text: string) => setReplyText(prev => prev + ' ' + text))}
                            className={`p-3.5 rounded-2xl transition-all shadow-sm ${isRecordingGlobal ? 'bg-red-500 text-white scale-110 shadow-red-200' : 'bg-white hover:bg-[#e8f0fe] text-[#5f6368] hover:text-[#1a73e8] border border-[#dadce0]'}`}
                            title="Voice Dictation"
                          >
                            <Mic size={20} />
                          </button>
                          <div className="h-6 w-[1px] bg-[#dadce0]" />
                          <button className="p-2 text-[#5f6368] hover:text-[#1a73e8] transition-colors"><FileText size={18} /></button>
                           <button className="p-2 text-[#5f6368] hover:text-[#1a73e8] transition-colors"><Paperclip size={18} /></button>
                           
                           <div className="h-6 w-[1px] bg-[#dadce0] mx-2" />
                           
                           <button
                             onClick={async () => {
                               if (!replyText.trim()) return;
                               setIsRefiningLocal(true);
                               try {
                                 const res = await fetch('/api/ai/refine', {
                                   method: 'POST',
                                   headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify({ 
                                     transcript: replyText,
                                     context: { from: firstMsg.from, subject: thread.subject || 'Reply' }
                                   }),
                                 });
                                 const data = await res.json();
                                 if (data.refinedReply) setReplyText(data.refinedReply);
                               } catch (error) {
                                 console.error(error);
                               } finally {
                                 setIsRefiningLocal(false);
                               }
                             }}
                             disabled={isRefiningLocal || !replyText.trim()}
                             className={`h-11 px-4 rounded-xl flex items-center gap-2 transition-all border ${
                               isRefiningLocal ? 'bg-gray-50 border-[#dadce0] text-gray-400' : 'bg-white border-[#dadce0] text-[#1a73e8] hover:bg-[#e8f0fe] hover:border-[#1a73e8]/30 shadow-sm'
                             }`}
                           >
                             {isRefiningLocal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                             <span className="text-xs font-black tracking-widest uppercase">AI REFINEMENT</span>
                           </button>
                        </div>
                       <button 
                         onClick={async () => {
                           setIsSendingLocal(true);
                           const success = await onReply(thread.gmailThreadId || thread.id, firstMsg.from, thread.subject, replyText);
                           if (success) {
                             setReplyText('');
                             setIsExpanded(false);
                           }
                           setIsSendingLocal(false);
                         }}
                         disabled={!replyText.trim() || isSendingLocal}
                         className="bg-[#1a73e8] hover:bg-[#1b66c9] text-white px-10 py-3 rounded-2xl font-black text-sm tracking-widest uppercase shadow-xl shadow-[#1a73e8]/30 disabled:opacity-40 transition-all flex items-center gap-3 hover:-translate-y-0.5 active:translate-y-0"
                       >
                         {isSendingLocal ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                         Transmit
                       </button>
                    </div>
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
