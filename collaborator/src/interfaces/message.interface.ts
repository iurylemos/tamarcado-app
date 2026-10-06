export interface MessageConnection {
  id: string;
  provider: string;
  status: string;
}

export type MessageUnsubscribe = () => void;
