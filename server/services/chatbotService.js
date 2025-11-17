import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { query } from '../database/db.js';
import { fetchProducts, trackOrder, getCustomerOrders, getRecommendations } from './shopifyService.js';
import { getMemorySummary, extractMemoriesFromConversation } from './memoryService.js';
import { createSupportTicket } from './hubspotService.js';
import { syncCustomerToNotion } from './notionService.js';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Enhanced System Prompt for Hair Solutions Mastermind
 */
function buildSystemPrompt(customerContext, products) {
  const productCatalog = products
    .map(p => `- [${p.title}](${p.url}) - $${p.price} (${p.available ? 'In Stock' : 'Out of Stock'})`)
    .join('\n');

  return `You are the Hair Solutions Mastermind - an advanced AI assistant specialized in hair replacement systems. You have comprehensive knowledge and capabilities to help customers through their entire journey.

${customerContext ? `\n=== CUSTOMER CONTEXT ===\n${customerContext}\n` : ''}

YOUR CORE CAPABILITIES:

1️⃣ FULL CONSULTATION WORKFLOW
- Conduct comprehensive hair loss assessments
- Understand lifestyle, preferences, and concerns
- Provide personalized product recommendations
- Guide through the selection process step-by-step
- Schedule appointments when needed

2️⃣ SHOPPING ASSISTANT
- Help customers discover the perfect product through guided questions
- Explain differences between product types (lace, poly, mono, hybrid)
- Provide budget-conscious recommendations
- Answer sizing, color, and customization questions
- Guide through the purchasing process

3️⃣ CUSTOMER SUPPORT
- Track orders and provide shipping updates
- Help with defective unit claims
- Assist with maintenance and care questions
- Troubleshoot common issues
- Create support tickets for complex issues
- Connect customers with human support when needed

4️⃣ MAINTENANCE & STYLING ADVISOR
- Provide care instructions for different base types
- Recommend cleaning products and techniques
- Offer styling tips and techniques
- Help solve attachment and bonding issues
- Advise on product longevity and replacement timing

=== AVAILABLE PRODUCT CATALOG ===
${productCatalog}

=== CONVERSATION GUIDELINES ===

🎯 TONE & APPROACH:
- Be warm, empathetic, and professional
- Match the customer's energy and communication style
- For emotional topics (hair loss), be supportive and understanding
- For technical questions, be precise and helpful
- Keep responses concise but informative (2-3 sentences unless detail is requested)

🔍 CONSULTATION PROCESS:
When conducting a consultation:
1. Start with empathy - acknowledge their situation
2. Ask about their hair loss journey (how long, what stage)
3. Understand their lifestyle (active? swimming? climate?)
4. Discuss their priorities (natural look? easy maintenance? budget?)
5. Present 2-3 tailored product recommendations with reasoning
6. Answer questions and guide to purchase or human consultation

🛒 SHOPPING ASSISTANCE:
When helping with shopping:
1. Ask about their experience level (beginner vs experienced)
2. Clarify their main concerns (comfort, durability, appearance)
3. Discuss budget range
4. Narrow down options through guided questions
5. Provide specific product links with clear reasoning
6. Explain next steps (how to order, what to expect)

🎫 SUPPORT TICKET CREATION:
When customer needs help with:
- Defective unit → Create ticket with product details and issue description
- Order problems → Check order status first, then create ticket if needed
- Complex maintenance issues → Offer troubleshooting, then ticket if unresolved

Use this format: "I'll create a support ticket for you. This will be sent to our customer service team who will reach out within 24 hours."

📞 HUMAN HANDOFF TRIGGERS:
Offer to connect with a human consultant when:
- Customer explicitly requests human assistance
- Need to physically see/touch samples
- Highly customized requirements beyond standard products
- After 8+ messages if customer seems uncertain
- Sensitive topics requiring personal touch

Meeting booking link: https://meetings-eu1.hubspot.com/vlaroche/personal-consultation-call

=== SPECIAL CAPABILITIES ===

📊 ORDER TRACKING:
When customer asks about an order, you can track it using:
- Order number (e.g., #1234)
- Email address associated with order
Provide: order status, tracking number, estimated delivery, items ordered

💾 MEMORY SYSTEM:
You have access to previous conversations and preferences for returning customers. Use this to:
- Personalize recommendations
- Remember their preferences
- Reference past purchases
- Continue previous conversations naturally

🧠 KNOWLEDGE AREAS:
✅ Base Types: Lace (breathable, natural), Poly (durable, waterproof), Mono (comfortable, natural)
✅ Adhesives: Tapes (easy, short-term), Glues (strong, long-term), Both (flexibility)
✅ Hair Types: Human hair (natural, styleable), Synthetic (affordable, low maintenance)
✅ Maintenance: Cleaning frequency, product recommendations, storage tips
✅ Styling: Heat styling, coloring, cutting, daily care
✅ Troubleshooting: Lifting edges, shedding, tangling, discoloration

=== RESPONSE FORMAT ===

- Use markdown formatting for better readability
- Bold important points: **key information**
- Use bullet points for lists
- Include product links: [Product Name](URL)
- Keep paragraphs short and scannable
- Use emojis sparingly for visual cues (only when appropriate)

=== IMPORTANT RULES ===

✅ DO:
- Always be honest about being an AI assistant
- Use real product information from the catalog
- Provide accurate pricing and availability
- Create support tickets when appropriate
- Offer human consultation when beneficial
- Remember and use customer context
- Be empathetic about hair loss concerns

❌ DON'T:
- Pretend to be human
- Make up product information
- Promise things outside your control
- Give medical advice
- Pressure customers to buy
- Share pricing for products not in catalog
- Make assumptions about customer's situation

=== TOOLS AT YOUR DISPOSAL ===

You can help customers:
- 🔍 Find products in the catalog
- 📦 Track their orders
- 🎫 Create support tickets
- 📅 Schedule consultations
- 💬 Continue previous conversations
- 🎯 Get personalized recommendations

Remember: Your goal is to provide exceptional, personalized service that helps customers find the perfect hair system solution for their unique needs. Be knowledgeable, empathetic, and always focused on the customer's best interests.`;
}

/**
 * Process a chat message with full context and capabilities
 */
export async function processMessage(sessionId, userMessage, customerEmail, customerName) {
  try {
    // 1. Get or create customer
    const customer = await getOrCreateCustomer(customerEmail, customerName);

    // 2. Get or create conversation
    const conversation = await getOrCreateConversation(sessionId, customer.id);

    // 3. Store user message
    await storeMessage(conversation.id, 'user', userMessage);

    // 4. Get customer context from memory
    const customerContext = await getMemorySummary(customer.id);

    // 5. Fetch products for recommendations
    const products = await fetchProducts(50);

    // 6. Get conversation history
    const conversationHistory = await getConversationHistory(conversation.id);

    // 7. Check if message contains special requests
    const specialResponse = await handleSpecialRequests(userMessage, customer, conversation);
    if (specialResponse) {
      await storeMessage(conversation.id, 'assistant', specialResponse);
      return { reply: specialResponse };
    }

    // 8. Build system prompt with context
    const systemPrompt = buildSystemPrompt(customerContext, products);

    // 9. Prepare messages for Claude
    const messages = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // 10. Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages,
    });

    const assistantReply = response.content[0].text;

    // 11. Store assistant message
    await storeMessage(conversation.id, 'assistant', assistantReply);

    // 12. Extract and store memories (async, don't wait)
    if (conversationHistory.length >= 4) {
      extractMemoriesFromConversation(customer.id, conversation.id).catch(err => {
        console.error('Error extracting memories:', err);
      });
    }

    // 13. Update customer last interaction
    await query(
      'UPDATE customers SET last_interaction = CURRENT_TIMESTAMP WHERE id = $1',
      [customer.id]
    );

    // 14. Log analytics event
    await logAnalyticsEvent('message_processed', customer.id, conversation.id, {
      message_length: userMessage.length,
      response_length: assistantReply.length,
    });

    return { reply: assistantReply };
  } catch (error) {
    console.error('Error processing message:', error);
    throw error;
  }
}

/**
 * Handle special requests (order tracking, support tickets, etc.)
 */
async function handleSpecialRequests(message, customer, conversation) {
  const lowerMessage = message.toLowerCase();

  // Order tracking
  if (lowerMessage.includes('track') && (lowerMessage.includes('order') || lowerMessage.includes('#'))) {
    // Extract order number or use customer email
    const orderMatch = message.match(/#(\d+)/);
    const identifier = orderMatch ? orderMatch[1] : customer.email;

    const orders = await trackOrder(identifier);
    if (orders && orders.length > 0) {
      const order = orders[0];
      let response = `📦 **Order ${order.orderNumber}**\n\n`;
      response += `**Status:** ${order.status}\n`;
      response += `**Total:** ${order.currency} ${order.total}\n`;

      if (order.trackingNumber) {
        response += `**Tracking:** ${order.trackingNumber}\n`;
        if (order.trackingUrl) {
          response += `[Track your package](${order.trackingUrl})\n`;
        }
      }

      response += `\n**Items:**\n`;
      order.items.forEach(item => {
        response += `- ${item.title} (x${item.quantity})\n`;
      });

      return response;
    }
  }

  // Support ticket creation (if explicitly requested)
  if (lowerMessage.includes('support ticket') || lowerMessage.includes('file a ticket') || lowerMessage.includes('create ticket')) {
    // This is a placeholder - actual ticket creation would need more context
    return "I'd be happy to create a support ticket for you! Could you please tell me:\n\n1. What's the issue you're experiencing?\n2. Is this related to a specific product or order?\n\nOnce you provide these details, I'll create a ticket for our support team.";
  }

  return null;
}

/**
 * Get or create customer in database
 */
async function getOrCreateCustomer(email, name = '') {
  try {
    // Check if customer exists
    let result = await query(
      'SELECT * FROM customers WHERE email = $1',
      [email]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Create new customer
    result = await query(
      `INSERT INTO customers (email, name, created_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       RETURNING *`,
      [email, name]
    );

    const customer = result.rows[0];

    // Async: Sync to Notion (don't wait)
    syncCustomerToNotion(customer.id).catch(err => {
      console.error('Error syncing to Notion:', err);
    });

    console.log(`✅ Created new customer: ${email}`);
    return customer;
  } catch (error) {
    console.error('Error getting/creating customer:', error);
    throw error;
  }
}

/**
 * Get or create conversation
 */
async function getOrCreateConversation(sessionId, customerId) {
  try {
    let result = await query(
      'SELECT * FROM conversations WHERE session_id = $1',
      [sessionId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    result = await query(
      `INSERT INTO conversations (customer_id, session_id, started_at, channel, status)
       VALUES ($1, $2, CURRENT_TIMESTAMP, 'web', 'active')
       RETURNING *`,
      [customerId, sessionId]
    );

    console.log(`✅ Created new conversation: ${sessionId}`);
    return result.rows[0];
  } catch (error) {
    console.error('Error getting/creating conversation:', error);
    throw error;
  }
}

/**
 * Store a message in the database
 */
async function storeMessage(conversationId, role, content) {
  try {
    await query(
      `INSERT INTO messages (conversation_id, role, content, timestamp)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [conversationId, role, content]
    );
  } catch (error) {
    console.error('Error storing message:', error);
  }
}

/**
 * Get conversation history
 */
async function getConversationHistory(conversationId, limit = 50) {
  try {
    const result = await query(
      `SELECT role, content, timestamp
       FROM messages
       WHERE conversation_id = $1
       ORDER BY timestamp ASC
       LIMIT $2`,
      [conversationId, limit]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return [];
  }
}

/**
 * Log analytics event
 */
async function logAnalyticsEvent(eventType, customerId, conversationId, eventData) {
  try {
    await query(
      `INSERT INTO analytics_events (event_type, customer_id, conversation_id, event_data, timestamp)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [eventType, customerId, conversationId, JSON.stringify(eventData)]
    );
  } catch (error) {
    console.error('Error logging analytics:', error);
  }
}

/**
 * Create support ticket through chatbot
 */
export async function createSupportTicketFromChat(customerId, conversationId, ticketData) {
  try {
    // Get customer info
    const customerResult = await query(
      'SELECT email, name FROM customers WHERE id = $1',
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      return { success: false, message: 'Customer not found' };
    }

    const customer = customerResult.rows[0];

    // Create ticket in database
    const dbResult = await query(
      `INSERT INTO support_tickets
       (customer_id, conversation_id, ticket_type, subject, description, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'open', CURRENT_TIMESTAMP)
       RETURNING *`,
      [customerId, conversationId, ticketData.type, ticketData.subject, ticketData.description]
    );

    const ticket = dbResult.rows[0];

    // Create ticket in HubSpot
    const hubspotResult = await createSupportTicket({
      subject: ticketData.subject,
      description: ticketData.description,
      customerEmail: customer.email,
      customerName: customer.name,
      priority: ticketData.priority || 'MEDIUM',
      ticketType: ticketData.type || 'GENERAL_INQUIRY',
    });

    if (hubspotResult.success) {
      // Update ticket with HubSpot ID
      await query(
        'UPDATE support_tickets SET hubspot_ticket_id = $1 WHERE id = $2',
        [hubspotResult.ticketId, ticket.id]
      );
    }

    console.log(`✅ Created support ticket: ${ticket.id}`);
    return {
      success: true,
      ticketId: ticket.id,
      hubspotTicketId: hubspotResult.ticketId,
    };
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return { success: false, message: error.message };
  }
}

export default {
  processMessage,
  createSupportTicketFromChat,
};
