-- Hair Solutions Mastermind Database Schema
-- PostgreSQL Database

-- Customers table - stores all customer information
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(50),
    notion_id VARCHAR(255),
    whatsapp_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_interaction TIMESTAMP,
    customer_status VARCHAR(50) DEFAULT 'active', -- active, inactive, vip
    total_purchases DECIMAL(10, 2) DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Conversations table - stores all chat conversations
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    channel VARCHAR(50) DEFAULT 'web', -- web, whatsapp, email
    conversation_type VARCHAR(100), -- consultation, shopping, support, general
    status VARCHAR(50) DEFAULT 'active', -- active, completed, escalated
    sentiment VARCHAR(50), -- positive, neutral, negative
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Messages table - stores individual messages
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- user, assistant, system
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Customer memory - stores important facts about customers
CREATE TABLE IF NOT EXISTS customer_memory (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    memory_type VARCHAR(100) NOT NULL, -- preference, fact, purchase, consultation
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    confidence DECIMAL(3, 2) DEFAULT 1.0, -- 0.0 to 1.0
    source VARCHAR(100), -- conversation, notion, shopify, manual
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Chatbot knowledge base
CREATE TABLE IF NOT EXISTS knowledge_base (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL, -- product, faq, maintenance, consultation
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    keywords TEXT[], -- Array of keywords for search
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Consultation sessions - structured consultation data
CREATE TABLE IF NOT EXISTS consultations (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    consultation_stage VARCHAR(100), -- initial, assessment, recommendation, followup
    hair_loss_level VARCHAR(50),
    lifestyle_data JSONB DEFAULT '{}'::jsonb,
    recommendations JSONB DEFAULT '{}'::jsonb,
    products_recommended TEXT[],
    appointment_scheduled BOOLEAN DEFAULT false,
    appointment_link TEXT,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
    ticket_type VARCHAR(100) NOT NULL, -- defective_unit, order_tracking, maintenance, general
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open', -- open, in_progress, resolved, closed
    priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, urgent
    hubspot_ticket_id VARCHAR(255),
    assigned_to VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Shopping sessions - track shopping journeys
CREATE TABLE IF NOT EXISTS shopping_sessions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    products_viewed TEXT[],
    products_recommended TEXT[],
    budget_range VARCHAR(100),
    preferences JSONB DEFAULT '{}'::jsonb,
    purchase_intent VARCHAR(50), -- browsing, considering, ready_to_buy
    conversion BOOLEAN DEFAULT false,
    order_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin users for dashboard access
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'viewer', -- admin, viewer
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_notion_id ON customers(notion_id);
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_customer_memory_customer ON customer_memory(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_memory_active ON customer_memory(customer_id, is_active);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_shopping_sessions_customer ON shopping_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_memory_updated_at BEFORE UPDATE ON customer_memory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON consultations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_sessions_updated_at BEFORE UPDATE ON shopping_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
