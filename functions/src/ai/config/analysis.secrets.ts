import { defineSecret } from 'firebase-functions/params';

export const openRouterApiKey = defineSecret('OPENROUTER_API_KEY');
export const tavilyApiKey = defineSecret('TAVILY_API_KEY');

export function getOpenRouterApiKey(): string {
  const secret = openRouterApiKey.value();
  return secret;
}

export function getTavilyApiKey(): string {
  const secret = tavilyApiKey.value();
  return secret;
}
