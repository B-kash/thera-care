export type TreatmentNotePatient = {
  id: string;
  firstName: string;
  lastName: string;
};

export type TreatmentNoteAuthor = {
  id: string;
  displayName: string | null;
  email: string;
};

export type TreatmentNoteAppointment = {
  id: string;
  startsAt: string;
  endsAt: string;
};

export type TreatmentNote = {
  id: string;
  patientId: string;
  authorUserId: string;
  appointmentId: string | null;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  createdAt: string;
  updatedAt: string;
  patient: TreatmentNotePatient;
  author: TreatmentNoteAuthor;
  appointment: TreatmentNoteAppointment | null;
};
