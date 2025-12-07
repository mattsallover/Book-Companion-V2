import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Sparkles, Send, Loader2, User, Download, Upload } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const BookCompanion = () => {
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [currentPage, setCurrentPage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authorKnowledge, setAuthorKnowledge] = useState(null);
  const [isLoadingAuthor, setIsLoadingAuthor] = useState(false);
  const conversationEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const loadAuthorKnowledge = async () => {
    if (!bookTitle.trim()) {
      alert('Please enter a book title first');
      return;
    }

    setIsLoadingAuthor(true);

    // Safety timeout - force reset after 60 seconds
    const timeout = setTimeout(() => {
      setIsLoadingAuthor(false);
      alert('Request timed out. Please check your connection and try again.');
    }, 60000);

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

      const data = await response.json();
      console.log('API Response:', data);

      setAuthorKnowledge(data.knowledge);

      // Start with author's greeting
      try {
        const greeting = await getAuthorGreeting(data.knowledge);
        setConversation([{ role: 'assistant', content: greeting }]);
      } catch (greetingError) {
        console.error('Greeting failed, using default:', greetingError);
        // Use default greeting if the API call fails
        setConversation([{
          role: 'assistant',
          content: `Hello! I'm ${bookAuthor}, and I'm delighted to discuss "${bookTitle}" with you. What would you like to explore together?`
        }]);
      }
      clearTimeout(timeout);
      setIsLoadingAuthor(false);
    } catch (error) {
      clearTimeout(timeout);
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

  const sendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const userMessage = { role: 'user', content: userInput };
    const newConversation = [...conversation, userMessage];
    setConversation(newConversation);
    setUserInput('');
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
          currentPage,
          authorKnowledge,
          conversation: newConversation,
        }),
      });

      const data = await response.json();
      const aiResponse = data.response || 'I apologize, I had trouble responding. Could you try again?';

      setConversation([...newConversation, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      console.error('API Error:', error);
      setConversation([...newConversation, {
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
    setCurrentPage('');
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
      if (currentPage) {
        content += `Current Location: ${currentPage}\n\n`;
      }
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
          author: bookAuthor,
          currentPage: currentPage
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
      if (currentPage) {
        content += `Current Location: ${currentPage}\n`;
      }
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
          setCurrentPage(data.book.currentPage || '');
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
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="w-10 h-10 text-purple-300" />
            <Sparkles className="w-6 h-6 text-yellow-300" />
            <h1 className="text-4xl font-bold text-white">Chat with the Author</h1>
          </div>
          <p className="text-purple-200">Have a personal conversation with the author of any book</p>
        </div>

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

              <div>
                <label className="block text-purple-200 text-sm mb-2">Current Page/Chapter (Optional)</label>
                <input
                  type="text"
                  value={currentPage}
                  onChange={(e) => setCurrentPage(e.target.value)}
                  placeholder="e.g., Chapter 3"
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-300"
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

            {/* Conversation */}
            <div className="bg-white/10 backdrop-blur rounded-lg p-6 border border-white/20 min-h-[500px] max-h-[500px] overflow-y-auto space-y-4">
              {conversation.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl px-4 py-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/20 text-white'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
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
    </div>
  );
};

export default BookCompanion;
