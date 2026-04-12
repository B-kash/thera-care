export type ExercisePlanPatient = {
  id: string;
  firstName: string;
  lastName: string;
};

export type ExercisePlanAuthor = {
  id: string;
  displayName: string | null;
  email: string;
};

export type ExerciseItem = {
  id: string;
  exercisePlanId: string;
  name: string;
  instructions: string | null;
  sets: number | null;
  reps: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ExercisePlanList = {
  id: string;
  patientId: string;
  authorUserId: string;
  title: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  patient: ExercisePlanPatient;
  author: ExercisePlanAuthor;
  _count: { items: number };
};

export type ExercisePlanDetail = {
  id: string;
  patientId: string;
  authorUserId: string;
  title: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  patient: ExercisePlanPatient;
  author: ExercisePlanAuthor;
  items: ExerciseItem[];
};
