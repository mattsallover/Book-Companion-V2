# Book Companion - Product Requirements Document

## 1. Product Overview

### 1.1 Vision Statement
Book Companion is an AI-powered web application that enables readers to have immersive, personalized conversations with book authors. By leveraging Google's Gemini AI with web search capabilities, the app creates an authentic author persona that adapts to each reader's needs—whether they want to explore ideas, understand concepts, apply principles, or challenge arguments.

### 1.2 Product Mission
To transform passive reading into active dialogue, helping readers go deeper with books through natural, contextual conversations that feel like talking directly with the author.

### 1.3 Core Value Proposition
- **Authentic Author Voice**: AI deeply embodies the author's distinctive writing style, tone, speech patterns, and personality—avoiding generic AI responses
- **Intelligent Spelling Correction**: Automatically detects and corrects book/author name typos using web search
- **Adaptive Learning**: Author persona adapts to reader needs (exploration, learning, application, questioning)
- **Seamless Experience**: Mobile-first, iMessage-inspired interface that feels native and intuitive
- **Persistent Conversations**: Cloud-synced conversations accessible across all devices
- **Simple Authentication**: Quick username/password authentication

---

## 2. Problem Statement

### 2.1 Problems We Solve

**For Readers:**
- Difficulty engaging deeply with complex book concepts after reading
- Lack of opportunity to ask questions or explore ideas with authors
- Need for personalized guidance based on their specific learning goals
- Desire to apply book principles to their own context
- Frustration with one-size-fits-all book discussions

**For Book Learners:**
- No way to continue the conversation after finishing a book
- Limited ability to reference specific chapters or concepts in context
- Difficulty connecting book ideas to real-world applications
- Need for adaptive explanations based on their current understanding

### 2.2 Market Opportunity
- Growing market for AI-powered learning tools
- Increasing demand for personalized educational experiences
- Mobile-first consumption of content
- Shift toward interactive vs. passive learning

---

## 3. Target Users

### 3.1 Primary Personas

**1. The Deep Learner (Primary)**
- **Demographics**: Ages 25-45, professionals, students, lifelong learners
- **Goals**: Understand complex concepts, apply ideas to their work/life, explore implications
- **Pain Points**: Books are static, can't ask follow-up questions, need personalized explanations
- **Usage Pattern**: Regular use (2-3 times per week), longer conversations (10-20 messages), multiple books

**2. The Curious Explorer (Secondary)**
- **Demographics**: Ages 18-35, intellectually curious, diverse interests
- **Goals**: Explore ideas, challenge concepts, understand author's thinking process
- **Pain Points**: Want to engage with ideas but lack discussion partners
- **Usage Pattern**: Occasional use (1-2 times per month), exploratory conversations

**3. The Practical Applier (Secondary)**
- **Demographics**: Ages 30-50, professionals seeking actionable insights
- **Goals**: Apply book principles to specific situations, get practical guidance
- **Pain Points**: Books are theoretical, need context-specific advice
- **Usage Pattern**: Focused use around specific books, goal-oriented conversations

### 3.2 User Characteristics
- Comfortable with technology and AI tools
- Value learning and personal growth
- Prefer mobile-first experiences
- Appreciate well-designed, intuitive interfaces
- Want persistent, accessible conversations

---

## 4. Core Features

### 4.1 Authentication & User Management

**Username/Password Authentication**
- **Description**: Traditional authentication with username and password
- **User Flow**:
  1. User chooses "Sign Up" or "Sign In"
  2. Enters username and password
  3. System validates credentials
  4. JWT token stored in localStorage for session persistence
- **Requirements**:
  - Username validation (minimum 3 characters, unique, case-insensitive)
  - Password validation (minimum 6 characters)
  - Secure password hashing (bcrypt, 10 salt rounds)
  - Automatic user creation on sign up
  - Clear error messages for invalid credentials
- **Security**:
  - Password hashing with bcrypt
  - JWT tokens with 30-day expiration
  - HTTPS-only in production
  - Token verification on protected routes
  - Case-insensitive username matching

**User Profile**
- Username-based identification
- Automatic profile creation
- Conversation history tied to user account

### 4.2 Book Setup & Author Research

**Book Information Input**
- **Fields**: Book title, Author name
- **Validation**: Both fields required, basic sanitization
- **UI**: Clean input form with clear labels

**Intelligent Author Research**
- **Process**:
  1. User submits book title and author (typos automatically corrected)
  2. System uses Gemini 2.5 Pro with Google Search tool
  3. Identifies correct canonical book title and author name
  4. Researches:
     - Main arguments, frameworks, and key ideas
     - Author's background, expertise, and philosophy
     - **Author's Distinctive Voice** (critical for authenticity):
       * Characteristic sentence patterns and rhythms
       * Use of metaphors, analogies, stories, and examples
       * Level of formality (academic, conversational, provocative, etc.)
       * Tone (warm, direct, challenging, humorous, serious, etc.)
       * Typical conversational patterns and speech habits
       * How they handle disagreement or criticism
       * Signature phrases or rhetorical devices
     - 3-4 direct quotes or passages that exemplify their writing style
     - The book's impact and reception
  5. Generates 3 thought-provoking question starters
- **Output Format**: JSON with `correctTitle`, `correctAuthor`, `knowledge` (text), and `questionStarters` (array)
- **Spelling Correction**: Frontend automatically uses corrected names for conversation
- **Streaming**: Real-time status updates during research
- **Error Handling**: Graceful fallback if research fails

**Author Greeting Generation**
- Personalized greeting from author persona
- Authentic tone matching author's distinctive voice (not generic AI language)
- 2-3 sentences, invites engagement
- Explicitly avoids generic AI pleasantries unless that's the author's style

### 4.3 Author Persona & Conversation

**Author Embodiment**
- **Voice Authenticity Focus**: System deeply emphasizes matching the author's actual writing style, NOT typical AI assistant patterns
- **System Instruction**: Comprehensive prompt that includes:
  - **Critical Voice Matching**:
    * Characteristic sentence structure and rhythm
    * Natural speech patterns and vocabulary
    * Level of formality, directness, and nuance
    * Humor style (or lack thereof)
    * Opinion expression with author's certainty level
    * Stories and examples in author's style
  - **AI Pattern Avoidance**:
    * Explicitly forbids "Great question!" and generic openings
    * Avoids overly balanced/diplomatic responses when author has strong opinions
    * No corporate speak or motivational clichés
    * No academic hedging unless that's the author's style
    * No artificial structure patterns
  - **Authentic Response Behavior**:
    * Matches author's typical response length and depth
    * Uses author's natural metaphors and analogies
    * Expresses opinions with author's level of provocation
    * Handles disagreement the way the author would
  - Book expertise (chapters, examples, frameworks)
  - Character consistency (never breaks illusion, never mentions being AI)
  - Markdown formatting for responses in author's style
- **Adaptive Behavior** (responds naturally, not artificially categorized):
  - Exploration: Asks thoughtful questions, draws connections
  - Learning: Explains clearly with book examples
  - Application: Provides practical, implementation-focused guidance
  - Questioning: Engages intellectually, defends positions, acknowledges limitations
- **Knowledge Base**: Uses researched author knowledge including detailed voice characteristics

**Conversation Features**
- **Streaming Responses**: Real-time token streaming for natural feel
- **Markdown Support**: Formatted responses (bold, italic, lists, code, quotes)
- **Context Awareness**: Maintains conversation history
- **Auto-Save**: Messages automatically saved to database
- **Error Recovery**: Graceful handling of API failures

### 4.4 Conversation Management

**Conversation List (iMessage-Style)**
- **Display**:
  - Author name as "contact" name
  - Book title as subtitle
  - Last message preview (truncated, markdown stripped)
  - Timestamp (Today, Yesterday, day name, or date)
  - Author avatar (circular, colored, with initial)
- **Navigation**:
  - Tap conversation to open
  - Swipe gestures (future)
  - Edit mode (future)
- **Ordering**: Most recently updated first
- **Empty State**: Clear message when no conversations exist

**Individual Conversation View**
- **Header**: Author avatar, name, book title
- **Actions**: History button, New conversation button
- **Messages**: 
  - User messages (right-aligned, blue bubbles)
  - Assistant messages (left-aligned, gray bubbles)
  - Markdown rendering
  - Timestamps
- **Input**: 
  - Text area at bottom
  - Send button
  - Loading states
- **Auto-Scroll**: Automatically scrolls to latest message

**Conversation Persistence**
- **Auto-Save**: Every message automatically saved
- **Database Storage**: PostgreSQL with proper relationships
- **Cross-Device Sync**: Access from any device with same account
- **Conversation Metadata**: Title, author, knowledge, timestamps

### 4.5 UI/UX Design

**Design System: iOS iMessage-Inspired**
- **Color Palette**:
  - Primary: `#007AFF` (iOS Blue)
  - Background: `#F2F2F7` (iOS Light Gray)
  - Text: `#000000` (Black) / `#8E8E93` (Gray)
  - Bubbles: `#007AFF` (User) / `#E9E9EB` (Assistant)
  - System Colors: Red, Orange, Green, Purple, Teal, Pink, Indigo
- **Typography**: 
  - System font stack (San Francisco on iOS, system default elsewhere)
  - Responsive sizing
- **Components**:
  - iOS-style buttons with active states
  - Rounded corners (consistent radius)
  - Proper spacing and padding
  - Safe area support for notched devices
- **Animations**: 
  - Smooth transitions
  - Slide-up for modals
  - Fade-in for content
- **Responsive Design**:
  - Mobile-first approach
  - Desktop optimization
  - Tablet support

**Accessibility**
- Semantic HTML
- ARIA labels where needed
- Keyboard navigation
- Screen reader support
- High contrast support

### 4.6 Data Management

**Database Schema**
- **Users**: id, username (unique, case-insensitive), password_hash, created_at
- **Conversations**: id, user_id, book_title, book_author, author_knowledge, created_at, updated_at
- **Messages**: id, conversation_id, role, content, created_at

**Data Operations**
- Create conversation
- Save messages (auto-save)
- Load conversation history
- Load conversation list with last message preview
- Delete conversations
- Update conversation timestamps

**Performance**
- Indexed database queries
- Efficient conversation loading
- Optimized message queries
- Connection pooling

---

## 5. User Flows

### 5.1 First-Time User Flow

1. **Landing/Sign Up**
   - User arrives at app
   - Sees authentication modal (required before use)
   - Chooses "Sign Up"
   - Enters username and password
   - Clicks "Sign Up"
   - Account created, JWT token stored in localStorage

2. **Book Setup**
   - Sees empty conversation list or setup screen
   - Enters book title and author
   - Clicks "Start Conversation"
   - Watches research progress (streaming status updates)
   - System auto-corrects any typos in book/author names
   - Sees author greeting

3. **First Conversation**
   - Sees question starters
   - Selects one or types own question
   - Receives streaming response in author's authentic voice
   - Continues conversation
   - Messages auto-saved

4. **Returning to App**
   - Logs in (if needed)
   - Sees conversation list
   - Taps conversation to continue
   - All previous messages loaded

### 5.2 Returning User Flow

1. **Sign In**
   - Opens app
   - If token valid, auto-logged in
   - If token expired, sees sign-in modal
   - Enters username and password
   - Clicks "Sign In"

2. **Conversation List**
   - Sees all previous conversations
   - Author names, book titles, last messages visible
   - Timestamps show recency

3. **Continue Conversation**
   - Taps conversation
   - Full history loads
   - Continues where left off

4. **New Conversation**
   - Clicks "New" button
   - Enters new book
   - Starts fresh conversation

### 5.3 Multi-Device Flow

1. **Device A**: User starts conversation
2. **Device B**: User logs in with same email
3. **Device B**: Sees all conversations, including new one
4. **Device B**: Can continue conversation seamlessly
5. **Sync**: Real-time (on next load) across devices

---

## 6. Technical Architecture

### 6.1 Technology Stack

**Frontend**
- **Framework**: React 18+
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Markdown**: ReactMarkdown + remark-gfm
- **Icons**: Lucide React
- **State Management**: React Hooks (useState, useEffect)
- **HTTP Client**: Fetch API

**Backend**
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM/Query**: pg (node-postgres)
- **Authentication**: JWT (jsonwebtoken) + bcrypt (password hashing)
- **AI**: Google Generative AI (Gemini 2.5 Pro with Google Search)

**Infrastructure**
- **Hosting**: Railway
- **Database**: Railway PostgreSQL
- **Environment**: Production (NODE_ENV=production)
- **Deployment**: Docker container
- **CI/CD**: GitHub integration (auto-deploy)

### 6.2 System Architecture

```
┌─────────────┐
│   Browser   │
│  (React)    │
└──────┬──────┘
       │ HTTPS
       │
┌──────▼──────────┐
│  Railway        │
│  (Express API)  │
└──────┬──────────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌─▼──────┐
│PostgreSQL│ │Gemini API│
│Database  │ │(Google)  │
└─────────┘ └──────────┘
```

### 6.3 API Endpoints

**Authentication**
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/signin` - Authenticate user and return JWT
- `POST /api/auth/logout` - Logout (client-side token removal)

**Conversations**
- `GET /api/conversations` - List all user conversations
- `GET /api/conversations/:id` - Get specific conversation
- `POST /api/conversations` - Create new conversation
- `DELETE /api/conversations/:id` - Delete conversation

**AI/Author**
- `POST /api/load-author` - Research author and book (streaming)
- `POST /api/greeting` - Generate author greeting
- `POST /api/chat` - Chat with author (streaming)

**System**
- `GET /health` - Health check

### 6.4 Data Flow

**Message Sending Flow**
1. User types message, clicks Send
2. Frontend sends POST to `/api/chat` with conversation history
3. Backend:
   - Validates request
   - Gets user from JWT (if authenticated)
   - Initializes Gemini model with system instruction
   - Maps conversation history to Gemini format
   - Starts chat with history
   - Sets streaming headers
   - Calls `sendMessageStream`
   - Streams response chunks to client
   - Auto-saves messages to database
4. Frontend:
   - Receives streaming chunks
   - Updates UI in real-time
   - Saves to local state
   - Auto-scrolls to bottom

**Author Research Flow**
1. User enters book title and author
2. Frontend sends POST to `/api/load-author`
3. Backend:
   - Uses Gemini with Google Search tool
   - Streams research status updates
   - Returns JSON with knowledge and question starters
4. Frontend:
   - Displays status updates
   - Stores knowledge
   - Shows question starters
   - Generates greeting

### 6.5 Security Considerations

- **Authentication**: JWT tokens with expiration
- **Authorization**: Protected routes require valid token
- **Input Validation**: Sanitize user inputs
- **SQL Injection**: Parameterized queries
- **XSS Prevention**: React's built-in escaping
- **CORS**: Configured for production domain
- **HTTPS**: Enforced in production
- **Secrets**: Environment variables, never in code
- **Rate Limiting**: (Future consideration)

---

## 7. Design Requirements

### 7.1 Visual Design

**Layout**
- Full-screen mobile-first design
- Fixed header with app name and user actions
- Conversation list: Full-screen with navigation bar
- Chat view: Messages area + fixed input bar
- Safe area support for notched devices

**Components**
- **Conversation List Item**:
  - Avatar (circular, colored, initial)
  - Author name (bold, primary text)
  - Book title (secondary text, smaller)
  - Last message preview (truncated, gray)
  - Timestamp (right-aligned, gray)
  - Chevron icon (right side)
  - Separator line between items
- **Message Bubbles**:
  - User: Right-aligned, blue background, white text
  - Assistant: Left-aligned, gray background, black text
  - Rounded corners
  - Proper padding
  - Markdown rendering inside
- **Input Bar**:
  - Fixed at bottom
  - Text area (auto-expanding)
  - Send button (blue, disabled when empty)
  - Loading state

**States**
- Loading: Spinner, disabled inputs
- Error: Error message display
- Empty: Helpful empty states
- Success: Smooth transitions

### 7.2 Interaction Design

**Gestures**
- Tap to select
- Scroll to view history
- Swipe (future: delete conversation)

**Feedback**
- Button press states (active background)
- Loading indicators
- Success confirmations
- Error messages

**Transitions**
- Smooth page transitions
- Modal slide-up
- Message fade-in
- List item animations

### 7.3 Responsive Breakpoints

- **Mobile**: < 640px (primary)
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

---

## 8. Success Metrics

### 8.1 User Engagement Metrics

- **Daily Active Users (DAU)**: Users who use app daily
- **Weekly Active Users (WAU)**: Users who use app weekly
- **Monthly Active Users (MAU)**: Users who use app monthly
- **Session Duration**: Average time per session
- **Messages per Conversation**: Average messages exchanged
- **Conversations per User**: Average conversations started

### 8.2 Feature Adoption Metrics

- **Magic Link Success Rate**: % of magic links clicked
- **Book Setup Completion**: % who complete book setup
- **First Message Sent**: % who send first message
- **Conversation Persistence**: % who return to conversations
- **Multi-Device Usage**: % using on multiple devices

### 8.3 Quality Metrics

- **Error Rate**: % of requests that fail
- **Streaming Success Rate**: % of successful streams
- **API Response Time**: Average response time
- **Database Query Performance**: Query execution time
- **Uptime**: System availability percentage

### 8.4 Business Metrics (Future)

- **User Retention**: Day 1, Day 7, Day 30 retention
- **Viral Coefficient**: Users inviting others
- **Conversion Rate**: Free to paid (if monetized)

---

## 9. Non-Functional Requirements

### 9.1 Performance

- **Page Load**: < 2 seconds initial load
- **API Response**: < 500ms for non-streaming endpoints
- **Streaming Latency**: < 1 second to first token
- **Database Queries**: < 100ms for simple queries
- **Mobile Performance**: 60fps animations

### 9.2 Scalability

- **Concurrent Users**: Support 100+ concurrent users
- **Database**: Handle 10,000+ conversations
- **Storage**: Efficient message storage
- **API Limits**: Respect Google API rate limits

### 9.3 Reliability

- **Uptime**: 99%+ availability
- **Error Handling**: Graceful degradation
- **Data Persistence**: No data loss
- **Backup**: Regular database backups (Railway)

### 9.4 Usability

- **Accessibility**: WCAG 2.1 AA compliance
- **Mobile-First**: Optimized for mobile devices
- **Intuitive**: No training required
- **Fast**: Perceived performance is key

---

## 10. Future Roadmap

### 10.1 Phase 2 Features (Near-term)

**Enhanced Conversation Features**
- Conversation search/filter
- Export conversations (Markdown, PDF, JSON)
- Share conversations (read-only links)
- Conversation tags/categories
- Favorite conversations

**UI/UX Improvements**
- Swipe to delete conversations
- Pull-to-refresh
- Dark mode
- Custom themes
- Improved empty states

**Author Persona Enhancements**
- Multiple conversation styles (formal, casual, etc.)
- Custom system instructions
- Author voice tuning
- Conversation templates

### 10.2 Phase 3 Features (Medium-term)

**Social Features**
- Share conversations publicly
- Community book discussions
- Author Q&A sessions
- Conversation recommendations

**Advanced AI Features**
- **Multi-Author Conversations** ⭐ (High Priority)
  - Have conversations with 2-4 authors simultaneously
  - Authors interact with each other and with you
  - Multiple interaction modes:
    * **Round Robin**: Each author responds in sequence to your questions
    * **Free Discussion**: Authors respond naturally when they have something to add
    * **Debate Mode**: Authors take opposing positions on controversial topics
  - Visual differentiation (unique colors, avatars, name tags for each author)
  - Smart routing (only relevant authors respond to save cost)
  - Use cases:
    * Synthesis: See how different frameworks complement each other
    * Tension resolution: Explore contradictions between books
    * Debate: Watch authors respectfully challenge each other's ideas
    * Learning: Get multiple expert perspectives on complex questions
  - Example combinations:
    * Productivity Panel: Cal Newport + James Clear + Tim Ferriss
    * Mental Models Masters: Shane Parrish + Charlie Munger + Annie Duke
    * Business Strategy: Clayton Christensen + Peter Thiel + Ben Horowitz
- Cross-book connections and synthesis
- Citation tracking
- Fact-checking integration
- Voice input/output (text-to-speech and speech-to-text)
- Voice cloning (hear the actual author's voice)
- Photo upload (discuss book highlights, diagrams, notes)

**Analytics & Insights**
- Reading insights dashboard
- Conversation analytics
- Book completion tracking
- Learning progress
- Implementation tracking (goals based on book principles)

### 10.3 Phase 4 Features (Long-term)

**Monetization** (if applicable)
- Premium features
- Unlimited conversations
- Advanced AI models
- Priority support

**Enterprise Features**
- Team workspaces
- Shared book libraries
- Admin controls
- Usage analytics

**Platform Expansion**
- Mobile apps (iOS, Android)
- Browser extensions
- API for developers
- Integrations (Notion, Obsidian, etc.)

---

## 11. Constraints & Assumptions

### 11.1 Technical Constraints

- **API Limits**: Google Gemini API rate limits
- **Database**: Railway PostgreSQL limits
- **Storage**: Message content size limits
- **Browser Support**: Modern browsers only
- **Password Security**: bcrypt hashing adds slight authentication delay

### 11.2 Business Constraints

- **Budget**: Free tier services where possible
- **Time**: Rapid development and iteration
- **Resources**: Small team, limited resources

### 11.3 Assumptions

- Users can create/remember usernames and passwords
- Users are comfortable with AI
- Users want persistent conversations
- Mobile-first usage pattern
- English language primary (for now)
- Users may misspell book/author names (system handles this)

---

## 12. Risk Assessment

### 12.1 Technical Risks

**High Priority**
- **API Failures**: Google API downtime or rate limits
  - *Mitigation*: Error handling, retry logic, fallback messages
- **Database Issues**: Connection failures, query performance
  - *Mitigation*: Connection pooling, query optimization, monitoring
- **Streaming Failures**: Network issues, timeout errors
  - *Mitigation*: Timeout handling, reconnection logic, error messages

**Medium Priority**
- **Password Security**: Weak passwords, credential stuffing
  - *Mitigation*: Password requirements, rate limiting, bcrypt hashing
- **Scalability**: Performance under load
  - *Mitigation*: Load testing, optimization, caching

### 12.2 Product Risks

**High Priority**
- **User Adoption**: Low engagement, high churn
  - *Mitigation*: Onboarding improvements, feature iteration
- **Quality Issues**: Poor AI responses, bugs
  - *Mitigation*: Testing, monitoring, user feedback

**Medium Priority**
- **Competition**: Similar products entering market
  - *Mitigation*: Focus on unique value, rapid iteration

---

## 13. Launch Criteria

### 13.1 Must-Have Features (MVP)

- ✅ Username/password authentication
- ✅ Book setup and author research with spelling correction
- ✅ Authentic author persona conversation (voice matching)
- ✅ Message streaming
- ✅ Conversation persistence
- ✅ Conversation list view
- ✅ Mobile-optimized UI
- ✅ Markdown rendering
- ✅ Auto-save messages

### 13.2 Quality Gates

- ✅ All critical bugs fixed
- ✅ Performance benchmarks met
- ✅ Security review passed
- ✅ Database initialized
- ✅ Environment variables configured
- ✅ Production deployment successful
- ✅ Health check passing
- ✅ Basic smoke tests passing

### 13.3 Success Criteria

- App loads and functions correctly
- Users can authenticate
- Conversations save and load
- AI responses are coherent
- Mobile experience is smooth
- No critical errors in production

---

## 14. Appendix

### 14.1 Glossary

- **Author Persona**: AI embodiment of book author
- **Magic Link**: Passwordless authentication token sent via email
- **System Instruction**: Prompt that defines AI behavior and personality
- **Streaming**: Real-time token-by-token response delivery
- **Conversation**: Collection of messages about a specific book
- **Author Knowledge**: Researched information about book and author

### 14.2 References

- Google Generative AI Documentation
- Resend API Documentation
- Railway Deployment Guide
- React Documentation
- Tailwind CSS Documentation

### 14.3 Change Log

**Version 1.2** (Current - 2024-12-24)
- Enhanced author voice authenticity with detailed style matching
- Automatic spelling correction for book/author names
- Username/password authentication (replaced magic links)
- Added multi-author conversations to future roadmap
- Upgraded to Gemini 2.5 Pro
- Comprehensive AI pattern avoidance system

**Version 1.1** (2024-12-24)
- Switched from magic link to username/password authentication
- Replaced Resend with bcrypt for password hashing
- Updated database schema (username instead of email)
- Re-enabled authentication middleware

**Version 1.0** (2024-01-21)
- Initial release
- Core conversation features
- Magic link authentication
- Mobile-optimized UI
- iMessage-inspired design

---

**Document Version**: 1.2
**Last Updated**: 2024-12-24
**Owner**: Product Team
**Status**: Active

