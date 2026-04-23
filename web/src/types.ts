export type AuthMode = 'signin' | 'signup' | 'forgot';

export type WorkoutExerciseInput = {
  id: string;
  name: string;
  muscleGroup: string;
  baseLoad: string;
  targetReps: string;
  note: string;
  orderIndex: number;
};

export type WorkoutDocument = {
  id: string;
  userId: string;
  name: string;
  focus: string;
  notes: string;
  accentColor: string;
  scheduledDay: string | null;
  exercises: WorkoutExerciseInput[];
  createdAt: string;
  updatedAt: string;
};

export type WorkoutSessionDocument = {
  id: string;
  userId: string;
  workoutId: string | null;
  workoutName: string;
  focus: string;
  overallNotes: string;
  performedAt: string;
  createdAt: string;
  totalSets: number;
  totalVolume: number;
  topLoad: number;
};
