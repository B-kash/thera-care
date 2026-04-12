export type ProgressRecordPatient = {
  id: string;
  firstName: string;
  lastName: string;
};

export type ProgressRecordAuthor = {
  id: string;
  displayName: string | null;
  email: string;
};

export type ProgressRecord = {
  id: string;
  patientId: string;
  authorUserId: string;
  painLevel: number;
  mobilityScore: number | null;
  notes: string | null;
  recordedOn: string;
  createdAt: string;
  updatedAt: string;
  patient: ProgressRecordPatient;
  author: ProgressRecordAuthor;
};
