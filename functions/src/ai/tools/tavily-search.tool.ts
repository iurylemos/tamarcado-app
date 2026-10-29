import { tavily } from '@tavily/core';
import type { TavilyResearchSource } from '../interfaces/tavily.interface';
import {
  TavilyUtilSearchConfigurationError,
  TavilyUtilSearchInputError,
  TavilyUtil,
} from '../utils/tavily.util';
import { AnalysisUtil } from '../utils/analysis.util';
import { reportSourcesSchema } from '../schemas/report.schema';

export async function searchMarketEvidence(
  goal: string,
  apiKey?: string,
): Promise<TavilyResearchSource[]> {
  const currentApiKey = apiKey ?? process.env.TAVILY_API_KEY;

  if (!currentApiKey) throw new TavilyUtilSearchConfigurationError();

  const query = TavilyUtil.sanitizeSearchQuery(goal);

  if (query.length < 3) throw new TavilyUtilSearchInputError();

  const tavilyClient = tavily({ apiKey: currentApiKey });

  const response = await tavilyClient.search(query, TavilyUtil.searchOptions);

  const sources = response.results
    .filter((result) => TavilyUtil.isHttpUrl(result.url))
    .map((result) => {
      const { title: rawTitle, content: rawContent, url } = result;

      const title = rawTitle.replace(/\s+/g, ' ').trim().slice(0, 200);
      const snippet = rawContent.replace(/\s+/g, ' ').trim().slice(0, 500);

      return {
        title,
        url,
        snippet,
      };
    })
    .filter((source) => source.title.length > 0 && source.snippet.length > 0)
    .slice(0, AnalysisUtil.analysisRuntimeLimits.maxResearchResults);

  return reportSourcesSchema.parse(sources);
}
