export type InputCollaboratorAccount = {
  professionalId: string;
  email: string;
  password?: string;
};

export type InputResetCollaborator = {
  professionalId: string;
  password: string;
};

export type CollaboratorAccountData = {
  uid: string;
  email: string;
};

export type GenericAdmin = {
  id: string;
  deleted: boolean;
  saved: boolean;
};
