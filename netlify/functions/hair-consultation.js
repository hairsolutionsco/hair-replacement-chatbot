export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { systemPrompt, messages, userEmail, userName } = JSON.parse(event.body);

    // FETCH SHOPIFY PRODUCTS
    const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
    const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

    let productKnowledge = '';
    
    try {
      const productsResponse = await fetch(
        `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/products.json?limit=50`,
        {
          headers: {
            'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
            'Content-Type': 'application/json'
          }
        }
      );

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        
        // Build product catalog for the AI
        productKnowledge = '\n\nCURRENT PRODUCT CATALOG:\n';
        productsData.products.forEach(product => {
          const mainVariant = product.variants[0];
          productKnowledge += `
- ${product.title}
  Price: $${mainVariant.price}
  URL: https://hairsolutions.co/products/${product.handle}
  In Stock: ${product.variants.some(v => v.inventory_quantity > 0) ? 'Yes' : 'No'}
  Type: ${product.product_type}
  Description: ${product.body_html?.replace(/<[^>]*>/g, '').substring(0, 150)}
`;
        });
      }
    } catch (productError) {
      console.error('Error fetching products:', productError);
      // Continue without product data if fetch fails
    }

    // Enhance system prompt with real product data
    const enhancedPrompt = systemPrompt + productKnowledge;

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
        system: enhancedPrompt,
        messages: messages
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get response from Anthropic');
    }

    const data = await response.json();
    const reply = data.content.find(block => block.type === 'text')?.text || 
                  'I apologize, I had trouble processing that.';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
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