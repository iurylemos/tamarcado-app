import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { collections } from '../../config/collections';
import { analysisRuntimeLimits } from '../../ai/services/limits.service';
import { runAnalysis } from '../../ai/services/runner.service';

export const processAnalysisCreated = onDocumentCreated(
  {
    document: `${collections.aiAnalysisExecutions}/{executionId}`,
    region: 'southamerica-east1',
    timeoutSeconds: analysisRuntimeLimits.workerTimeoutSeconds,
    maxInstances: 1,
    concurrency: 1,
    retry: true,
  },
  async (event) => {
    const outcome = await runAnalysis(event.params.executionId);
    // Throwing asks the platform to redeliver; the invocation cap bounds the retries.
    if (outcome === 'retry' || outcome === 'leased') {
      throw new Error(`ai_analysis_${outcome}`);
    }
  },
);
