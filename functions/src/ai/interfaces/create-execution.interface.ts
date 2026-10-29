import type {
  AnalysisExecutionDocument,
  AnalysisRequestSnapshot,
} from '../../model/ai-analysis.model';
import { Timestamp } from 'firebase-admin/firestore';

export interface CreateExecutionInput {
  tenantId: string;
  requesterUid: string;
  idempotencyKey: string;
  request: AnalysisRequestSnapshot;
}

export interface CreatedExecution {
  executionId: string;
  status: AnalysisExecutionDocument['status'];
  createdAt: Timestamp;
  created: boolean;
}
