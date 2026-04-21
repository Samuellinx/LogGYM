import {z} from 'zod';

export const workoutExerciseSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'Informe o nome do exercicio.').max(60),
  muscleGroup: z.string().trim().min(2, 'Escolha o tipo de serie.').max(40),
  baseLoad: z.string().trim().max(60),
  targetReps: z.string().trim().min(1, 'Informe a faixa de repeticoes.').max(20),
  note: z.string().trim().max(220),
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

export type WorkoutFormValues = z.infer<typeof workoutFormSchema>;
