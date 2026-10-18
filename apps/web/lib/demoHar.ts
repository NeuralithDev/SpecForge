/**
 * Pre-sanitized realistic multi-endpoint HAR trace payload for the one-click demo experience.
 */

export const DEMO_HAR_FILENAME = "stripe-billing-checkout.har";

export const DEMO_HAR_PAYLOAD = JSON.stringify(
  {
    log: {
      version: "1.2",
      creator: { name: "Chrome DevTools Network Interceptor", version: "128.0" },
      pages: [{ startedDateTime: "2026-10-18T10:00:00.000Z", id: "page_1", title: "Checkout Flow" }],
      entries: [
        {
          startedDateTime: "2026-10-18T10:00:01.000Z",
          time: 142,
          request: {
            method: "POST",
            url: "https://api.stripe.com/v1/payment_intents",
            httpVersion: "HTTP/2.0",
            headers: [
              { name: "Host", value: "api.stripe.com" },
              { name: "User-Agent", value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
              { name: "Accept", value: "application/json" },
              { name: "Content-Type", value: "application/x-www-form-urlencoded" },
              { name: "Authorization", value: "Bearer mock_live_stripe_customer_token_scrubbed_9901" },
              { name: "Cookie", value: "session_id=live_sess_cookie_99812; __stripe_mid=mid_token_334" },
            ],
            queryString: [],
            cookies: [
              { name: "session_id", value: "live_sess_cookie_99812" },
              { name: "__stripe_mid", value: "mid_token_334" },
            ],
            postData: {
              mimeType: "application/x-www-form-urlencoded",
              text: "amount=4999&currency=usd&payment_method_types[]=card&description=Agent+Subscription+Pro&metadata[customer_email]=alex@enterprise.corp",
            },
          },
          response: {
            status: 200,
            statusText: "OK",
            httpVersion: "HTTP/2.0",
            headers: [
              { name: "content-type", value: "application/json" },
              { name: "stripe-version", value: "2024-06-20" },
            ],
            content: {
              size: 450,
              mimeType: "application/json",
              text: JSON.stringify({
                id: "pi_3N9zXkLkdIwHu7ix04XyB11",
                object: "payment_intent",
                amount: 4999,
                currency: "usd",
                status: "requires_payment_method",
                client_secret: "pi_3N9zXkLkdIwHu7ix04XyB11_secret_7721839",
                created: 1729245600,
              }),
            },
          },
        },
        {
          startedDateTime: "2026-10-18T10:00:02.000Z",
          time: 98,
          request: {
            method: "GET",
            url: "https://api.stripe.com/v1/customers?limit=10&email=alex%40enterprise.corp",
            httpVersion: "HTTP/2.0",
            headers: [
              { name: "Host", value: "api.stripe.com" },
              { name: "Accept", value: "application/json" },
              { name: "Authorization", value: "Bearer mock_live_stripe_customer_token_scrubbed_9901" },
            ],
            queryString: [
              { name: "limit", value: "10" },
              { name: "email", value: "alex@enterprise.corp" },
            ],
            cookies: [],
          },
          response: {
            status: 200,
            statusText: "OK",
            httpVersion: "HTTP/2.0",
            headers: [{ name: "content-type", value: "application/json" }],
            content: {
              size: 512,
              mimeType: "application/json",
              text: JSON.stringify({
                object: "list",
                data: [
                  {
                    id: "cus_Q89zX104X9a",
                    object: "customer",
                    name: "Alex Vance",
                    email: "alex@enterprise.corp",
                    balance: 0,
                    created: 1729245500,
                  },
                ],
                has_more: false,
              }),
            },
          },
        },
        {
          startedDateTime: "2026-10-18T10:00:03.000Z",
          time: 115,
          request: {
            method: "POST",
            url: "https://api.stripe.com/v1/charges",
            httpVersion: "HTTP/2.0",
            headers: [
              { name: "Host", value: "api.stripe.com" },
              { name: "Accept", value: "application/json" },
              { name: "Content-Type", value: "application/json" },
              { name: "Authorization", value: "Bearer mock_live_stripe_customer_token_scrubbed_9901" },
            ],
            queryString: [],
            cookies: [],
            postData: {
              mimeType: "application/json",
              text: JSON.stringify({
                amount: 2900,
                currency: "usd",
                customer: "cus_Q89zX104X9a",
                description: "Pro Studio Monthly Seat",
              }),
            },
          },
          response: {
            status: 200,
            statusText: "OK",
            httpVersion: "HTTP/2.0",
            headers: [{ name: "content-type", value: "application/json" }],
            content: {
              size: 380,
              mimeType: "application/json",
              text: JSON.stringify({
                id: "ch_3N9zXkLkdIwHu7ix11aa99",
                object: "charge",
                amount: 2900,
                paid: true,
                status: "succeeded",
              }),
            },
          },
        },
        {
          startedDateTime: "2026-10-18T10:00:04.000Z",
          time: 85,
          request: {
            method: "GET",
            url: "https://api.stripe.com/v1/balance",
            httpVersion: "HTTP/2.0",
            headers: [
              { name: "Host", value: "api.stripe.com" },
              { name: "Accept", value: "application/json" },
              { name: "Authorization", value: "Bearer mock_live_stripe_customer_token_scrubbed_9901" },
            ],
            queryString: [],
            cookies: [],
          },
          response: {
            status: 200,
            statusText: "OK",
            httpVersion: "HTTP/2.0",
            headers: [{ name: "content-type", value: "application/json" }],
            content: {
              size: 320,
              mimeType: "application/json",
              text: JSON.stringify({
                object: "balance",
                available: [{ amount: 1542000, currency: "usd" }],
                pending: [{ amount: 49900, currency: "usd" }],
              }),
            },
          },
        },
      ],
    },
  },
  null,
  2,
);
