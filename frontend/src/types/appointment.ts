export type AppointmentPatient = {
  id: string;
  firstName: string;
  lastName: string;
};

export type AppointmentStaff = {
  id: string;
  displayName: string | null;
  email: string;
};

export type Appointment = {
  id: string;
  patientId: string;
  staffUserId: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  patient: AppointmentPatient;
  staffUser: AppointmentStaff | null;
};
