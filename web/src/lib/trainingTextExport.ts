const DEFAULT_ACCENT_COLOR = '#34C759';

export type ExportableWorkoutExercise = {
  name: string;
  muscleGroup: string;
  baseLoad: string;
  targetReps: string;
  note: string;
  orderIndex?: number;
};

export type ExportableWorkout = {
  name: string;
  focus: string;
  scheduledDay?: string | null;
  accentColor: string;
  notes: string;
  exercises: ExportableWorkoutExercise[];
};

const cleanText = (value: unknown) =>
  String(value ?? '')
    .replace(/\uFEFF/g, '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const buildTrainingTextExportContents = (
  workouts: ExportableWorkout[],
) => {
  const exportableWorkouts = workouts.filter(workout => workout.exercises.length > 0);

  if (exportableWorkouts.length === 0) {
    throw new Error('Não há treinos ativos com exercícios para exportar em TXT.');
  }

  const sections = exportableWorkouts.map(workout => {
    const lines = [
      `Treino: ${cleanText(workout.name) || 'Treino importado'}`,
      `Foco: ${cleanText(workout.focus) || 'Treino'}`,
      `Dia: ${cleanText(workout.scheduledDay) || 'Livre'}`,
      `Cor: ${cleanText(workout.accentColor) || DEFAULT_ACCENT_COLOR}`,
    ];

    const workoutNotes = cleanText(workout.notes);

    if (workoutNotes) {
      lines.push(`Observações do treino: ${workoutNotes}`);
    }

    const exercises = [...workout.exercises].sort(
      (left, right) => Number(left.orderIndex ?? 0) - Number(right.orderIndex ?? 0),
    );

    exercises.forEach(exercise => {
      lines.push('', `Exercício: ${cleanText(exercise.name)}`);

      const muscleGroup = cleanText(exercise.muscleGroup);
      const baseLoad = cleanText(exercise.baseLoad);
      const targetReps = cleanText(exercise.targetReps);
      const note = cleanText(exercise.note);

      if (muscleGroup) {
        lines.push(`Tipo de série: ${muscleGroup}`);
      }

      if (baseLoad) {
        lines.push(`Carga: ${baseLoad}`);
      }

      if (targetReps) {
        lines.push(`Repetições: ${targetReps}`);
      }

      if (note) {
        lines.push(`Observações: ${note}`);
      }
    });

    return lines.join('\n');
  });

  return `${sections.join('\n\n---\n\n')}\n`;
};
