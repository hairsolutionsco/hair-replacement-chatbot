export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN; // e.g., "hairsolutions.myshopify.com"
    const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

    const response = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/products.json?limit=250`,
      {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch products from Shopify');
    }

    const data = await response.json();
    
    // Format products for the chatbot
    const formattedProducts = data.products.map(product => ({
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.body_html?.replace(/<[^>]*>/g, '').substring(0, 200), // Strip HTML, limit length
      price: product.variants[0]?.price,
      comparePrice: product.variants[0]?.compare_at_price,
      url: `https://hairsolutions.co/products/${product.handle}`,
      inStock: product.variants.some(v => v.inventory_quantity > 0),
      variants: product.variants.map(v => ({
        title: v.title,
        price: v.price,
        available: v.inventory_quantity > 0
      })),
      productType: product.product_type,
      tags: product.tags
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: formattedProducts })
    };

  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch products' })
    };
  }
}