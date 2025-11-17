import dotenv from 'dotenv';

dotenv.config();

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const HUBSPOT_API_URL = 'https://api.hubapi.com';

/**
 * HubSpot Integration Service
 * Handles support ticket creation and customer syncing
 */

/**
 * Create a support ticket in HubSpot
 */
export async function createSupportTicket(ticketData) {
  try {
    if (!HUBSPOT_API_KEY) {
      console.warn('⚠️ HubSpot API key not configured. Ticket not created.');
      return { success: false, ticketId: null };
    }

    const {
      subject,
      description,
      customerEmail,
      customerName,
      priority = 'MEDIUM',
      ticketType = 'GENERAL_INQUIRY',
    } = ticketData;

    // First, find or create contact
    let contactId = await findOrCreateContact(customerEmail, customerName);

    if (!contactId) {
      console.error('Failed to create/find HubSpot contact');
      return { success: false, ticketId: null };
    }

    // Create the ticket
    const ticketPayload = {
      properties: {
        subject: subject,
        content: description,
        hs_pipeline: '0', // Default pipeline
        hs_pipeline_stage: '1', // New ticket stage
        hs_ticket_priority: priority,
        hs_ticket_category: ticketType,
      },
      associations: [
        {
          to: { id: contactId },
          types: [
            {
              associationCategory: 'HUBSPOT_DEFINED',
              associationTypeId: 16, // Contact to Ticket association
            },
          ],
        },
      ],
    };

    const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      },
      body: JSON.stringify(ticketPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('HubSpot API error:', errorData);
      return { success: false, ticketId: null };
    }

    const data = await response.json();

    console.log(`✅ Created HubSpot ticket: ${data.id}`);
    return {
      success: true,
      ticketId: data.id,
      ticketUrl: `https://app.hubspot.com/contacts/${process.env.HUBSPOT_PORTAL_ID}/ticket/${data.id}`,
    };
  } catch (error) {
    console.error('Error creating HubSpot ticket:', error);
    return { success: false, ticketId: null };
  }
}

/**
 * Find or create a contact in HubSpot
 */
async function findOrCreateContact(email, name = '') {
  try {
    // Try to find existing contact
    const searchResponse = await fetch(
      `${HUBSPOT_API_URL}/crm/v3/objects/contacts/search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'email',
                  operator: 'EQ',
                  value: email,
                },
              ],
            },
          ],
        }),
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.results && searchData.results.length > 0) {
        return searchData.results[0].id;
      }
    }

    // Contact not found, create new one
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const createResponse = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          email: email,
          firstname: firstName,
          lastname: lastName,
        },
      }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      console.error('Error creating HubSpot contact:', errorData);
      return null;
    }

    const createData = await createResponse.json();
    console.log(`✅ Created HubSpot contact: ${createData.id}`);
    return createData.id;
  } catch (error) {
    console.error('Error finding/creating HubSpot contact:', error);
    return null;
  }
}

/**
 * Update ticket status
 */
export async function updateTicketStatus(ticketId, status) {
  try {
    if (!HUBSPOT_API_KEY) {
      return false;
    }

    const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          hs_pipeline_stage: status,
        },
      }),
    });

    if (!response.ok) {
      console.error('Error updating HubSpot ticket');
      return false;
    }

    console.log(`✅ Updated HubSpot ticket ${ticketId} status`);
    return true;
  } catch (error) {
    console.error('Error updating ticket status:', error);
    return false;
  }
}

/**
 * Add note to ticket
 */
export async function addNoteToTicket(ticketId, noteContent) {
  try {
    if (!HUBSPOT_API_KEY) {
      return false;
    }

    const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          hs_note_body: noteContent,
        },
        associations: [
          {
            to: { id: ticketId },
            types: [
              {
                associationCategory: 'HUBSPOT_DEFINED',
                associationTypeId: 214, // Note to Ticket association
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Error adding note to HubSpot ticket');
      return false;
    }

    console.log(`✅ Added note to HubSpot ticket ${ticketId}`);
    return true;
  } catch (error) {
    console.error('Error adding note to ticket:', error);
    return false;
  }
}

/**
 * Sync customer to HubSpot
 */
export async function syncCustomerToHubSpot(customerData) {
  try {
    if (!HUBSPOT_API_KEY) {
      return false;
    }

    const contactId = await findOrCreateContact(customerData.email, customerData.name);

    if (!contactId) {
      return false;
    }

    // Update contact with additional properties
    const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/contacts/${contactId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          phone: customerData.phone || '',
          lifecyclestage: customerData.lifecycleStage || 'customer',
          hs_lead_status: customerData.status || 'OPEN',
        },
      }),
    });

    if (!response.ok) {
      console.error('Error syncing customer to HubSpot');
      return false;
    }

    console.log(`✅ Synced customer to HubSpot: ${customerData.email}`);
    return true;
  } catch (error) {
    console.error('Error syncing customer to HubSpot:', error);
    return false;
  }
}

export default {
  createSupportTicket,
  updateTicketStatus,
  addNoteToTicket,
  syncCustomerToHubSpot,
};
