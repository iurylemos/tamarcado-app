import {
  type FirestoreEvent,
  type QueryDocumentSnapshot,
  onDocumentCreated,
} from 'firebase-functions/v2/firestore';
import { collections } from '../../config/collections';
import { AnalysisUtil } from '../../ai/utils/analysis.util';
import { openRouterApiKey, tavilyApiKey } from '../../ai/config/analysis.secrets';
import { runAnalysis } from '../../ai/services/runner.service';
import { EventContext } from 'firebase-functions/v1';

type EventAnalysis = FirestoreEvent<
  QueryDocumentSnapshot | undefined,
  {
    executionId: string;
  }
> & {
  snapshot: QueryDocumentSnapshot;
} & {
  context: EventContext<Record<string, string>>;
};

export const processAnalysisCreated = onDocumentCreated(
  {
    document: `${collections.aiAnalysisExecutions}/{executionId}`,
    region: 'southamerica-east1',
    timeoutSeconds: AnalysisUtil.analysisRuntimeLimits.workerTimeoutSeconds,
    maxInstances: 1,
    concurrency: 1,
    retry: true,
    secrets: [openRouterApiKey, tavilyApiKey],
  },
  async (event: EventAnalysis): Promise<void> => {
    const outcome = await runAnalysis(event.params.executionId);

    if (outcome === 'retry' || outcome === 'leased') {
      throw new Error(`ai_analysis_${outcome}`);
    }
  },
);
