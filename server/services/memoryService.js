import { query } from '../database/db.js';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Memory Management Service
 * Handles intelligent storage, retrieval, and cleanup of customer information
 */

/**
 * Store a memory for a customer
 */
export async function storeMemory(customerId, memoryType, key, value, options = {}) {
  try {
    const {
      confidence = 1.0,
      source = 'conversation',
      expiresInDays = null,
      metadata = {},
    } = options;

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Check if memory already exists
    const existing = await query(
      `SELECT id FROM customer_memory
       WHERE customer_id = $1 AND memory_type = $2 AND key = $3 AND is_active = true`,
      [customerId, memoryType, key]
    );

    if (existing.rows.length > 0) {
      // Update existing memory
      await query(
        `UPDATE customer_memory
         SET value = $1, confidence = $2, updated_at = CURRENT_TIMESTAMP, metadata = $3
         WHERE id = $4`,
        [value, confidence, JSON.stringify(metadata), existing.rows[0].id]
      );
      console.log(`✅ Updated memory: ${key} for customer ${customerId}`);
    } else {
      // Create new memory
      await query(
        `INSERT INTO customer_memory
         (customer_id, memory_type, key, value, confidence, source, expires_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [customerId, memoryType, key, value, confidence, source, expiresAt, JSON.stringify(metadata)]
      );
      console.log(`✅ Stored new memory: ${key} for customer ${customerId}`);
    }

    return true;
  } catch (error) {
    console.error('Error storing memory:', error);
    return false;
  }
}

/**
 * Retrieve memories for a customer
 */
export async function getCustomerMemories(customerId, options = {}) {
  try {
    const {
      memoryType = null,
      activeOnly = true,
      limit = 100,
    } = options;

    let queryText = `
      SELECT id, memory_type, key, value, confidence, source, created_at, updated_at, metadata
      FROM customer_memory
      WHERE customer_id = $1
    `;

    const params = [customerId];
    let paramIndex = 2;

    if (activeOnly) {
      queryText += ` AND is_active = true AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`;
    }

    if (memoryType) {
      queryText += ` AND memory_type = $${paramIndex}`;
      params.push(memoryType);
      paramIndex++;
    }

    queryText += ` ORDER BY updated_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query(queryText, params);

    return result.rows.map(row => ({
      ...row,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    }));
  } catch (error) {
    console.error('Error retrieving memories:', error);
    return [];
  }
}

/**
 * Extract and store memories from conversation using AI
 */
export async function extractMemoriesFromConversation(customerId, conversationId) {
  try {
    // Get conversation messages
    const messagesResult = await query(
      `SELECT m.role, m.content, m.timestamp
       FROM messages m
       WHERE m.conversation_id = $1
       ORDER BY m.timestamp ASC`,
      [conversationId]
    );

    if (messagesResult.rows.length === 0) {
      return [];
    }

    const conversationText = messagesResult.rows
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    // Use Claude to extract key information
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Analyze this customer conversation and extract key facts to remember about this customer.

Format your response as a JSON array of memories, each with:
- type: "preference", "fact", "purchase_intent", "concern", or "goal"
- key: short description (e.g., "hair_loss_level", "budget", "lifestyle")
- value: the actual information
- confidence: 0.0 to 1.0

Conversation:
${conversationText}

Return ONLY the JSON array, no other text.`
      }]
    });

    const content = response.content[0].text;

    // Parse the JSON response
    let memories = [];
    try {
      memories = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return [];
    }

    // Store each memory
    const storedMemories = [];
    for (const memory of memories) {
      await storeMemory(
        customerId,
        memory.type,
        memory.key,
        memory.value,
        {
          confidence: memory.confidence || 0.8,
          source: 'ai_extraction',
          metadata: { conversation_id: conversationId },
        }
      );
      storedMemories.push(memory);
    }

    console.log(`✅ Extracted ${storedMemories.length} memories from conversation`);
    return storedMemories;
  } catch (error) {
    console.error('Error extracting memories:', error);
    return [];
  }
}

/**
 * Clean up expired or low-confidence memories
 */
export async function cleanupMemories(customerId = null) {
  try {
    let queryText = `
      UPDATE customer_memory
      SET is_active = false
      WHERE (expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP)
         OR confidence < 0.3
    `;

    const params = [];
    if (customerId) {
      queryText += ` AND customer_id = $1`;
      params.push(customerId);
    }

    const result = await query(queryText, params);

    console.log(`✅ Cleaned up ${result.rowCount} expired or low-confidence memories`);
    return result.rowCount;
  } catch (error) {
    console.error('Error cleaning up memories:', error);
    return 0;
  }
}

/**
 * Get memory summary for chatbot context
 */
export async function getMemorySummary(customerId) {
  try {
    const memories = await getCustomerMemories(customerId, { activeOnly: true });

    if (memories.length === 0) {
      return 'No previous information about this customer.';
    }

    // Group memories by type
    const grouped = memories.reduce((acc, memory) => {
      if (!acc[memory.memory_type]) {
        acc[memory.memory_type] = [];
      }
      acc[memory.memory_type].push(`${memory.key}: ${memory.value}`);
      return acc;
    }, {});

    // Format as readable summary
    let summary = 'What we know about this customer:\n\n';

    if (grouped.preference) {
      summary += '🎯 Preferences:\n' + grouped.preference.join('\n') + '\n\n';
    }

    if (grouped.fact) {
      summary += '📌 Key Facts:\n' + grouped.fact.join('\n') + '\n\n';
    }

    if (grouped.purchase_intent) {
      summary += '🛒 Purchase Interests:\n' + grouped.purchase_intent.join('\n') + '\n\n';
    }

    if (grouped.concern) {
      summary += '⚠️ Concerns:\n' + grouped.concern.join('\n') + '\n\n';
    }

    if (grouped.goal) {
      summary += '🎯 Goals:\n' + grouped.goal.join('\n') + '\n\n';
    }

    return summary.trim();
  } catch (error) {
    console.error('Error getting memory summary:', error);
    return 'Unable to retrieve customer information.';
  }
}

/**
 * Automatic memory maintenance (run periodically)
 */
export async function autoMaintainMemories() {
  try {
    console.log('🔧 Starting automatic memory maintenance...');

    // Clean up expired memories
    const cleanedCount = await cleanupMemories();

    // Get customers with recent activity
    const activeCustomers = await query(
      `SELECT DISTINCT c.id
       FROM customers c
       JOIN conversations conv ON c.id = conv.customer_id
       WHERE conv.started_at > NOW() - INTERVAL '7 days'`
    );

    // Extract memories from recent conversations
    for (const customer of activeCustomers.rows) {
      const recentConversations = await query(
        `SELECT id FROM conversations
         WHERE customer_id = $1
         AND started_at > NOW() - INTERVAL '7 days'
         ORDER BY started_at DESC
         LIMIT 5`,
        [customer.id]
      );

      for (const conv of recentConversations.rows) {
        await extractMemoriesFromConversation(customer.id, conv.id);
      }
    }

    console.log(`✅ Memory maintenance completed. Cleaned ${cleanedCount} memories.`);
    return true;
  } catch (error) {
    console.error('Error in automatic memory maintenance:', error);
    return false;
  }
}

export default {
  storeMemory,
  getCustomerMemories,
  extractMemoriesFromConversation,
  cleanupMemories,
  getMemorySummary,
  autoMaintainMemories,
};
