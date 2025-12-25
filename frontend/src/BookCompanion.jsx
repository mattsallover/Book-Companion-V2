import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronLeft, Plus, Send, MessageCircle } from 'lucide-react'

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000'

// Helper function to get auth token
const getToken = () => localStorage.getItem('token')

// Helper function to format timestamps
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (messageDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  } else if (now - date < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

// Generate avatar color based on name
const getAvatarColor = (name) => {
  const colors = [
    '#FF3B30', '#FF9500', '#FFCC00', '#34C759',
    '#00C7BE', '#32ADE6', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55'
  ]
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

// Strip markdown for previews
const stripMarkdown = (text) => {
  return text
    .replace(/[#*_~`]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n/g, ' ')
    .trim()
}

// Typing indicator component
const TypingIndicator = () => (
  <div className="flex mb-3 justify-start message-bubble">
    <div className="bg-ios-bubble-gray rounded-2xl px-4 py-3 flex items-center space-x-1">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-ios-gray rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
        <div className="w-2 h-2 bg-ios-gray rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }}></div>
        <div className="w-2 h-2 bg-ios-gray rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }}></div>
      </div>
    </div>
  </div>
)

function BookCompanion() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(true)
  const [authMode, setAuthMode] = useState('signin') // 'signin' | 'signup'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const [conversations, setConversations] = useState([])
  const [currentConversation, setCurrentConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [view, setView] = useState('list') // 'list' | 'chat'
  const [searchQuery, setSearchQuery] = useState('')
  const [swipedConvId, setSwipedConvId] = useState(null)

  const [showBookModal, setShowBookModal] = useState(false)
  const [bookTitle, setBookTitle] = useState('')
  const [bookAuthor, setBookAuthor] = useState('')
  const [researchStatus, setResearchStatus] = useState('')
  const [questionStarters, setQuestionStarters] = useState([])
  const [authorKnowledge, setAuthorKnowledge] = useState('')

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Check authentication on mount
  useEffect(() => {
    const token = getToken()
    if (token) {
      setIsAuthenticated(true)
      setShowAuthModal(false)
      loadConversations()
    }
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle 403 errors by signing out
  const handleAuthError = () => {
    localStorage.removeItem('token')
    setIsAuthenticated(false)
    setShowAuthModal(true)
    setConversations([])
    setCurrentConversation(null)
    setMessages([])
  }

  // Load conversations
  const loadConversations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/conversations`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      if (response.status === 403) {
        handleAuthError()
        return
      }
      if (response.ok) {
        const data = await response.json()
        setConversations(data)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    }
  }

  // Handle authentication (sign in or sign up)
  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthError('')

    if (!username.trim() || !password.trim()) {
      setAuthError('Please enter username and password')
      return
    }

    setAuthLoading(true)
    try {
      const endpoint = authMode === 'signin' ? '/api/auth/signin' : '/api/auth/signup'
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('token', data.token)
        setIsAuthenticated(true)
        setShowAuthModal(false)
        loadConversations()
      } else {
        setAuthError(data.error || 'Authentication failed')
      }
    } catch (error) {
      console.error('Error authenticating:', error)
      setAuthError('Connection error. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  // Start new conversation with book research
  const startNewConversation = async () => {
    if (!bookTitle.trim() || !bookAuthor.trim()) return

    setIsLoading(true)
    setResearchStatus('Researching author and book...')

    try {
      const response = await fetch(`${API_URL}/api/load-author`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ bookTitle, bookAuthor })
      })

      if (response.status === 403) {
        handleAuthError()
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data.trim()) {
              try {
                const parsed = JSON.parse(data)
                if (parsed.status) {
                  setResearchStatus(parsed.status)
                } else if (parsed.knowledge && parsed.questionStarters) {
                  setAuthorKnowledge(parsed.knowledge)
                  setQuestionStarters(parsed.questionStarters)

                  // Create conversation
                  const convResponse = await fetch(`${API_URL}/api/conversations`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({
                      bookTitle,
                      bookAuthor,
                      authorKnowledge: parsed.knowledge
                    })
                  })

                  if (convResponse.ok) {
                    const conversation = await convResponse.json()

                    // Generate greeting
                    const greetingResponse = await fetch(`${API_URL}/api/greeting`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                      },
                      body: JSON.stringify({
                        conversationId: conversation.id,
                        bookTitle,
                        bookAuthor,
                        authorKnowledge: parsed.knowledge
                      })
                    })

                    if (greetingResponse.ok) {
                      const greetingData = await greetingResponse.json()
                      setCurrentConversation(conversation)
                      setMessages([greetingData.message])
                      setView('chat')
                      setShowBookModal(false)
                      loadConversations()
                    }
                  }
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
      alert('Failed to start conversation. Please try again.')
    } finally {
      setIsLoading(false)
      setResearchStatus('')
    }
  }

  // Delete conversation
  const deleteConversation = async (convId) => {
    if (!confirm('Delete this conversation?')) return

    try {
      const response = await fetch(`${API_URL}/api/conversations/${convId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })

      if (response.status === 403) {
        handleAuthError()
        return
      }

      if (response.ok) {
        setConversations(conversations.filter(c => c.id !== convId))
        setSwipedConvId(null)
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }

  // Load conversation messages
  const loadConversation = async (conversation) => {
    try {
      const response = await fetch(`${API_URL}/api/conversations/${conversation.id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })

      if (response.status === 403) {
        handleAuthError()
        return
      }

      if (response.ok) {
        const data = await response.json()
        setCurrentConversation(conversation)
        setMessages(data.messages || [])
        setAuthorKnowledge(data.author_knowledge || '')
        setQuestionStarters([])
        setView('chat')
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
    }
  }

  // Send message
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !currentConversation) return

    const userMessage = { role: 'user', content: inputMessage.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          conversationId: currentConversation.id,
          messages: newMessages,
          bookTitle: currentConversation.book_title,
          bookAuthor: currentConversation.book_author,
          authorKnowledge
        })
      })

      if (response.status === 403) {
        handleAuthError()
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        assistantMessage += chunk
        setMessages([...newMessages, { role: 'assistant', content: assistantMessage }])
      }

      // Reload conversations to update preview
      loadConversations()
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Enter key to send
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Authentication Modal
  if (showAuthModal && !isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center modal-backdrop z-50">
        <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-6 pb-8 modal-content">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-ios-blue rounded-full flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-center mb-2">
            {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-ios-gray text-center mb-6 text-sm">
            {authMode === 'signin'
              ? 'Sign in to continue your conversations'
              : 'Sign up to start chatting with book authors'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-ios-bg rounded-xl text-base"
                autoFocus
                autoCapitalize="none"
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-ios-bg rounded-xl text-base"
              />
            </div>

            {authError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-600">{authError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading || !username.trim() || !password.trim()}
              className="w-full bg-ios-blue text-white py-3 rounded-xl font-medium text-base ios-button disabled:opacity-50"
            >
              {authLoading ? (authMode === 'signin' ? 'Signing in...' : 'Creating account...') : (authMode === 'signin' ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
                setAuthError('')
              }}
              className="text-ios-blue font-medium text-sm"
            >
              {authMode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Book Setup Modal
  if (showBookModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center modal-backdrop z-50">
        <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-6 pb-8 modal-content">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">New Conversation</h2>
            <button
              onClick={() => {
                setShowBookModal(false)
                setBookTitle('')
                setBookAuthor('')
                setResearchStatus('')
              }}
              className="text-ios-blue font-medium"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-ios-gray mb-2">Book Title</label>
              <input
                type="text"
                placeholder="Enter book title"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                className="w-full px-4 py-3 bg-ios-bg rounded-xl text-base"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-ios-gray mb-2">Author Name</label>
              <input
                type="text"
                placeholder="Enter author name"
                value={bookAuthor}
                onChange={(e) => setBookAuthor(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && startNewConversation()}
                className="w-full px-4 py-3 bg-ios-bg rounded-xl text-base"
              />
            </div>

            {researchStatus && (
              <div className="bg-ios-bg rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-ios-blue border-t-transparent"></div>
                  <p className="text-sm text-ios-gray">{researchStatus}</p>
                </div>
              </div>
            )}

            <button
              onClick={startNewConversation}
              disabled={isLoading || !bookTitle.trim() || !bookAuthor.trim()}
              className="w-full bg-ios-blue text-white py-3 rounded-xl font-medium text-base ios-button disabled:opacity-50"
            >
              {isLoading ? 'Starting...' : 'Start Conversation'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Conversation List View
  if (view === 'list') {
    // Filter conversations based on search query
    const filteredConversations = conversations.filter(conv =>
      conv.book_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.book_author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.last_message && conv.last_message.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    return (
      <div className="flex flex-col h-full bg-ios-bg">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between" style={{ paddingTop: 'max(0.75rem, var(--safe-area-inset-top))' }}>
          <h1 className="text-2xl font-bold">Messages</h1>
          <button
            onClick={() => setShowBookModal(true)}
            className="w-9 h-9 bg-ios-blue rounded-full flex items-center justify-center ios-button"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Search Bar */}
        {conversations.length > 0 && (
          <div className="px-4 py-3 bg-ios-bg">
            <input
              type="text"
              placeholder="Search conversations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white rounded-lg px-4 py-2 text-sm border-none focus:outline-none focus:ring-2 focus:ring-ios-blue"
            />
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto ios-scroll">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-8 text-center">
              <div className="w-20 h-20 bg-ios-light-gray rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-10 h-10 text-ios-gray" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
              <p className="text-ios-gray text-sm mb-6">
                Start a conversation with a book author to begin your journey
              </p>
              <button
                onClick={() => setShowBookModal(true)}
                className="bg-ios-blue text-white px-6 py-2 rounded-full font-medium ios-button"
              >
                Start Conversation
              </button>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-8 text-center">
              <p className="text-ios-gray">No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div key={conv.id} className="relative">
                <button
                  onClick={() => loadConversation(conv)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setSwipedConvId(swipedConvId === conv.id ? null : conv.id)
                  }}
                  className="w-full bg-white border-b border-gray-200 px-4 py-3 flex items-center space-x-3 hover:bg-gray-50 ios-button text-left"
                >
                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0"
                  style={{ backgroundColor: getAvatarColor(conv.book_author) }}
                >
                  {conv.book_author.charAt(0).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="font-semibold text-base truncate">{conv.book_author}</h3>
                    <span className="text-xs text-ios-gray ml-2 flex-shrink-0">
                      {formatTime(conv.updated_at || conv.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-ios-gray truncate mb-1">{conv.book_title}</p>
                  {conv.last_message && (
                    <p className="text-sm text-ios-gray truncate">
                      {stripMarkdown(conv.last_message)}
                    </p>
                  )}
                </div>
              </button>

              {/* Delete button (shows on long-press/right-click) */}
              {swipedConvId === conv.id && (
                <button
                  onClick={() => deleteConversation(conv.id)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-red-500 text-white px-4 py-2 rounded-lg font-medium text-sm ios-button"
                >
                  Delete
                </button>
              )}
            </div>
            ))
          )}
        </div>
      </div>
    )
  }

  // Chat View
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center space-x-3" style={{ paddingTop: 'max(0.5rem, var(--safe-area-inset-top))' }}>
        <button
          onClick={() => {
            setView('list')
            setCurrentConversation(null)
            setMessages([])
            setQuestionStarters([])
          }}
          className="ios-button p-1"
        >
          <ChevronLeft className="w-6 h-6 text-ios-blue" />
        </button>

        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
          style={{ backgroundColor: getAvatarColor(currentConversation?.book_author || 'A') }}
        >
          {currentConversation?.book_author.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{currentConversation?.book_author}</h2>
          <p className="text-xs text-ios-gray truncate">{currentConversation?.book_title}</p>
        </div>

        <button
          onClick={() => setShowBookModal(true)}
          className="ios-button p-1"
        >
          <Plus className="w-6 h-6 text-ios-blue" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto ios-scroll bg-ios-bg px-4 py-4">
        {messages.map((message, index) => {
          // Check if we should show timestamp (when sender changes or first message)
          const showTimestamp = index === 0 || messages[index - 1]?.role !== message.role
          const timestamp = message.created_at ? formatTime(message.created_at) : 'Just now'

          // Check if this is the last message in a group (show tail)
          const isLastInGroup = index === messages.length - 1 || messages[index + 1]?.role !== message.role
          const tailClass = isLastInGroup ? (message.role === 'user' ? 'message-tail-user' : 'message-tail-assistant') : ''

          return (
            <div key={index}>
              {/* Timestamp */}
              {showTimestamp && (
                <div className="flex justify-center mb-2">
                  <span className="text-xs text-ios-gray px-3 py-1 rounded-full bg-white/50">
                    {timestamp}
                  </span>
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`flex ${index > 0 && messages[index - 1]?.role === message.role ? 'mb-1' : 'mb-3'} message-bubble ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`relative max-w-[75%] rounded-2xl px-4 py-2 ${tailClass} ${
                    message.role === 'user'
                      ? 'bg-ios-blue text-white'
                      : 'bg-ios-bubble-gray text-black'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-[15px] leading-[20px] whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Typing Indicator */}
        {isLoading && <TypingIndicator />}

        {/* Question Starters */}
        {questionStarters.length > 0 && messages.length === 1 && (
          <div className="space-y-2 mt-4">
            {questionStarters.map((question, index) => (
              <button
                key={index}
                onClick={() => {
                  setInputMessage(question)
                  setQuestionStarters([])
                  inputRef.current?.focus()
                }}
                className="w-full bg-white border border-ios-light-gray rounded-xl px-4 py-3 text-left text-sm text-ios-gray hover:bg-ios-bg ios-button"
              >
                {question}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-2" style={{ paddingBottom: 'max(0.5rem, var(--safe-area-inset-bottom))' }}>
        <div className="flex items-end space-x-2">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Message"
            rows="1"
            className="flex-1 bg-ios-bg rounded-full px-4 py-2 text-[15px] resize-none max-h-32"
            style={{ minHeight: '36px' }}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="w-9 h-9 bg-ios-blue rounded-full flex items-center justify-center ios-button disabled:opacity-50 flex-shrink-0"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default BookCompanion
