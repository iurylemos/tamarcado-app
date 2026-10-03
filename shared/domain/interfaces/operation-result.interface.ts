export type OperationResult<T> =
  | { state: 'loading' }
  | { state: 'empty' }
  | { state: 'success'; data: T }
  | { state: 'validation-error'; message: string; fieldErrors?: Record<string, string> }
  | { state: 'authorization-error'; message: string }
  | { state: 'conflict'; message: string }
  | { state: 'error'; message: string; retryable: boolean };

export type OperationResultData = {
  message: string;
  retryable: boolean;
};
