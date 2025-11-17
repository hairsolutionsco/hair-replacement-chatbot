import dotenv from 'dotenv';

dotenv.config();

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

/**
 * Shopify Integration Service
 * Handles product fetching, order tracking, and customer orders
 */

/**
 * Fetch products from Shopify
 */
export async function fetchProducts(limit = 50) {
  try {
    const url = `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/products.json?limit=${limit}`;

    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();

    // Format products for chatbot consumption
    const formattedProducts = data.products.map(product => {
      const variant = product.variants[0];
      return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        description: product.body_html?.replace(/<[^>]*>/g, '').substring(0, 200) || '',
        price: variant?.price || 'N/A',
        compareAtPrice: variant?.compare_at_price || null,
        available: variant?.inventory_quantity > 0,
        inventoryQuantity: variant?.inventory_quantity || 0,
        productType: product.product_type || '',
        tags: product.tags?.split(',').map(t => t.trim()) || [],
        url: `https://${SHOPIFY_DOMAIN.replace('.myshopify.com', '')}/products/${product.handle}`,
        imageUrl: product.images[0]?.src || '',
      };
    });

    console.log(`✅ Fetched ${formattedProducts.length} products from Shopify`);
    return formattedProducts;
  } catch (error) {
    console.error('Error fetching products from Shopify:', error);
    return [];
  }
}

/**
 * Search products by query
 */
export async function searchProducts(searchQuery) {
  try {
    const allProducts = await fetchProducts(250);
    const query = searchQuery.toLowerCase();

    const results = allProducts.filter(product => {
      return (
        product.title.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.tags.some(tag => tag.toLowerCase().includes(query)) ||
        product.productType.toLowerCase().includes(query)
      );
    });

    console.log(`✅ Found ${results.length} products matching "${searchQuery}"`);
    return results;
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
}

/**
 * Get product by handle
 */
export async function getProductByHandle(handle) {
  try {
    const url = `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/products.json?handle=${handle}`;

    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.products.length === 0) {
      return null;
    }

    const product = data.products[0];
    const variant = product.variants[0];

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.body_html?.replace(/<[^>]*>/g, '') || '',
      price: variant?.price || 'N/A',
      compareAtPrice: variant?.compare_at_price || null,
      available: variant?.inventory_quantity > 0,
      inventoryQuantity: variant?.inventory_quantity || 0,
      productType: product.product_type || '',
      tags: product.tags?.split(',').map(t => t.trim()) || [],
      variants: product.variants.map(v => ({
        id: v.id,
        title: v.title,
        price: v.price,
        available: v.inventory_quantity > 0,
      })),
      images: product.images.map(img => img.src),
      url: `https://${SHOPIFY_DOMAIN.replace('.myshopify.com', '')}/products/${product.handle}`,
    };
  } catch (error) {
    console.error('Error getting product by handle:', error);
    return null;
  }
}

/**
 * Track order by order number or email
 */
export async function trackOrder(identifier) {
  try {
    let url;

    // Check if identifier is an order number or email
    if (identifier.includes('@')) {
      // Search by email
      url = `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders.json?email=${identifier}&limit=10`;
    } else {
      // Search by order number
      url = `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders.json?name=${identifier}`;
    }

    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.orders.length === 0) {
      return null;
    }

    // Return formatted orders
    return data.orders.map(order => ({
      orderNumber: order.name,
      orderDate: order.created_at,
      status: order.fulfillment_status || 'unfulfilled',
      financialStatus: order.financial_status,
      total: order.total_price,
      currency: order.currency,
      trackingNumber: order.fulfillments?.[0]?.tracking_number || null,
      trackingUrl: order.fulfillments?.[0]?.tracking_url || null,
      trackingCompany: order.fulfillments?.[0]?.tracking_company || null,
      items: order.line_items.map(item => ({
        title: item.title,
        quantity: item.quantity,
        price: item.price,
      })),
      shippingAddress: order.shipping_address ? {
        name: `${order.shipping_address.first_name} ${order.shipping_address.last_name}`,
        address: order.shipping_address.address1,
        city: order.shipping_address.city,
        country: order.shipping_address.country,
      } : null,
    }));
  } catch (error) {
    console.error('Error tracking order:', error);
    return null;
  }
}

/**
 * Get customer orders by email
 */
export async function getCustomerOrders(email) {
  try {
    // First, find the customer
    const customerUrl = `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/customers/search.json?query=email:${email}`;

    const customerResponse = await fetch(customerUrl, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
    });

    if (!customerResponse.ok) {
      throw new Error(`Shopify API error: ${customerResponse.status}`);
    }

    const customerData = await customerResponse.json();

    if (customerData.customers.length === 0) {
      return [];
    }

    const customerId = customerData.customers[0].id;

    // Get orders for this customer
    const ordersUrl = `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/customers/${customerId}/orders.json`;

    const ordersResponse = await fetch(ordersUrl, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
    });

    if (!ordersResponse.ok) {
      throw new Error(`Shopify API error: ${ordersResponse.status}`);
    }

    const ordersData = await ordersResponse.json();

    return ordersData.orders.map(order => ({
      orderNumber: order.name,
      orderDate: order.created_at,
      status: order.fulfillment_status || 'unfulfilled',
      financialStatus: order.financial_status,
      total: order.total_price,
      items: order.line_items.map(item => ({
        title: item.title,
        quantity: item.quantity,
      })),
    }));
  } catch (error) {
    console.error('Error getting customer orders:', error);
    return [];
  }
}

/**
 * Get product recommendations based on preferences
 */
export async function getRecommendations(preferences = {}) {
  try {
    const products = await fetchProducts(250);

    let filtered = products;

    // Filter by budget
    if (preferences.budget) {
      const maxPrice = parseFloat(preferences.budget);
      filtered = filtered.filter(p => parseFloat(p.price) <= maxPrice);
    }

    // Filter by product type
    if (preferences.productType) {
      filtered = filtered.filter(p =>
        p.productType.toLowerCase().includes(preferences.productType.toLowerCase())
      );
    }

    // Filter by tags
    if (preferences.tags && preferences.tags.length > 0) {
      filtered = filtered.filter(p =>
        preferences.tags.some(tag =>
          p.tags.some(pTag => pTag.toLowerCase().includes(tag.toLowerCase()))
        )
      );
    }

    // Only show available products
    if (preferences.availableOnly !== false) {
      filtered = filtered.filter(p => p.available);
    }

    // Sort by price or relevance
    if (preferences.sortBy === 'price_low') {
      filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (preferences.sortBy === 'price_high') {
      filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    }

    return filtered.slice(0, preferences.limit || 10);
  } catch (error) {
    console.error('Error getting product recommendations:', error);
    return [];
  }
}

export default {
  fetchProducts,
  searchProducts,
  getProductByHandle,
  trackOrder,
  getCustomerOrders,
  getRecommendations,
};
