export class LlmUtilProviderConfigurationError extends Error {
  constructor() {
    super('llm_provider_not_configured');
  }
}
