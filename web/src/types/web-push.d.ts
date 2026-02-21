declare module 'web-push' {
  interface PushSubscription {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  interface RequestOptions {
    gcmAPIKey?: string;
    vapidDetails?: {
      subject: string;
      publicKey: string;
      privateKey: string;
    };
    TTL?: number;
    headers?: Record<string, string>;
    contentEncoding?: string;
    proxy?: string;
    timeout?: number;
  }

  interface SendResult {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  }

  function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  function sendNotification(
    pushSubscription: PushSubscription,
    payload?: string | Buffer | null,
    options?: RequestOptions
  ): Promise<SendResult>;
  function generateVAPIDKeys(): { publicKey: string; privateKey: string };
  function setGCMAPIKey(apiKey: string): void;

  export = {
    setVapidDetails,
    sendNotification,
    generateVAPIDKeys,
    setGCMAPIKey,
  };
}
