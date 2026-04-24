import {z} from 'zod';

const optionalLoadFieldSchema = z
  .string()
  .trim()
  .max(12, 'Use um valor de carga mais curto.')
  .refine(value => value.length === 0 || /^\d+(?:[.,]\d+)?$/u.test(value), {
    message: 'Use apenas numeros para a carga.',
  });

export const workoutInputExerciseSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'Informe o nome do exercicio.').max(60),
  muscleGroup: z.string().trim().min(2, 'Escolha o tipo de serie.').max(40),
  baseLoad: z.string().trim().max(60),
  targetReps: z.string().trim().min(1, 'Informe a faixa de repeticoes.').max(20),
  note: z.string().trim().max(220),
});

export const workoutExerciseSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'Informe o nome do exercicio.').max(60),
  muscleGroup: z.string().trim().min(2, 'Escolha o tipo de serie.').max(40),
  baseLoadKg: optionalLoadFieldSchema,
  baseLoadPlates: optionalLoadFieldSchema,
  baseLoadLegacy: z.string().trim().max(60),
  targetReps: z.string().trim().min(1, 'Informe a faixa de repeticoes.').max(20),
  note: z.string().trim().max(220),
});

export const workoutInputSchema = z.object({
  name: z.string().trim().min(2, 'Informe um nome para o treino.').max(60),
  focus: z.string().trim().min(2, 'Escolha o foco do treino.').max(30),
  notes: z.string().trim().max(260),
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor invalida.'),
  scheduledDay: z.string().trim().max(20).nullable().optional(),
  exercises: z
    .array(workoutInputExerciseSchema)
    .min(1, 'Adicione pelo menos um exercicio.')
    .max(12, 'Limite de 12 exercicios por treino.'),
});

export const workoutFormSchema = z.object({
  name: z.string().trim().min(2, 'Informe um nome para o treino.').max(60),
  focus: z.string().trim().min(2, 'Escolha o foco do treino.').max(30),
  notes: z.string().trim().max(260),
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor invalida.'),
  scheduledDay: z.string().trim().max(20).nullable().optional(),
  exercises: z
    .array(workoutExerciseSchema)
    .min(1, 'Adicione pelo menos um exercicio.')
    .max(12, 'Limite de 12 exercicios por treino.'),
});

export const sessionSetInputSchema = z.object({
  load: z.number().finite().min(0).max(10000),
  reps: z.number().int().min(0).max(1000),
  note: z.string().trim().max(220),
});

export const trainingExerciseInputSchema = z.object({
  workoutExerciseId: z.string().trim().max(120),
  exerciseName: z.string().trim().min(1).max(80),
  muscleGroup: z.string().trim().min(1).max(40),
  sets: z.array(sessionSetInputSchema).min(1).max(20),
});

export const trainingSessionInputSchema = z.object({
  workoutId: z.string().trim().min(1).max(120),
  workoutName: z.string().trim().min(2).max(80),
  focus: z.string().trim().min(1).max(30),
  overallNotes: z.string().trim().max(1200),
  performedAt: z
    .string()
    .trim()
    .min(10)
    .max(40)
    .refine(value => !Number.isNaN(Date.parse(value)), 'Data da sessao invalida.'),
  exercises: z.array(trainingExerciseInputSchema).min(1).max(24),
});

export type WorkoutFormValues = z.infer<typeof workoutFormSchema>;
