import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Sparkles, Send, Loader2, User, Download, Upload, Search, MessageSquare, LogOut, Mail, Save, History } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const BookCompanion = () => {
  // Authentication state
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authStatus, setAuthStatus] = useState('idle'); // 'idle' | 'sending' | 'sent' | 'verifying'

  // Conversation state
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [conversation, setConversation] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [savedConversations, setSavedConversations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // UI state
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authorKnowledge, setAuthorKnowledge] = useState(null);
  const [isLoadingAuthor, setIsLoadingAuthor] = useState(false);
  const [researchStatus, setResearchStatus] = useState([]);
  const [questionStarters, setQuestionStarters] = useState([]);

  const conversationEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Check for token on mount and verify magic link
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setAuthToken(token);
      // Decode token to get user info (simple decode, not verification)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ id: payload.userId, email: payload.email });
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem('authToken');
      }
    }

    // Check if this is a magic link verification
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      verifyMagicLink(token);
    }
  }, []);

  // Load conversations when user logs in
  useEffect(() => {
    if (user && authToken) {
      fetchConversations();
    }
  }, [user, authToken]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Authentication functions
  const sendMagicLink = async (e) => {
    e.preventDefault();
    setAuthStatus('sending');

    try {
      const response = await fetch(`${API_URL}/api/auth/send-magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail }),
      });

      if (!response.ok) {
        throw new Error('Failed to send magic link');
      }

      setAuthStatus('sent');
    } catch (error) {
      console.error('Error sending magic link:', error);
      alert('Failed to send magic link. Please try again.');
      setAuthStatus('idle');
    }
  };

  const verifyMagicLink = async (token) => {
    setAuthStatus('verifying');

    try {
      const response = await fetch(`${API_URL}/api/auth/verify/${token}`);

      if (!response.ok) {
        throw new Error('Invalid or expired magic link');
      }

      const data = await response.json();

      // Store token and user info
      localStorage.setItem('authToken', data.token);
      setAuthToken(data.token);
      setUser(data.user);
      setShowAuthModal(false);
      setAuthStatus('idle');

      // Clear URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);

      alert(`Welcome back, ${data.user.email}!`);
    } catch (error) {
      console.error('Error verifying magic link:', error);
      alert('Invalid or expired magic link. Please try logging in again.');
      setAuthStatus('idle');
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setAuthToken(null);
    setUser(null);
    setSavedConversations([]);
    setConversation([]);
    setAuthorKnowledge(null);
    setConversationId(null);
    setBookTitle('');
    setBookAuthor('');
  };

  const getAuthHeaders = () => {
    return authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
  };

  // Conversation management functions
  const fetchConversations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/conversations`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      setSavedConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const saveConversation = async () => {
    if (!user || !authToken) {
      alert('Please log in to save conversations');
      setShowAuthModal(true);
      return;
    }

    if (!bookTitle || !authorKnowledge || conversation.length === 0) {
      alert('Start a conversation before saving');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          conversationId,
          bookTitle,
          bookAuthor,
          authorKnowledge,
          messages: conversation,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save conversation');
      }

      const data = await response.json();
      setConversationId(data.conversation.id);
      fetchConversations(); // Refresh list
      alert('Conversation saved!');
    } catch (error) {
      console.error('Error saving conversation:', error);
      alert('Failed to save conversation. Please try again.');
    }
  };

  const loadConversation = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/conversations/${id}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }

      const data = await response.json();
      const conv = data.conversation;

      setBookTitle(conv.book_title);
      setBookAuthor(conv.book_author);
      setAuthorKnowledge(conv.author_knowledge);
      setConversation(conv.messages.map(m => ({ role: m.role, content: m.content })));
      setConversationId(conv.id);
      setShowHistory(false);
    } catch (error) {
      console.error('Error loading conversation:', error);
      alert('Failed to load conversation');
    }
  };

  const deleteConversation = async (id) => {
    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/conversations/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }

      fetchConversations(); // Refresh list

      if (conversationId === id) {
        // Clear current conversation if it was deleted
        setConversation([]);
        setAuthorKnowledge(null);
        setConversationId(null);
        setBookTitle('');
        setBookAuthor('');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation');
    }
  };

  const loadAuthorKnowledge = async () => {
    if (!bookTitle.trim()) {
      alert('Please enter a book title first');
      return;
    }

    setIsLoadingAuthor(true);
    setResearchStatus(['Starting research...']);
    setQuestionStarters([]);

    try {
      const response = await fetch(`${API_URL}/api/load-author`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookTitle,
          bookAuthor
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.status) {
                setResearchStatus(prev => [...prev, data.status]);
              }

              if (data.done) {
                setAuthorKnowledge(data.knowledge);
                if (data.questionStarters) {
                  setQuestionStarters(data.questionStarters);
                }

                // Start with author's greeting
                try {
                  const greeting = await getAuthorGreeting(data.knowledge);
                  setConversation([{ role: 'assistant', content: greeting }]);
                } catch (greetingError) {
                  console.error('Greeting failed, using default:', greetingError);
                  setConversation([{
                    role: 'assistant',
                    content: `Hello! I'm ${bookAuthor}, and I'm delighted to discuss "${bookTitle}" with you. What would you like to explore together?`
                  }]);
                }
              }

              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              console.error('Error parsing research stream:', e);
            }
          }
        }
      }

      setIsLoadingAuthor(false);
    } catch (error) {
      console.error('Error loading author knowledge:', error);
      alert(`Failed to load author information: ${error.message}. Please check that the backend is running on ${API_URL}`);
      setIsLoadingAuthor(false);
    }
  };

  const getAuthorGreeting = async (knowledge) => {
    try {
      const response = await fetch(`${API_URL}/api/greeting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookTitle,
          bookAuthor,
          knowledge
        }),
      });

      if (!response.ok) {
        throw new Error('Greeting request failed');
      }

      const data = await response.json();
      return data.greeting || `Hello! I'm ${bookAuthor}, and I'm delighted to discuss ${bookTitle} with you. What would you like to explore together?`;
    } catch (error) {
      console.error('Error getting greeting:', error);
      return `Hello! I'm ${bookAuthor}, and I'm delighted to discuss ${bookTitle} with you. What would you like to explore together?`;
    }
  };

  const sendMessage = async (overrideInput = '') => {
    const messageText = overrideInput || userInput;
    if (!messageText.trim() || isLoading) return;

    const userMessage = { role: 'user', content: messageText };
    const initialConversation = [...conversation, userMessage];
    setConversation(initialConversation);
    if (!overrideInput) setUserInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookTitle,
          bookAuthor,
          authorKnowledge,
          conversation: initialConversation,
        }),
      });

      if (!response.ok) throw new Error('Failed to start stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponseText = '';

      // Add a placeholder message for the AI
      setConversation([...initialConversation, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') break;

            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                aiResponseText += data.text;
                // Update the last message in the conversation
                setConversation(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: aiResponseText };
                  return updated;
                });
              }
            } catch (e) {
              console.error('Error parsing stream chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('API Error:', error);
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, something went wrong. Please try again.'
      }]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetConversation = () => {
    setConversation([]);
    setAuthorKnowledge(null);
    setBookTitle('');
    setBookAuthor('');
  };

  const exportConversation = (format) => {
    if (conversation.length === 0) {
      alert('No conversation to export yet!');
      return;
    }

    let content = '';
    let filename = '';
    let mimeType = '';

    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = `${bookTitle.replace(/[^a-z0-9]/gi, '_')}_conversation_${timestamp}`;

    if (format === 'markdown') {
      content = `# Conversation with ${bookAuthor}\n## About ${bookTitle}\n\n`;
      content += `Date: ${new Date().toLocaleDateString()}\n\n---\n\n`;

      conversation.forEach((msg) => {
        if (msg.role === 'user') {
          content += `### You\n\n${msg.content}\n\n`;
        } else {
          content += `### ${bookAuthor}\n\n${msg.content}\n\n`;
        }
      });

      filename = `${baseFilename}.md`;
      mimeType = 'text/markdown';
    } else if (format === 'json') {
      const exportData = {
        book: {
          title: bookTitle,
          author: bookAuthor
        },
        exportDate: new Date().toISOString(),
        conversation: conversation,
        authorKnowledge: authorKnowledge
      };
      content = JSON.stringify(exportData, null, 2);
      filename = `${baseFilename}.json`;
      mimeType = 'application/json';
    } else if (format === 'txt') {
      content = `Conversation with ${bookAuthor}\nAbout: ${bookTitle}\n`;
      content += `Date: ${new Date().toLocaleString()}\n\n${'='.repeat(60)}\n\n`;

      conversation.forEach((msg) => {
        const speaker = msg.role === 'user' ? 'You' : bookAuthor;
        content += `[${speaker}]\n${msg.content}\n\n${'-'.repeat(60)}\n\n`;
      });

      filename = `${baseFilename}.txt`;
      mimeType = 'text/plain';
    }

    // Create and trigger download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importConversation = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target.result;

        // Try to parse as JSON first
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(content);

          // Validate the data structure
          if (!data.book || !data.conversation || !Array.isArray(data.conversation)) {
            throw new Error('Invalid conversation file format');
          }

          // Load the data
          setBookTitle(data.book.title || '');
          setBookAuthor(data.book.author || '');
          setConversation(data.conversation);
          setAuthorKnowledge(data.authorKnowledge || null);

          alert(`Conversation loaded! ${data.conversation.length} messages restored.`);
        } else {
          alert('Please upload a JSON file exported from this app. Markdown and text exports are for reading only.');
        }
      } catch (error) {
        console.error('Import error:', error);
        alert('Failed to load conversation file. Make sure it\'s a valid JSON export from this app.');
      }
    };

    reader.onerror = () => {
      alert('Failed to read file. Please try again.');
    };

    reader.readAsText(file);

    // Reset the input so the same file can be loaded again if needed
    event.target.value = '';
  };

  const triggerFileUpload = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-10 h-10 text-purple-300" />
              <Sparkles className="w-6 h-6 text-yellow-300" />
              <h1 className="text-4xl font-bold text-white">Chat with the Author</h1>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <span className="text-purple-200 text-sm">{user.email}</span>
                  <button
                    onClick={logout}
                    className="text-purple-200 hover:text-white transition-colors text-sm px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="text-purple-200 hover:text-white transition-colors text-sm px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Sign In
                </button>
              )}
            </div>
          </div>
          <p className="text-purple-200">Have a personal conversation with the author of any book</p>
        </div>

        {/* Magic Link Auth Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">Sign in to Book Companion</h2>

              {authStatus === 'sent' ? (
                <div className="text-center">
                  <Mail className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  <p className="text-white mb-2">Check your email!</p>
                  <p className="text-purple-200 text-sm mb-4">
                    We've sent a magic link to <strong>{authEmail}</strong>
                  </p>
                  <p className="text-purple-300 text-xs mb-6">
                    Click the link in your email to sign in. The link expires in 15 minutes.
                  </p>
                  <button
                    onClick={() => { setAuthStatus('idle'); setAuthEmail(''); }}
                    className="text-purple-300 hover:text-white text-sm"
                  >
                    Try different email
                  </button>
                </div>
              ) : (
                <form onSubmit={sendMagicLink}>
                  <p className="text-purple-200 mb-4">
                    Enter your email to receive a magic link. No password needed!
                  </p>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 mb-4"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setShowAuthModal(false); setAuthEmail(''); setAuthStatus('idle'); }}
                      className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={authStatus === 'sending'}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-500 disabled:to-gray-600 text-white rounded-lg transition font-semibold flex items-center justify-center gap-2"
                    >
                      {authStatus === 'sending' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Magic Link'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {!authorKnowledge ? (
          // Setup Screen
          <div className="bg-white/10 backdrop-blur rounded-lg p-8 border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-6">Which book would you like to discuss?</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-purple-200 text-sm mb-2">Book Title *</label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="e.g., Thinking in Systems"
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-300 text-lg"
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm mb-2">Author *</label>
                <input
                  type="text"
                  value={bookAuthor}
                  onChange={(e) => setBookAuthor(e.target.value)}
                  placeholder="e.g., Donella Meadows"
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-300 text-lg"
                />
              </div>

            </div>

            <button
              onClick={loadAuthorKnowledge}
              disabled={isLoadingAuthor || !bookTitle.trim() || !bookAuthor.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-6 py-4 rounded-lg flex items-center justify-center gap-3 transition-all font-semibold text-lg mb-4"
            >
              {isLoadingAuthor ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Connecting you with {bookAuthor || 'the author'}...
                </>
              ) : (
                <>
                  <User className="w-6 h-6" />
                  Start Conversation with {bookAuthor || 'Author'}
                </>
              )}
            </button>

            {/* Import Option */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/10 text-purple-200">or</span>
              </div>
            </div>

            <button
              onClick={triggerFileUpload}
              className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white px-6 py-4 rounded-lg flex items-center justify-center gap-3 transition-all font-semibold text-lg border border-white/20"
            >
              <Upload className="w-6 h-6" />
              Load Previous Conversation
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={importConversation}
              className="hidden"
            />

            {isLoadingAuthor && (
              <div className="mt-8 space-y-3">
                <h3 className="text-white font-medium flex items-center gap-2">
                  <Search className="w-4 h-4 text-purple-300" />
                  Researching...
                </h3>
                <div className="space-y-2">
                  {researchStatus.map((status, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-purple-200 text-sm animate-pulse">
                      <div className="w-1 h-1 bg-purple-400 rounded-full" />
                      {status}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 bg-purple-500/20 border border-purple-500/40 rounded-lg p-4">
              <p className="text-purple-200 text-sm">
                <strong className="text-white">How it works:</strong> The AI will research the book and author, then embody the author's voice and personality. You'll have a natural conversation where they adapt to your needs - whether you want to explore ideas, understand concepts, apply frameworks, or question their thinking.
              </p>
            </div>
          </div>
        ) : (
          // Conversation Screen
          <div className="space-y-6">
            {/* Author Info Bar */}
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-500 to-blue-500 w-12 h-12 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{bookAuthor}</h2>
                  <p className="text-purple-200 text-sm">Author of {bookTitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Save Conversation Button */}
                {user && (
                  <button
                    onClick={saveConversation}
                    className="text-purple-200 hover:text-white transition-colors text-sm px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                )}

                {/* Conversation History Button */}
                {user && savedConversations.length > 0 && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-purple-200 hover:text-white transition-colors text-sm px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 flex items-center gap-2"
                  >
                    <History className="w-4 h-4" />
                    History
                  </button>
                )}

                {/* Export Dropdown */}
                <div className="relative group">
                  <button className="text-purple-200 hover:text-white transition-colors text-sm px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-white/20 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <button
                      onClick={() => exportConversation('markdown')}
                      className="w-full text-left px-4 py-3 text-white hover:bg-white/10 rounded-t-lg transition-colors text-sm"
                    >
                      📝 Export as Markdown
                    </button>
                    <button
                      onClick={() => exportConversation('txt')}
                      className="w-full text-left px-4 py-3 text-white hover:bg-white/10 transition-colors text-sm"
                    >
                      📄 Export as Text
                    </button>
                    <button
                      onClick={() => exportConversation('json')}
                      className="w-full text-left px-4 py-3 text-white hover:bg-white/10 rounded-b-lg transition-colors text-sm"
                    >
                      🔧 Export as JSON
                    </button>
                  </div>
                </div>
                <button
                  onClick={resetConversation}
                  className="text-purple-200 hover:text-white transition-colors text-sm px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20"
                >
                  New Book
                </button>
              </div>
            </div>

            {/* Conversation History Sidebar */}
            {showHistory && savedConversations.length > 0 && (
              <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Your Conversations ({savedConversations.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {savedConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="flex items-center justify-between bg-white/5 hover:bg-white/10 p-3 rounded-lg transition group"
                    >
                      <button
                        onClick={() => loadConversation(conv.id)}
                        className="flex-1 text-left"
                      >
                        <div className="text-white text-sm font-semibold">{conv.book_title}</div>
                        <div className="text-purple-300 text-xs">{conv.book_author}</div>
                        <div className="text-purple-400 text-xs mt-1">
                          {conv.message_count} messages • {new Date(conv.updated_at).toLocaleDateString()}
                        </div>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                        className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation */}
            <div className="bg-white/10 backdrop-blur rounded-lg p-6 border border-white/20 min-h-[500px] max-h-[500px] overflow-y-auto space-y-4">
              {conversation.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl px-4 py-3 rounded-lg ${msg.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/20 text-white prose prose-invert prose-sm'
                      }`}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/20 text-white px-4 py-3 rounded-lg flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{bookAuthor} is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={conversationEndRef} />
            </div>

            {/* Question Starters */}
            {!isLoading && questionStarters.length > 0 && conversation.length === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {questionStarters.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(question)}
                    className="text-left px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-purple-200 text-sm transition-all flex items-start gap-3 group"
                  >
                    <MessageSquare className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0 group-hover:text-purple-300" />
                    <span>{question}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
              <div className="flex gap-3">
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Ask ${bookAuthor} anything about the book, explore ideas together, or discuss how to apply concepts...`}
                  className="flex-1 px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-300 min-h-24 resize-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={!userInput.trim() || isLoading}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-6 rounded-lg flex items-center justify-center transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-purple-300 text-xs mt-2">
                Press Enter to send • Shift+Enter for new line • The author adapts to your needs naturally
              </p>
            </div>
          </div>
        )}
      </div>
    </div >
  );
};

export default BookCompanion;
