import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import { initializeDatabase, query, getClient } from './database/db.js';
import { processMessage, createSupportTicketFromChat } from './services/chatbotService.js';
import { fetchProducts, trackOrder, getCustomerOrders } from './services/shopifyService.js';
import { getCustomerMemories, storeMemory, cleanupMemories, autoMaintainMemories } from './services/memoryService.js';
import { fetchCustomerFromNotion, syncCustomerToNotion } from './services/notionService.js';
import { createSupportTicket } from './services/hubspotService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'hair-solutions-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Serve static files (frontend)
app.use(express.static('dist'));

// ==================== AUTHENTICATION MIDDLEWARE ====================

function requireAuth(req, res, next) {
  if (req.session.adminUser) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Simple password check for admin dashboard
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'HairSolutions2024!';

// ==================== PUBLIC API ROUTES ====================

/**
 * POST /api/chat
 * Main chatbot endpoint
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { sessionId, message, userEmail, userName } = req.body;

    if (!sessionId || !message || !userEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await processMessage(sessionId, message, userEmail, userName);

    res.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

/**
 * GET /api/products
 * Get product catalog
 */
app.get('/api/products', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const products = await fetchProducts(limit);
    res.json({ products });
  } catch (error) {
    console.error('Products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/orders/track
 * Track an order
 */
app.get('/api/orders/track', async (req, res) => {
  try {
    const { identifier } = req.query;

    if (!identifier) {
      return res.status(400).json({ error: 'Order number or email required' });
    }

    const orders = await trackOrder(identifier);

    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ orders });
  } catch (error) {
    console.error('Order tracking error:', error);
    res.status(500).json({ error: 'Failed to track order' });
  }
});

/**
 * POST /api/support/ticket
 * Create a support ticket
 */
app.post('/api/support/ticket', async (req, res) => {
  try {
    const { customerId, conversationId, subject, description, type, priority } = req.body;

    if (!customerId || !subject || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await createSupportTicketFromChat(customerId, conversationId, {
      subject,
      description,
      type,
      priority,
    });

    res.json(result);
  } catch (error) {
    console.error('Support ticket error:', error);
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

// ==================== ADMIN AUTHENTICATION ====================

/**
 * POST /api/admin/login
 * Admin login
 */
app.post('/api/admin/login', async (req, res) => {
  try {
    const { password } = req.body;

    if (password === ADMIN_PASSWORD) {
      req.session.adminUser = { id: 1, role: 'admin' };
      res.json({ success: true, message: 'Login successful' });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/admin/logout
 * Admin logout
 */
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

/**
 * GET /api/admin/check
 * Check if user is authenticated
 */
app.get('/api/admin/check', (req, res) => {
  res.json({ authenticated: !!req.session.adminUser });
});

// ==================== ADMIN DASHBOARD API ====================

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
app.get('/api/admin/stats', requireAuth, async (req, res) => {
  try {
    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM customers) as total_customers,
        (SELECT COUNT(*) FROM customers WHERE created_at > NOW() - INTERVAL '7 days') as new_customers_week,
        (SELECT COUNT(*) FROM conversations) as total_conversations,
        (SELECT COUNT(*) FROM conversations WHERE status = 'active') as active_conversations,
        (SELECT COUNT(*) FROM messages) as total_messages,
        (SELECT COUNT(*) FROM support_tickets) as total_tickets,
        (SELECT COUNT(*) FROM support_tickets WHERE status = 'open') as open_tickets
    `);

    // Get recent activity
    const recentActivity = await query(`
      SELECT
        'conversation' as type,
        c.id,
        cu.name as customer_name,
        cu.email as customer_email,
        conv.started_at as timestamp
      FROM conversations conv
      JOIN customers cu ON conv.customer_id = cu.id
      JOIN LATERAL (SELECT id FROM messages WHERE conversation_id = conv.id ORDER BY timestamp DESC LIMIT 1) c ON true
      ORDER BY conv.started_at DESC
      LIMIT 10
    `);

    res.json({
      stats: stats.rows[0],
      recentActivity: recentActivity.rows,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/admin/conversations
 * Get all conversations with pagination
 */
app.get('/api/admin/conversations', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const conversations = await query(`
      SELECT
        conv.id,
        conv.session_id,
        conv.started_at,
        conv.ended_at,
        conv.status,
        conv.conversation_type,
        cu.name as customer_name,
        cu.email as customer_email,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = conv.id) as message_count
      FROM conversations conv
      JOIN customers cu ON conv.customer_id = cu.id
      ORDER BY conv.started_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const totalResult = await query('SELECT COUNT(*) FROM conversations');
    const total = parseInt(totalResult.rows[0].count);

    res.json({
      conversations: conversations.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * GET /api/admin/conversations/:id
 * Get specific conversation with messages
 */
app.get('/api/admin/conversations/:id', requireAuth, async (req, res) => {
  try {
    const conversationId = req.params.id;

    const conversation = await query(`
      SELECT
        conv.*,
        cu.name as customer_name,
        cu.email as customer_email,
        cu.phone as customer_phone
      FROM conversations conv
      JOIN customers cu ON conv.customer_id = cu.id
      WHERE conv.id = $1
    `, [conversationId]);

    if (conversation.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await query(`
      SELECT role, content, timestamp
      FROM messages
      WHERE conversation_id = $1
      ORDER BY timestamp ASC
    `, [conversationId]);

    res.json({
      conversation: conversation.rows[0],
      messages: messages.rows,
    });
  } catch (error) {
    console.error('Conversation detail error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * GET /api/admin/customers
 * Get all customers
 */
app.get('/api/admin/customers', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const customers = await query(`
      SELECT
        cu.*,
        (SELECT COUNT(*) FROM conversations WHERE customer_id = cu.id) as conversation_count,
        (SELECT COUNT(*) FROM customer_memory WHERE customer_id = cu.id AND is_active = true) as memory_count
      FROM customers cu
      ORDER BY cu.last_interaction DESC NULLS LAST, cu.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const totalResult = await query('SELECT COUNT(*) FROM customers');
    const total = parseInt(totalResult.rows[0].count);

    res.json({
      customers: customers.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

/**
 * GET /api/admin/customers/:id
 * Get customer details with memory and conversations
 */
app.get('/api/admin/customers/:id', requireAuth, async (req, res) => {
  try {
    const customerId = req.params.id;

    const customer = await query('SELECT * FROM customers WHERE id = $1', [customerId]);

    if (customer.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const memories = await getCustomerMemories(customerId);

    const conversations = await query(`
      SELECT
        id,
        session_id,
        started_at,
        ended_at,
        status,
        conversation_type,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = conversations.id) as message_count
      FROM conversations
      WHERE customer_id = $1
      ORDER BY started_at DESC
      LIMIT 10
    `, [customerId]);

    res.json({
      customer: customer.rows[0],
      memories,
      conversations: conversations.rows,
    });
  } catch (error) {
    console.error('Customer detail error:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

/**
 * GET /api/admin/analytics
 * Get analytics data
 */
app.get('/api/admin/analytics', requireAuth, async (req, res) => {
  try {
    const timeRange = req.query.range || '7days';

    let interval = '7 days';
    if (timeRange === '24hours') interval = '24 hours';
    if (timeRange === '30days') interval = '30 days';

    const conversationTrends = await query(`
      SELECT
        DATE(started_at) as date,
        COUNT(*) as count
      FROM conversations
      WHERE started_at > NOW() - INTERVAL '${interval}'
      GROUP BY DATE(started_at)
      ORDER BY date ASC
    `);

    const messageTrends = await query(`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as count
      FROM messages
      WHERE timestamp > NOW() - INTERVAL '${interval}'
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `);

    const topCustomers = await query(`
      SELECT
        cu.name,
        cu.email,
        COUNT(conv.id) as conversation_count
      FROM customers cu
      JOIN conversations conv ON cu.id = conv.customer_id
      WHERE conv.started_at > NOW() - INTERVAL '${interval}'
      GROUP BY cu.id, cu.name, cu.email
      ORDER BY conversation_count DESC
      LIMIT 10
    `);

    res.json({
      conversationTrends: conversationTrends.rows,
      messageTrends: messageTrends.rows,
      topCustomers: topCustomers.rows,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/admin/tickets
 * Get support tickets
 */
app.get('/api/admin/tickets', requireAuth, async (req, res) => {
  try {
    const tickets = await query(`
      SELECT
        t.*,
        cu.name as customer_name,
        cu.email as customer_email
      FROM support_tickets t
      JOIN customers cu ON t.customer_id = cu.id
      ORDER BY t.created_at DESC
      LIMIT 50
    `);

    res.json({ tickets: tickets.rows });
  } catch (error) {
    console.error('Tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// ==================== HEALTH & MAINTENANCE ====================

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
    });
  }
});

// ==================== SCHEDULED TASKS ====================

// Run memory maintenance every 6 hours
setInterval(async () => {
  console.log('🔧 Running scheduled memory maintenance...');
  await autoMaintainMemories();
}, 6 * 60 * 60 * 1000);

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ==================== START SERVER ====================

async function startServer() {
  try {
    console.log('🚀 Starting Hair Solutions Mastermind server...');

    // Initialize database
    await initializeDatabase();

    // Start listening
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📊 Admin dashboard: http://localhost:${PORT}/admin`);
      console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
