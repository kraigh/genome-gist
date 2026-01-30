/**
 * Lemon Squeezy Checkout Integration
 *
 * Handles opening Lemon Squeezy checkout overlay and processing successful purchases.
 * https://docs.lemonsqueezy.com/help/lemonjs
 */

// Lemon Squeezy configuration
// Store ID is used to construct checkout URLs
const LEMON_SQUEEZY_STORE_ID = import.meta.env.VITE_LEMON_SQUEEZY_STORE_ID || '';
const LEMON_SQUEEZY_VARIANT_ID = import.meta.env.VITE_LEMON_SQUEEZY_VARIANT_ID || '';

// Declare Lemon Squeezy types (minimal typing for what we use)
declare global {
  interface Window {
    LemonSqueezy?: {
      Setup: (options: { eventHandler: (event: LemonSqueezyEvent) => void }) => void;
      Url: {
        Open: (url: string) => void;
        Close: () => void;
      };
    };
    createLemonSqueezy?: () => void;
  }
}

interface LemonSqueezyEvent {
  event: string;
  data?: {
    type?: string;
    id?: string;
    attributes?: {
      store_id?: number;
      customer_id?: number;
      identifier?: string;
      order_number?: number;
      user_name?: string;
      user_email?: string;
      currency?: string;
      total?: number;
      status?: string;
      first_order_item?: {
        id?: number;
        order_id?: number;
        product_id?: number;
        variant_id?: number;
      };
    };
  };
}

// Callbacks for checkout events
type CheckoutSuccessCallback = (orderId: string, email?: string) => void;
type CheckoutCloseCallback = () => void;

let isInitialized = false;
let onSuccessCallback: CheckoutSuccessCallback | null = null;
let onCloseCallback: CheckoutCloseCallback | null = null;

/**
 * Initialize Lemon Squeezy (Lemon.js)
 * Should be called once when the app loads
 */
export function initializeLemonSqueezy(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isInitialized) {
      resolve();
      return;
    }

    if (!LEMON_SQUEEZY_STORE_ID || !LEMON_SQUEEZY_VARIANT_ID) {
      console.warn('Lemon Squeezy not configured. Checkout will not work.');
      reject(new Error('Lemon Squeezy not configured'));
      return;
    }

    // Check if Lemon Squeezy script is already loaded
    if (window.LemonSqueezy) {
      setupEventHandler();
      isInitialized = true;
      resolve();
      return;
    }

    // Load Lemon.js script
    const script = document.createElement('script');
    script.src = 'https://app.lemonsqueezy.com/js/lemon.js';
    script.defer = true;

    script.onload = () => {
      // Lemon.js needs createLemonSqueezy() to be called after load
      if (window.createLemonSqueezy) {
        window.createLemonSqueezy();
      }

      if (window.LemonSqueezy) {
        setupEventHandler();
        isInitialized = true;
        resolve();
      } else {
        reject(new Error('Lemon Squeezy failed to initialize'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load Lemon Squeezy script'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Set up Lemon Squeezy event handler
 */
function setupEventHandler(): void {
  if (!window.LemonSqueezy) return;

  window.LemonSqueezy.Setup({
    eventHandler: (event: LemonSqueezyEvent) => {
      if (event.event === 'Checkout.Success' && event.data) {
        // Extract order ID and email from the event
        const orderId = event.data.id || '';
        const email = event.data.attributes?.user_email;

        if (onSuccessCallback && orderId) {
          onSuccessCallback(orderId, email);
        }
      }

      // Handle checkout overlay closed (user cancelled or closed without completing)
      if (event.event === 'Checkout.Close') {
        if (onCloseCallback) {
          onCloseCallback();
        }
      }
    },
  });
}

/**
 * Build the checkout URL with optional prefilled data
 */
function buildCheckoutUrl(options?: { email?: string }): string {
  // Lemon Squeezy checkout URL format:
  // https://{store}.lemonsqueezy.com/checkout/buy/{variant-id}
  const baseUrl = `https://${LEMON_SQUEEZY_STORE_ID}.lemonsqueezy.com/checkout/buy/${LEMON_SQUEEZY_VARIANT_ID}`;

  const params = new URLSearchParams();

  // Prefill email if provided
  // https://docs.lemonsqueezy.com/help/checkout/prefilled-checkout-fields
  if (options?.email) {
    params.set('checkout[email]', options.email);
  }

  // Enable overlay mode
  params.set('embed', '1');

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Open Lemon Squeezy checkout overlay
 */
export function openCheckout(options: {
  email?: string;
  onSuccess?: CheckoutSuccessCallback;
  onClose?: CheckoutCloseCallback;
}): void {
  if (!window.LemonSqueezy) {
    console.error('Lemon Squeezy not initialized');
    options.onClose?.();
    return;
  }

  if (!LEMON_SQUEEZY_STORE_ID || !LEMON_SQUEEZY_VARIANT_ID) {
    console.error('Lemon Squeezy store ID or variant ID not configured');
    options.onClose?.();
    return;
  }

  // Store callbacks for event handler
  onSuccessCallback = options.onSuccess || null;
  onCloseCallback = options.onClose || null;

  // Build and open checkout URL
  const checkoutUrl = buildCheckoutUrl({ email: options.email });
  window.LemonSqueezy.Url.Open(checkoutUrl);
}

/**
 * Check if Lemon Squeezy is configured and available
 */
export function isLemonSqueezyConfigured(): boolean {
  return Boolean(LEMON_SQUEEZY_STORE_ID && LEMON_SQUEEZY_VARIANT_ID);
}

/**
 * Check if purchases are enabled
 * - In development mode: enabled if Lemon Squeezy is configured (for testing)
 * - In production: disabled by default, can be enabled via VITE_PURCHASES_ENABLED=true
 */
export function isPurchaseEnabled(): boolean {
  // Check explicit enable flag (for production)
  const explicitlyEnabled = import.meta.env.VITE_PURCHASES_ENABLED === 'true';
  if (explicitlyEnabled && isLemonSqueezyConfigured()) {
    return true;
  }

  // In development mode, enable if Lemon Squeezy is configured
  if (import.meta.env.DEV && isLemonSqueezyConfigured()) {
    return true;
  }

  return false;
}
