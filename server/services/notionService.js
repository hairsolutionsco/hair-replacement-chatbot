import { Client } from '@notionhq/client';
import dotenv from 'dotenv';
import { query } from '../database/db.js';

dotenv.config();

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_INTEGRATION_TOKEN,
});

/**
 * Fetch customer data from Notion by email
 */
export async function fetchCustomerFromNotion(email) {
  try {
    if (!process.env.NOTION_DATABASE_ID) {
      console.warn('⚠️ NOTION_DATABASE_ID not configured');
      return null;
    }

    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      filter: {
        property: 'Email', // Adjust this to match your Notion database property name
        email: {
          equals: email,
        },
      },
    });

    if (response.results.length === 0) {
      return null;
    }

    const page = response.results[0];

    // Extract customer data from Notion page
    const customerData = {
      notion_id: page.id,
      email: email,
      name: extractProperty(page.properties, 'Name') || '',
      phone: extractProperty(page.properties, 'Phone') || '',
      notes: extractProperty(page.properties, 'Notes') || '',
      tags: extractProperty(page.properties, 'Tags') || [],
      purchase_history: extractProperty(page.properties, 'Purchase History') || [],
      preferences: extractProperty(page.properties, 'Preferences') || {},
      vip_status: extractProperty(page.properties, 'VIP') || false,
    };

    return customerData;
  } catch (error) {
    console.error('Error fetching customer from Notion:', error);
    return null;
  }
}

/**
 * Fetch WhatsApp customer data from Notion
 */
export async function fetchWhatsAppCustomerFromNotion(whatsappId) {
  try {
    if (!process.env.NOTION_WHATSAPP_DATABASE_ID) {
      console.warn('⚠️ NOTION_WHATSAPP_DATABASE_ID not configured');
      return null;
    }

    const response = await notion.databases.query({
      database_id: process.env.NOTION_WHATSAPP_DATABASE_ID,
      filter: {
        property: 'WhatsApp ID', // Adjust to your property name
        rich_text: {
          equals: whatsappId,
        },
      },
    });

    if (response.results.length === 0) {
      return null;
    }

    const page = response.results[0];

    return {
      notion_id: page.id,
      whatsapp_id: whatsappId,
      name: extractProperty(page.properties, 'Name') || '',
      email: extractProperty(page.properties, 'Email') || '',
      phone: extractProperty(page.properties, 'Phone') || '',
      notes: extractProperty(page.properties, 'Notes') || '',
    };
  } catch (error) {
    console.error('Error fetching WhatsApp customer from Notion:', error);
    return null;
  }
}

/**
 * Sync customer data to Notion
 */
export async function syncCustomerToNotion(customerId) {
  try {
    // Get customer data from database
    const result = await query(
      'SELECT * FROM customers WHERE id = $1',
      [customerId]
    );

    if (result.rows.length === 0) {
      console.error('Customer not found:', customerId);
      return false;
    }

    const customer = result.rows[0];

    // Get customer memory and insights
    const memoryResult = await query(
      `SELECT memory_type, key, value, confidence
       FROM customer_memory
       WHERE customer_id = $1 AND is_active = true
       ORDER BY updated_at DESC`,
      [customerId]
    );

    const memories = memoryResult.rows;

    // Check if customer exists in Notion
    if (customer.notion_id) {
      // Update existing Notion page
      await notion.pages.update({
        page_id: customer.notion_id,
        properties: buildNotionProperties(customer, memories),
      });
      console.log('✅ Updated customer in Notion:', customer.email);
    } else {
      // Create new Notion page
      if (!process.env.NOTION_DATABASE_ID) {
        console.warn('⚠️ Cannot create Notion page: NOTION_DATABASE_ID not configured');
        return false;
      }

      const response = await notion.pages.create({
        parent: { database_id: process.env.NOTION_DATABASE_ID },
        properties: buildNotionProperties(customer, memories),
      });

      // Update customer with Notion ID
      await query(
        'UPDATE customers SET notion_id = $1 WHERE id = $2',
        [response.id, customerId]
      );

      console.log('✅ Created customer in Notion:', customer.email);
    }

    return true;
  } catch (error) {
    console.error('Error syncing customer to Notion:', error);
    return false;
  }
}

/**
 * Add consultation notes to Notion
 */
export async function addConsultationToNotion(customerId, consultationData) {
  try {
    const customer = await query(
      'SELECT notion_id, email FROM customers WHERE id = $1',
      [customerId]
    );

    if (customer.rows.length === 0 || !customer.rows[0].notion_id) {
      console.warn('Customer not found in Notion');
      return false;
    }

    // Create a new page for the consultation or append to existing page
    await notion.blocks.children.append({
      block_id: customer.rows[0].notion_id,
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: `Consultation - ${new Date().toLocaleDateString()}` } }],
          },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: consultationData.summary || 'No summary available' } }],
          },
        },
      ],
    });

    console.log('✅ Added consultation to Notion');
    return true;
  } catch (error) {
    console.error('Error adding consultation to Notion:', error);
    return false;
  }
}

/**
 * Helper function to extract property values from Notion
 */
function extractProperty(properties, propertyName) {
  if (!properties[propertyName]) {
    return null;
  }

  const property = properties[propertyName];

  switch (property.type) {
    case 'title':
      return property.title[0]?.plain_text || '';
    case 'rich_text':
      return property.rich_text[0]?.plain_text || '';
    case 'email':
      return property.email || '';
    case 'phone_number':
      return property.phone_number || '';
    case 'number':
      return property.number || 0;
    case 'checkbox':
      return property.checkbox || false;
    case 'multi_select':
      return property.multi_select.map(item => item.name) || [];
    case 'select':
      return property.select?.name || '';
    case 'date':
      return property.date?.start || null;
    default:
      return null;
  }
}

/**
 * Build Notion properties object from customer data
 */
function buildNotionProperties(customer, memories) {
  const properties = {
    'Name': {
      title: [{ text: { content: customer.name || 'Unknown' } }],
    },
    'Email': {
      email: customer.email,
    },
  };

  // Add phone if available
  if (customer.phone) {
    properties['Phone'] = {
      phone_number: customer.phone,
    };
  }

  // Add VIP status
  if (customer.customer_status === 'vip') {
    properties['VIP'] = {
      checkbox: true,
    };
  }

  // Add last interaction
  if (customer.last_interaction) {
    properties['Last Contact'] = {
      date: { start: customer.last_interaction },
    };
  }

  // Add memory insights as notes
  if (memories.length > 0) {
    const memoryText = memories
      .map(m => `${m.key}: ${m.value}`)
      .join('\n');

    properties['AI Insights'] = {
      rich_text: [{ text: { content: memoryText.substring(0, 2000) } }],
    };
  }

  return properties;
}

export default {
  fetchCustomerFromNotion,
  fetchWhatsAppCustomerFromNotion,
  syncCustomerToNotion,
  addConsultationToNotion,
};
