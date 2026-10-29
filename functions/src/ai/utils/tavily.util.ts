import type { TavilySearchOptions } from '@tavily/core';
import { AnalysisUtil } from '../utils/analysis.util';

export class TavilyUtilSearchConfigurationError extends Error {
  constructor() {
    super('tavily_search_not_configured');
  }
}

export class TavilyUtilSearchInputError extends Error {
  constructor() {
    super('tavily_search_query_invalid');
  }
}

export class TavilyUtil {
  public static readonly searchOptions: TavilySearchOptions = {
    searchDepth: 'basic',
    topic: 'general',
    maxResults: AnalysisUtil.analysisRuntimeLimits.maxResearchResults,
    includeAnswer: false,
    includeRawContent: false,
    includeUsage: true,
    timeout: AnalysisUtil.analysisRuntimeLimits.stageBudgetMs.research / 1000,
  };

  public static sanitizeSearchQuery(goal: string): string {
    return goal
      .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, ' ')
      .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, ' ')
      .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, ' ')
      .replace(/\b(?:[a-z][a-z\d+.-]*:\/\/|www\.)\S+/gi, ' ')
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/[<>{}[\]"'`]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, AnalysisUtil.analysisRuntimeLimits.maxResearchQueryLength)
      .trim();
  }

  public static isHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return (
        (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password
      );
    } catch {
      return false;
    }
  }
}
