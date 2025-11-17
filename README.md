# 🧠 Hair Solutions Mastermind Chatbot

An advanced AI-powered chatbot system for Hair Solutions Co. that provides comprehensive customer support, product recommendations, consultation services, and order management.

## ✨ Features

### 🎯 Core Capabilities

1. **Full Consultation Workflow**
   - Comprehensive hair loss assessments
   - Lifestyle and preference analysis
   - Personalized product recommendations
   - Appointment scheduling integration

2. **Shopping Assistant**
   - Guided product discovery
   - Budget-aware recommendations
   - Product comparisons
   - Real-time inventory checking

3. **Customer Support**
   - Order tracking via Shopify
   - Support ticket creation (HubSpot integration)
   - Defective unit claims
   - Maintenance and care guidance

4. **Memory System**
   - AI-powered customer memory extraction
   - Automatic preference learning
   - Context-aware conversations
   - Notion integration for customer data sync

5. **Admin Dashboard**
   - Real-time conversation monitoring
   - Customer profile management
   - Memory inspection and editing
   - Analytics and performance metrics
   - Support ticket management

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 18.2.0
- React Router DOM 6.22.0
- Vite 7.2.2
- Lucide Icons

**Backend:**
- Node.js + Express 4.18.2
- PostgreSQL (via Railway)
- Anthropic Claude AI (Sonnet 4)

**Integrations:**
- 🛍️ **Shopify** - Product catalog and order tracking
- 📝 **Notion** - Customer database sync
- 🎫 **HubSpot** - Support ticket management
- 🤖 **Anthropic Claude** - AI conversation engine

### Database Schema

```
customers → conversations → messages
    ↓
customer_memory
consultations
shopping_sessions
support_tickets
analytics_events
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database (or Railway account)
- API keys for:
  - Anthropic Claude
  - Shopify Admin API
  - Notion Integration
  - HubSpot (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd hair-replacement-chatbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

4. **Set up the database**
   - The schema is auto-initialized on first run
   - Make sure `DATABASE_URL` is set in `.env`

5. **Run the application**
   ```bash
   # Development mode (with hot reload)
   npm run server:dev  # Backend (Terminal 1)
   npm run dev         # Frontend (Terminal 2)

   # Production mode
   npm run build       # Build frontend
   npm run server      # Start server
   ```

6. **Access the application**
   - Chat Interface: http://localhost:5173
   - Admin Dashboard: http://localhost:5173/admin
   - API: http://localhost:3000/api

## 📦 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions for Railway.

### Quick Railway Deploy

1. Create a Railway project
2. Add PostgreSQL database
3. Set environment variables (see `.env.example`)
4. Connect your GitHub repo or use Railway CLI
5. Deploy!

```bash
railway link
railway up
```

## 🔑 Environment Variables

Required environment variables (see `.env.example` for complete list):

```env
# Database
DATABASE_URL=postgresql://...

# AI
ANTHROPIC_API_KEY=your_key

# Shopify
SHOPIFY_DOMAIN=yourstore.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_token

# Notion
NOTION_INTEGRATION_TOKEN=your_token
NOTION_DATABASE_ID=your_database_id

# Admin
ADMIN_PASSWORD=secure_password
```

## 📊 Admin Dashboard

Access the admin dashboard at `/admin` to:

- 👥 View all customers and their information
- 💬 Monitor conversations in real-time
- 🧠 Inspect AI-extracted customer memories
- 📈 Analyze chatbot performance metrics
- 🎫 Manage support tickets
- 📊 View analytics and trends

**Default Admin Access:**
- URL: `http://localhost:5173/admin` (or your production domain)
- Password: Set via `ADMIN_PASSWORD` environment variable

## 🤖 AI Capabilities

The chatbot uses Claude Sonnet 4 with an enhanced system prompt that includes:

- Customer context from memory system
- Real-time Shopify product catalog
- Order tracking capabilities
- Support ticket creation
- Emotional intelligence for consultations
- Dynamic tone matching

### Memory System

The AI automatically extracts and stores:
- Customer preferences (hair type, style, budget)
- Important facts (lifestyle, concerns, goals)
- Purchase intent signals
- Consultation insights

Memory cleanup runs automatically every 6 hours to remove:
- Expired memories
- Low-confidence entries (< 0.3)

## 📡 API Endpoints

### Public Endpoints

- `POST /api/chat` - Send chat message
- `GET /api/products` - Get product catalog
- `GET /api/orders/track` - Track order
- `POST /api/support/ticket` - Create support ticket
- `GET /api/health` - Health check

### Admin Endpoints (Authentication Required)

- `POST /api/admin/login` - Admin login
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/conversations` - List conversations
- `GET /api/admin/conversations/:id` - Get conversation details
- `GET /api/admin/customers` - List customers
- `GET /api/admin/customers/:id` - Get customer details
- `GET /api/admin/analytics` - Analytics data
- `GET /api/admin/tickets` - Support tickets

## 🔧 Configuration

### Customizing the Chatbot

Edit `/server/services/chatbotService.js` to modify:
- System prompt
- Conversation logic
- Memory extraction prompts
- Response formatting

### Adding New Integrations

1. Create service file in `/server/services/`
2. Add environment variables
3. Import in `/server/index.js`
4. Add API endpoints as needed

## 🧪 Testing

### Manual Testing Checklist

- [ ] Chat interface loads correctly
- [ ] User can send and receive messages
- [ ] Product recommendations work
- [ ] Order tracking functions
- [ ] Memory system extracts information
- [ ] Admin dashboard displays data
- [ ] Support tickets create successfully
- [ ] Notion sync works (if configured)

### Testing Locally

```bash
# Test chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-123",
    "message": "Hello",
    "userEmail": "test@example.com",
    "userName": "Test User"
  }'

# Test health endpoint
curl http://localhost:3000/api/health
```

## 📈 Performance

Optimized for:
- **Concurrent Users**: 5-10 simultaneous conversations
- **Response Time**: < 2s for most queries
- **Database**: Connection pooling with max 10 connections
- **Memory**: Auto-cleanup to prevent bloat

To scale beyond 10 concurrent users:
1. Upgrade Railway plan
2. Increase database connection pool
3. Consider Redis for session storage
4. Add rate limiting

## 🔒 Security Features

- ✅ Password-protected admin dashboard
- ✅ Session-based authentication
- ✅ CORS protection
- ✅ Environment variable secrets
- ✅ SQL injection prevention (parameterized queries)
- ✅ HTTPS enforced (in production)
- ✅ Cookie security (httpOnly, secure in prod)

## 🛠️ Troubleshooting

### Common Issues

**Chat not responding:**
- Check `ANTHROPIC_API_KEY` is set correctly
- Verify API key has credits
- Check server logs for errors

**Database errors:**
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check database connection in Railway dashboard

**Products not loading:**
- Verify `SHOPIFY_DOMAIN` and `SHOPIFY_ACCESS_TOKEN`
- Check Shopify API permissions
- Test Shopify API directly

**Notion sync not working:**
- Verify `NOTION_INTEGRATION_TOKEN`
- Check database ID is correct
- Ensure integration has access to database

## 📚 Project Structure

```
hair-replacement-chatbot/
├── src/                          # Frontend React app
│   ├── App.jsx                   # Main app with routing
│   ├── ChatInterface.jsx         # Chat UI component
│   ├── components/
│   │   └── AdminDashboard.jsx    # Admin dashboard
│   └── index.css                 # Global styles
├── server/                       # Backend Node.js server
│   ├── index.js                  # Express server
│   ├── database/
│   │   ├── db.js                 # Database connection
│   │   └── schema.sql            # Database schema
│   └── services/
│       ├── chatbotService.js     # Main AI logic
│       ├── memoryService.js      # Memory management
│       ├── notionService.js      # Notion integration
│       ├── shopifyService.js     # Shopify integration
│       └── hubspotService.js     # HubSpot integration
├── package.json                  # Dependencies
├── vite.config.js               # Vite configuration
├── railway.json                 # Railway deployment config
└── DEPLOYMENT.md                # Deployment guide
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

Proprietary - Hair Solutions Co.

## 🆘 Support

For technical support:
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment issues
- Review server logs: `railway logs` or check console
- Verify environment variables are set correctly

## 🎉 Roadmap

Future enhancements:
- [ ] WhatsApp integration
- [ ] Multi-language support
- [ ] Voice chat capabilities
- [ ] Image analysis for hair loss assessment
- [ ] Before/after photo gallery
- [ ] Automated email follow-ups
- [ ] Advanced analytics dashboard
- [ ] A/B testing framework
- [ ] Customer satisfaction surveys

---

**Built with ❤️ for Hair Solutions Co.**

*Powered by Anthropic Claude AI*
