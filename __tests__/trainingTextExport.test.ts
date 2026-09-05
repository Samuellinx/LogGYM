import {
  buildTrainingTextExportContents as buildMobileTrainingTextExportContents,
} from '@/features/imports/trainingTextExport';
import {
  buildTrainingTextExportContents as buildWebTrainingTextExportContents,
} from '../web/src/lib/trainingTextExport';

const workout = {
  name: 'Peito 1',
  focus: 'Peito',
  scheduledDay: 'Segunda',
  accentColor: '#0A84FF',
  notes: 'Priorizar controle de movimento.',
  sessions: [
    {
      performedAt: '2026-05-05T21:37:00',
      finishedAt: '2026-05-05T22:25:00',
      createdAt: '2026-05-05T22:25:00',
      exercises: [
        {
          exerciseName: 'Supino reto',
          muscleGroup: 'Série de trabalho',
          sets: [
            {load: 62.5, reps: 8, note: ''},
            {load: 2, loadLabel: '2 placas', reps: 9, note: 'Última repetição travou.'},
          ],
        },
      ],
    },
  ],
  exercises: [
    {
      name: 'Supino reto',
      muscleGroup: 'Série de trabalho',
      baseLoad: '60',
      targetReps: '8-10',
      note: 'Controlar a descida.',
      orderIndex: 0,
    },
    {
      name: 'Crucifixo',
      muscleGroup: 'Série preparatória',
      baseLoad: '12',
      targetReps: '10-12',
      note: '',
      orderIndex: 1,
    },
  ],
};

const secondWorkout = {
  name: 'Pernas 1',
  focus: 'Pernas',
  scheduledDay: null,
  accentColor: '#34C759',
  notes: '',
  exercises: [
    {
      name: 'Agachamento',
      muscleGroup: 'Série de trabalho',
      baseLoad: '80',
      targetReps: '6-8',
      note: '',
      orderIndex: 0,
    },
  ],
};

describe('training text export', () => {
  it('generates the same readable TXT format on mobile and web', () => {
    const mobileContents = buildMobileTrainingTextExportContents([
      workout,
      secondWorkout,
    ]);
    const webContents = buildWebTrainingTextExportContents([workout, secondWorkout]);

    expect(webContents).toBe(mobileContents);
    expect(webContents).toContain('Treino: Peito 1');
    expect(webContents).toContain('Foco: Peito');
    expect(webContents).toContain('Dia: Segunda');
    expect(webContents).toContain('Cor: #0A84FF');
    expect(webContents).toContain('Observações do treino: Priorizar controle de movimento.');
    expect(webContents).toContain('Exercício: Supino reto');
    expect(webContents).toContain('Tipo de série: Série de trabalho');
    expect(webContents).toContain('Carga: 60');
    expect(webContents).toContain('Repetições: 8-10');
    expect(webContents).toContain('Observações: Controlar a descida.');
    expect(webContents).toContain('Histórico realizado: 1 treino anterior');
    expect(webContents).toContain('Data do treino realizado: 05/05/2026 22:25');
    expect(webContents).toContain('Exercício realizado: Supino reto');
    expect(webContents).toContain('Série realizada 1: carga 62.5, repetições 8');
    expect(webContents).toContain('Série realizada 2: carga 2 placas, repetições 9');
    expect(webContents).toContain('Anotação realizada 2: Última repetição travou.');
    expect(webContents).toContain('---');
    expect(webContents).toContain('Treino: Pernas 1');
    expect(webContents).not.toContain('undefined');
    expect(webContents).not.toContain('[object Object]');
  });
});
