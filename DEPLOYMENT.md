# Hair Solutions Mastermind - Deployment Guide

## 🚀 Railway Deployment Instructions

### Prerequisites
- Railway account
- Notion workspace with integration token
- Shopify store with Admin API access
- HubSpot account with API key
- Anthropic API key

### Step 1: Create Railway Project

1. **Install Railway CLI** (optional but recommended):
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Create a new project on Railway**:
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo" or "Empty Project"

### Step 2: Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically provision a PostgreSQL database
4. Copy the `DATABASE_URL` from the database settings

### Step 3: Configure Environment Variables

In your Railway project settings, add these environment variables:

```env
# Database (automatically set by Railway)
DATABASE_URL=<provided by Railway PostgreSQL>

# Anthropic Claude API
ANTHROPIC_API_KEY=<your key>

# Shopify Integration
SHOPIFY_DOMAIN=yourstore.myshopify.com
SHOPIFY_ACCESS_TOKEN=<your token>

# Notion Integration
NOTION_INTEGRATION_TOKEN=<your notion integration token>
NOTION_DATABASE_ID=<your email database id>
NOTION_WHATSAPP_DATABASE_ID=<your whatsapp database id>

# HubSpot Integration
HUBSPOT_API_KEY=<your key>
HUBSPOT_PORTAL_ID=<your portal id>

# Admin Dashboard
ADMIN_PASSWORD=<create a secure password>

# Server Configuration
PORT=3000
NODE_ENV=production
SESSION_SECRET=<generate a random secret>

# CORS Configuration
CORS_ORIGIN=https://chat.hairsolutions.co
```

### Step 4: Deploy the Application

#### Option A: Using Railway CLI
```bash
# From project root
railway link
railway up
```

#### Option B: Using Git Integration
1. Connect your GitHub repository to Railway
2. Railway will automatically deploy on every push to main branch
3. The build command and start command are defined in `railway.json`

### Step 5: Verify Deployment

1. Check the deployment logs in Railway dashboard
2. Visit your Railway app URL (e.g., `https://your-app.railway.app`)
3. Test the health endpoint: `https://your-app.railway.app/api/health`
4. Test the chat interface at the root URL
5. Test the admin dashboard at `/admin`

### Step 6: Set Up Custom Domain

1. In Railway project settings, go to "Settings" → "Domains"
2. Click "Add Domain"
3. Add `chat.hairsolutions.co`
4. Update your DNS records with the provided CNAME
5. Update `CORS_ORIGIN` environment variable to match your domain

---

## 🔧 Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

### 3. Set Up Local PostgreSQL Database (Optional)
```bash
# Using Docker
docker run --name hair-solutions-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=hair_solutions \
  -p 5432:5432 \
  -d postgres:15

# Update DATABASE_URL in .env
DATABASE_URL=postgresql://postgres:password@localhost:5432/hair_solutions
```

### 4. Run Development Server
```bash
# Terminal 1 - Backend server
npm run server:dev

# Terminal 2 - Frontend dev server
npm run dev
```

### 5. Access the Application
- **Chat Interface**: http://localhost:5173
- **Admin Dashboard**: http://localhost:5173/admin
- **API**: http://localhost:3000/api

---

## 📊 Database Initialization

The database schema is automatically initialized when the server starts. The schema includes:

- ✅ `customers` - Customer profiles
- ✅ `conversations` - Chat conversations
- ✅ `messages` - Individual messages
- ✅ `customer_memory` - AI-extracted memories and preferences
- ✅ `knowledge_base` - Chatbot knowledge
- ✅ `consultations` - Structured consultation data
- ✅ `support_tickets` - Support ticket tracking
- ✅ `shopping_sessions` - Shopping journey tracking
- ✅ `analytics_events` - Analytics data
- ✅ `admin_users` - Admin authentication

---

## 🔐 Security Checklist

Before going to production:

- [ ] Change `ADMIN_PASSWORD` to a strong password
- [ ] Generate a secure `SESSION_SECRET` (use: `openssl rand -hex 32`)
- [ ] Enable HTTPS only (Railway does this automatically)
- [ ] Set `CORS_ORIGIN` to your actual domain
- [ ] Rotate all API keys if they were exposed
- [ ] Enable Railway's private networking for database
- [ ] Set up Railway's automatic backups for PostgreSQL

---

## 🎯 Post-Deployment Checklist

- [ ] Test chat interface with a real conversation
- [ ] Verify Shopify product fetching works
- [ ] Test order tracking functionality
- [ ] Verify Notion integration syncs correctly
- [ ] Test HubSpot ticket creation
- [ ] Check admin dashboard displays data correctly
- [ ] Test memory extraction from conversations
- [ ] Verify automatic memory cleanup runs (check logs after 6 hours)
- [ ] Set up monitoring/alerting in Railway
- [ ] Configure custom domain DNS
- [ ] Test from mobile devices

---

## 🔄 Updating the Application

### Using Railway CLI
```bash
git add .
git commit -m "Update description"
git push origin main
# Railway auto-deploys on push
```

### Manual Deployment
1. Push changes to GitHub
2. Railway automatically detects and deploys
3. Check deployment logs for any errors

---

## 📈 Monitoring & Maintenance

### Railway Dashboard
- Monitor resource usage (CPU, Memory, Network)
- View application logs in real-time
- Set up alerts for downtime
- Configure automatic restarts on failure

### Database Maintenance
- Railway automatically handles PostgreSQL backups
- Monitor database size and performance
- Consider upgrading plan if needed (current: optimized for 5-10 concurrent users)

### Scheduled Tasks
The application runs these tasks automatically:
- **Memory Cleanup**: Every 6 hours
- **Memory Extraction**: After conversations with 4+ messages

---

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Check DATABASE_URL is set correctly
railway variables

# Test database connection
railway run node -e "require('./server/database/db.js')"
```

### Build Failures
```bash
# Check build logs in Railway dashboard
# Common issues:
# - Missing environment variables
# - Node version mismatch
# - Dependency installation failures
```

### Application Crashes
```bash
# View logs
railway logs

# Common issues:
# - Missing required environment variables
# - Database connection failures
# - Out of memory (upgrade Railway plan)
```

---

## 💡 Tips & Best Practices

1. **Use Railway's Preview Deployments** for testing changes
2. **Enable automatic backups** for PostgreSQL in Railway
3. **Monitor costs** - Railway charges based on usage
4. **Set up Sentry or similar** for error tracking in production
5. **Use Railway's metrics** to track response times and errors
6. **Keep dependencies updated** with `npm audit` and `npm update`

---

## 📞 Support

For Railway-specific issues:
- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

For application issues:
- Check server logs: `railway logs`
- Check database status in Railway dashboard
- Verify all environment variables are set correctly

---

## 🎉 You're All Set!

Your Hair Solutions Mastermind Chatbot is now deployed and ready to help customers!

**Admin Dashboard**: https://your-domain.com/admin
**Chat Interface**: https://your-domain.com

Happy chatting! 🚀
