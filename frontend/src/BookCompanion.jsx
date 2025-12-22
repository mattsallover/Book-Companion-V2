import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Sparkles, Send, Loader2, User, Download, Upload, Search, MessageSquare, LogOut, Mail, Save, History, Edit, SquarePen, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

const BookCompanion = () => {
  // Authentication state
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [authStatus, setAuthStatus] = useState('idle'); // 'idle' | 'logging' | 'registering'

  // Conversation state
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [conversation, setConversation] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [savedConversations, setSavedConversations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showConversationList, setShowConversationList] = useState(false);

  // UI state
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authorKnowledge, setAuthorKnowledge] = useState(null);
  const [isLoadingAuthor, setIsLoadingAuthor] = useState(false);
  const [researchStatus, setResearchStatus] = useState([]);
  const [questionStarters, setQuestionStarters] = useState([]);

  const conversationEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Utility function to format timestamps like iMessage
  const formatTimestamp = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Check if today
    if (messageDate.getTime() === today.getTime()) {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }
    
    // Check if yesterday
    if (messageDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }
    
    // Check if within this week (last 7 days)
    const daysDiff = Math.floor((today - messageDate) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return dayNames[date.getDay()];
    }
    
    // Older than a week - show date
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    const currentYear = now.getFullYear();
    
    if (year === currentYear) {
      return `${month}/${day}`;
    } else {
      return `${month}/${day}/${year}`;
    }
  };

  // Generate consistent avatar color based on author name
  const getAvatarColor = (authorName) => {
    if (!authorName) return '#007AFF';
    
    // Generate a consistent color based on the author name
    let hash = 0;
    for (let i = 0; i < authorName.length; i++) {
      hash = authorName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // iOS-style colors
    const colors = [
      '#007AFF', // Blue
      '#34C759', // Green
      '#FF9500', // Orange
      '#FF3B30', // Red
      '#AF52DE', // Purple
      '#5AC8FA', // Teal
      '#FF2D55', // Pink
      '#5856D6', // Indigo
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Get author initial for avatar
  const getAuthorInitial = (authorName) => {
    if (!authorName) return '?';
    return authorName.charAt(0).toUpperCase();
  };

  // Truncate message preview
  const truncateMessage = (message, maxLength = 50) => {
    if (!message) return '';
    // Remove markdown formatting for preview
    const plainText = message.replace(/[#*_`\[\]]/g, '').replace(/\n/g, ' ');
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength).trim() + '...';
  };

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
    const magicLinkToken = urlParams.get('token');
    if (magicLinkToken) {
      verifyMagicLink(magicLinkToken);
    }
  }, []);

  // Load conversations when user logs in
  useEffect(() => {
    if (user && authToken) {
      fetchConversations();
    } else {
      // Clear conversations if user logs out
      setSavedConversations([]);
      setConversationId(null);
      setShowConversationList(false);
    }
  }, [user, authToken]);

  // Show conversation list when conversations are loaded and user has them
  useEffect(() => {
    if (user && savedConversations.length > 0 && !authorKnowledge && !conversationId) {
      setShowConversationList(true);
    }
  }, [savedConversations, user, authorKnowledge, conversationId]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Authentication functions
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthStatus('logging');

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem('authToken', data.token);
      setAuthToken(data.token);
      setUser(data.user);
      setShowAuthModal(false);
      setAuthStatus('idle');
      setUsername('');
      setPassword('');
    } catch (error) {
      console.error('Error logging in:', error);
      alert(error.message || 'Login failed. Please try again.');
      setAuthStatus('idle');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthStatus('registering');

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email: authEmail, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const data = await response.json();
      localStorage.setItem('authToken', data.token);
      setAuthToken(data.token);
      setUser(data.user);
      setShowAuthModal(false);
      setAuthStatus('idle');
      setUsername('');
      setPassword('');
      setAuthEmail('');
    } catch (error) {
      console.error('Error registering:', error);
      alert(error.message || 'Registration failed. Please try again.');
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

  // Note: Conversations are now auto-saved to the database as messages are sent
  // The manual save button is kept for explicit saves, but auto-save happens in the background

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
      setShowConversationList(false);
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

    // Reset conversation ID when starting a new book
    setConversationId(null);
    setConversation([]);
    
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
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          bookTitle,
          bookAuthor,
          authorKnowledge,
          conversation: initialConversation,
          conversationId, // Send existing conversationId if we have one
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
              // Handle conversationId from backend (for auto-save)
              if (data.conversationId) {
                setConversationId(data.conversationId);
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
    setConversationId(null); // Clear conversation ID when resetting
    setShowConversationList(false);
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
    <div className="h-screen w-screen flex flex-col bg-[#F2F2F7] overflow-hidden safe-area-top safe-area-bottom">
      {/* iOS-style Header */}
      <div className="bg-white border-b border-[#C7C7CC] px-4 py-3 flex items-center justify-between safe-area-top">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-[#007AFF]" />
          <h1 className="text-lg font-semibold text-black">Book Companion</h1>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="text-[#8E8E93] text-sm hidden sm:inline">{user.username || user.email}</span>
              <button
                onClick={logout}
                className="text-[#007AFF] text-sm px-3 py-1.5 rounded-lg active:bg-[#E9E9EB] transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-[#007AFF] text-sm px-3 py-1.5 rounded-lg active:bg-[#E9E9EB] transition-colors"
            >
              <Mail className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* iOS-style Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-6 safe-area-bottom">
            <h2 className="text-2xl font-semibold text-black mb-4">Sign in</h2>

            {showRegister ? (
                <form onSubmit={handleRegister}>
                  <div className="space-y-4 mb-6">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      required
                      className="ios-input w-full"
                    />
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="Email"
                      required
                      className="ios-input w-full"
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      className="ios-input w-full"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setShowRegister(false); setAuthEmail(''); setUsername(''); setPassword(''); setAuthStatus('idle'); }}
                      className="flex-1 px-4 py-3 bg-[#E9E9EB] text-black rounded-lg active:bg-[#D1D1D6] transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={authStatus === 'registering'}
                      className="flex-1 ios-button flex items-center justify-center gap-2"
                    >
                      {authStatus === 'registering' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Sign Up'
                      )}
                    </button>
                  </div>
                  <p className="text-center text-[#8E8E93] text-sm mt-4">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setShowRegister(false)}
                      className="text-[#007AFF]"
                    >
                      Sign In
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleLogin}>
                  <div className="space-y-4 mb-6">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username or Email"
                      required
                      className="ios-input w-full"
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      className="ios-input w-full"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setShowAuthModal(false); setAuthEmail(''); setUsername(''); setPassword(''); setAuthStatus('idle'); }}
                      className="flex-1 px-4 py-3 bg-[#E9E9EB] text-black rounded-lg active:bg-[#D1D1D6] transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={authStatus === 'logging'}
                      className="flex-1 ios-button flex items-center justify-center gap-2"
                    >
                      {authStatus === 'logging' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </button>
                  </div>
                  <p className="text-center text-[#8E8E93] text-sm mt-4">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setShowRegister(true)}
                      className="text-[#007AFF]"
                    >
                      Sign Up
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>
        )}

        {/* iMessage Conversation List View */}
        {showConversationList && user && savedConversations.length > 0 ? (
          <div className="flex flex-col flex-1 overflow-hidden bg-white">
            {/* iMessage Navigation Bar */}
            <div className="bg-white border-b border-[#C7C7CC] px-4 py-3 flex items-center justify-between safe-area-top">
              <button
                onClick={() => setShowConversationList(false)}
                className="text-[#007AFF] text-base font-normal"
              >
                Edit
              </button>
              <h1 className="text-lg font-semibold text-black">Messages</h1>
              <button
                onClick={() => {
                  setShowConversationList(false);
                  resetConversation();
                }}
                className="text-[#007AFF]"
              >
                <SquarePen className="w-6 h-6" />
              </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {savedConversations.map((conv, idx) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    loadConversation(conv.id);
                    setShowConversationList(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#E9E9EB] transition-colors border-b border-[#C7C7CC] border-opacity-50"
                >
                  {/* Avatar */}
                  <div
                    className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-white text-2xl font-semibold flex-shrink-0"
                    style={{ backgroundColor: getAvatarColor(conv.book_author) }}
                  >
                    {getAuthorInitial(conv.book_author)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[17px] font-semibold text-black truncate">
                        {conv.book_author}
                      </span>
                      <span className="text-[15px] text-[#8E8E93] flex-shrink-0 ml-2">
                        {formatTimestamp(conv.last_message_time || conv.updated_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[15px] text-[#8E8E93] truncate">
                        {conv.last_message_content ? truncateMessage(conv.last_message_content) : 'No messages yet'}
                      </span>
                      <ChevronRight className="w-5 h-5 text-[#C7C7CC] flex-shrink-0" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : !authorKnowledge ? (
          // Setup Screen - iOS style
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-semibold text-black mb-6">Which book would you like to discuss?</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[#8E8E93] text-sm mb-2 font-medium">Book Title *</label>
                  <input
                    type="text"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    placeholder="e.g., Thinking in Systems"
                    className="ios-input w-full text-lg"
                  />
                </div>

                <div>
                  <label className="block text-[#8E8E93] text-sm mb-2 font-medium">Author *</label>
                  <input
                    type="text"
                    value={bookAuthor}
                    onChange={(e) => setBookAuthor(e.target.value)}
                    placeholder="e.g., Donella Meadows"
                    className="ios-input w-full text-lg"
                  />
                </div>
              </div>

              <button
                onClick={loadAuthorKnowledge}
                disabled={isLoadingAuthor || !bookTitle.trim() || !bookAuthor.trim()}
                className="w-full ios-button flex items-center justify-center gap-3 mb-4"
              >
                {isLoadingAuthor ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting you with {bookAuthor || 'the author'}...
                  </>
                ) : (
                  <>
                    <User className="w-5 h-5" />
                    Start Conversation with {bookAuthor || 'Author'}
                  </>
                )}
              </button>

              {isLoadingAuthor && (
                <div className="mt-8 space-y-3">
                  <h3 className="text-black font-medium flex items-center gap-2">
                    <Search className="w-4 h-4 text-[#007AFF]" />
                    Researching...
                  </h3>
                  <div className="space-y-2">
                    {researchStatus.map((status, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[#8E8E93] text-sm">
                        <div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full" />
                        {status}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 bg-[#E9E9EB] rounded-2xl p-4">
                <p className="text-[#8E8E93] text-sm">
                  <strong className="text-black">How it works:</strong> The AI will research the book and author, then embody the author's voice and personality. You'll have a natural conversation where they adapt to your needs.
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Conversation Screen - iMessage style
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Author Header - iOS style */}
            <div className="bg-white border-b border-[#C7C7CC] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#007AFF] flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-black">{bookAuthor}</h2>
                  <p className="text-[#8E8E93] text-sm">Author of {bookTitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {user && savedConversations.length > 0 && (
                  <button
                    onClick={() => setShowConversationList(true)}
                    className="text-[#007AFF] text-sm px-3 py-1.5 rounded-lg active:bg-[#E9E9EB] transition-colors"
                  >
                    <History className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => {
                    resetConversation();
                    setShowConversationList(false);
                  }}
                  className="text-[#007AFF] text-sm px-3 py-1.5 rounded-lg active:bg-[#E9E9EB] transition-colors"
                >
                  New
                </button>
              </div>
            </div>

            {/* Conversation History Modal - iOS style */}
            {showHistory && savedConversations.length > 0 && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[80vh] flex flex-col safe-area-bottom">
                  <div className="px-6 py-4 border-b border-[#C7C7CC]">
                    <h3 className="text-xl font-semibold text-black">Your Conversations</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-2">
                    {savedConversations.map((conv) => (
                      <div
                        key={conv.id}
                        className="flex items-center justify-between p-4 rounded-2xl active:bg-[#E9E9EB] transition-colors group"
                      >
                        <button
                          onClick={() => { loadConversation(conv.id); setShowHistory(false); }}
                          className="flex-1 text-left"
                        >
                          <div className="text-black text-base font-semibold">{conv.book_title}</div>
                          <div className="text-[#8E8E93] text-sm">{conv.book_author}</div>
                          <div className="text-[#8E8E93] text-xs mt-1">
                            {conv.message_count} messages • {new Date(conv.updated_at).toLocaleDateString()}
                          </div>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                          className="text-[#FF3B30] opacity-0 group-hover:opacity-100 transition px-3 py-2"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-4 border-t border-[#C7C7CC]">
                    <button
                      onClick={() => setShowHistory(false)}
                      className="w-full ios-button"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Conversation Messages - iMessage style */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {conversation.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                >
                  <div
                    className={`imessage-bubble ${msg.role === 'user' ? 'imessage-bubble-user' : 'imessage-bubble-assistant'}`}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="imessage-bubble imessage-bubble-assistant flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#8E8E93]" />
                    <span className="text-[#8E8E93]">{bookAuthor} is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={conversationEndRef} />
            </div>

            {/* Question Starters */}
            {!isLoading && questionStarters.length > 0 && conversation.length === 1 && (
              <div className="px-4 pb-2">
                <div className="grid grid-cols-1 gap-2">
                  {questionStarters.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(question)}
                      className="text-left px-4 py-3 bg-white border border-[#C7C7CC] rounded-2xl text-black text-sm active:bg-[#E9E9EB] transition-all flex items-start gap-3"
                    >
                      <MessageSquare className="w-4 h-4 text-[#007AFF] mt-0.5 flex-shrink-0" />
                      <span>{question}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar - Fixed at bottom like iMessage */}
            <div className="bg-white border-t border-[#C7C7CC] px-4 py-3 safe-area-bottom">
              <div className="flex gap-2 items-end">
                <div className="flex-1 bg-[#E9E9EB] rounded-3xl px-4 py-2.5 flex items-center min-h-[44px]">
                  <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`Message ${bookAuthor}...`}
                    className="flex-1 bg-transparent border-none outline-none resize-none text-black placeholder-[#8E8E93] text-[17px] leading-5 max-h-32 overflow-y-auto"
                    rows={1}
                    style={{ height: 'auto' }}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!userInput.trim() || isLoading}
                  className="w-10 h-10 rounded-full bg-[#007AFF] disabled:bg-[#C7C7CC] flex items-center justify-center active:opacity-70 transition-all flex-shrink-0"
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default BookCompanion;
