export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { systemPrompt, messages, userEmail, userName } = JSON.parse(event.body);

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get response from Anthropic');
    }

    const data = await response.json();
    const reply = data.content.find(block => block.type === 'text')?.text || 
                  'I apologize, I had trouble processing that.';

    // NEW: Check if conversation warrants logging
    const shouldLog = messages.length >= 3; // Log after 3+ messages

    if (shouldLog && userEmail) {
      // Log to HubSpot
      await logToHubSpot(userEmail, userName, messages, reply);
      
      // Log to Notion
      await logToNotion(userEmail, userName, messages, reply);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}

// HubSpot Integration
async function logToHubSpot(email, name, messages, latestReply) {
  const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
  
  try {
    // 1. Create or update contact
    const contactResponse = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`
      },
      body: JSON.stringify({
        properties: {
          email: email,
          firstname: name,
          hs_lead_status: 'OPEN',
          lifecyclestage: 'lead'
        }
      })
    });

    const contact = await contactResponse.json();
    const contactId = contact.id;

    // 2. Log engagement (conversation note)
    const conversationText = messages.map(m => 
      `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`
    ).join('\n\n');

    await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`
      },
      body: JSON.stringify({
        properties: {
          hs_note_body: `AI Chatbot Consultation:\n\n${conversationText}\n\nLatest: ${latestReply}`,
          hs_timestamp: new Date().toISOString()
        }
      })
    });

    // 3. Extract product interest from conversation
    const productMentions = extractProductMentions(conversationText);
    
    if (productMentions.length > 0) {
      // Update contact with product interests
      await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`
        },
        body: JSON.stringify({
          properties: {
            product_interest: productMentions.join(', ')
          }
        })
      });
    }

    console.log('✅ Logged to HubSpot');
  } catch (error) {
    console.error('HubSpot logging error:', error);
  }
}

// Notion Integration
async function logToNotion(email, name, messages, latestReply) {
  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  const NOTION_DATABASE_ID = process.env.NOTION_CHATBOT_DB_ID;

  try {
    const conversationText = messages.map(m => 
      `**${m.role === 'user' ? 'Customer' : 'Assistant'}:** ${m.content}`
    ).join('\n\n');

    await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_DATABASE_ID },
        properties: {
          'Name': {
            title: [{ text: { content: `${name || 'Anonymous'} - ${new Date().toLocaleDateString()}` } }]
          },
          'Email': {
            email: email
          },
          'Date': {
            date: { start: new Date().toISOString() }
          },
          'Status': {
            select: { name: 'New Lead' }
          }
        },
        children: [
          {
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [{ type: 'text', text: { content: 'Conversation Transcript' } }]
            }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: conversationText } }]
            }
          }
        ]
      })
    });

    console.log('✅ Logged to Notion');
  } catch (error) {
    console.error('Notion logging error:', error);
  }
}

// Helper: Extract product mentions
function extractProductMentions(text) {
  const products = ['HS1V', 'HS2V', 'HS3V', 'poly', 'lace', 'mono'];
  const mentioned = [];
  
  products.forEach(product => {
    if (text.toLowerCase().includes(product.toLowerCase())) {
      mentioned.push(product);
    }
  });
  
  return [...new Set(mentioned)]; // Remove duplicates
}