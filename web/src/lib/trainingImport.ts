import type {User} from 'firebase/auth';
import {read, utils} from 'xlsx';
import {z} from 'zod';

import type {WorkoutDocument} from '../types';
import {
  importWorkoutsForUser,
  listAllSessionsForUser,
  listAllWorkoutsForUser,
} from './workouts';
import {
  buildTrainingTextExportContents,
  countTrainingTextExportSessions,
} from './trainingTextExport';

const weekdayOptions = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
];

const accentSpectrum = [
  '#FF3B30',
  '#FF9500',
  '#FFD60A',
  '#34C759',
  '#0A84FF',
  '#5856D6',
  '#AF52DE',
];

const setTypeOptions = [
  'Série de aquecimento',
  'Série preparatória',
  'Série de trabalho',
];

const workoutImportSchema = z.object({
  name: z.string().trim().min(2).max(60),
  focus: z.string().trim().min(1).max(30),
  notes: z.string().trim().max(260),
  accentColor: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/),
  scheduledDay: z.string().trim().max(20).nullable(),
  exercises: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(60),
        muscleGroup: z.string().trim().min(1).max(40),
        baseLoad: z.string().trim().max(60),
        targetReps: z.string().trim().min(1).max(20),
        note: z.string().trim().max(220),
      }),
    )
    .min(1)
    .max(12),
});

const TRAINING_IMPORT_SIZE_BYTES = 10 * 1024 * 1024;
const TRAINING_IMPORT_FILE_EXTENSION = /\.(txt|csv|xls|xlsx)$/iu;
const TRAINING_EXPORT_MIME_TYPE = 'text/plain;charset=utf-8';
const MAX_IMPORT_SHEETS = 12;
const MAX_IMPORT_ROWS_PER_SHEET = 2000;
const MAX_IMPORT_ROWS_TOTAL = 5000;
const MAX_IMPORTED_WORKOUTS = 100;
const MAX_IMPORTED_EXERCISES = 1200;
const DEFAULT_ACCENT_COLOR = accentSpectrum[3];
const DEFAULT_SERIES_TYPE = setTypeOptions[2];
const DEFAULT_REPS_RANGE = '8-12';

type CanonicalField =
  | 'workoutName'
  | 'focus'
  | 'scheduledDay'
  | 'accentColor'
  | 'notes'
  | 'exerciseName'
  | 'baseLoad'
  | 'targetReps'
  | 'exerciseNote'
  | 'muscleGroup';

type ExerciseSeed = {
  name: string;
  baseLoad?: string;
  targetReps?: string;
  note?: string;
  muscleGroup?: string;
};

type WorkoutSeed = {
  name: string;
  focus?: string;
  scheduledDay?: string | null;
  accentColor?: string;
  notes?: string;
  exercises: ExerciseSeed[];
};

type WorkoutRowDefaults = Partial<Omit<WorkoutSeed, 'exercises'>>;
type MappedRow = Partial<Record<CanonicalField, string>>;

export interface TrainingImportResult {
  fileName: string;
  workouts: number;
  exercises: number;
  skippedWorkouts: number;
}

export interface TrainingTextExportResult {
  fileName: string;
  workouts: number;
  exercises: number;
  sessions: number;
}

const fieldAliases: Record<CanonicalField, string[]> = {
  workoutName: ['treino', 'nomedotreino', 'nomeficha', 'workout', 'template', 'ficha'],
  focus: ['foco', 'divisao', 'agrupamento', 'agrupamentomuscular', 'grupo'],
  scheduledDay: ['dia', 'diasugerido', 'diadotreino', 'diasemana', 'weekday'],
  accentColor: ['cor', 'cordestaque', 'accentcolor', 'color'],
  notes: [
    'notasdotreino',
    'notatreino',
    'observacoesdotreino',
    'observacaotreino',
    'anotacoesdotreino',
    'anotacoesgerais',
    'notes',
  ],
  exerciseName: ['exercicio', 'nomeexercicio', 'movimento', 'exercise', 'exercicio1'],
  baseLoad: ['carga', 'peso', 'cargabase', 'cargainicial', 'baseload'],
  targetReps: [
    'repeticoes',
    'repeticao',
    'reps',
    'faixaderepeticoes',
    'faixadereps',
    'targetreps',
  ],
  exerciseNote: [
    'observacoes',
    'observacao',
    'obs',
    'notasexercicio',
    'notaexercicio',
    'anotacoes',
  ],
  muscleGroup: ['tipodeserie', 'serie', 'categoriadeserie', 'series', 'grupomuscular'],
};

const weekdayAliasMap: Record<string, string> = {
  seg: 'Segunda',
  segunda: 'Segunda',
  segundafeira: 'Segunda',
  monday: 'Segunda',
  mon: 'Segunda',
  ter: 'Terça',
  terca: 'Terça',
  tercafeira: 'Terça',
  tuesday: 'Terça',
  tue: 'Terça',
  qua: 'Quarta',
  quarta: 'Quarta',
  quartafeira: 'Quarta',
  wednesday: 'Quarta',
  wed: 'Quarta',
  qui: 'Quinta',
  quinta: 'Quinta',
  quintafeira: 'Quinta',
  thursday: 'Quinta',
  thu: 'Quinta',
  sex: 'Sexta',
  sexta: 'Sexta',
  sextafeira: 'Sexta',
  friday: 'Sexta',
  fri: 'Sexta',
  sab: 'Sábado',
  sabado: 'Sábado',
  saturday: 'Sábado',
  sat: 'Sábado',
  dom: 'Domingo',
  domingo: 'Domingo',
  sunday: 'Domingo',
  sun: 'Domingo',
  livre: '',
  nenhum: '',
};

const colorAliasMap: Record<string, string> = {
  vermelho: accentSpectrum[0],
  red: accentSpectrum[0],
  laranja: accentSpectrum[1],
  orange: accentSpectrum[1],
  amarelo: accentSpectrum[2],
  yellow: accentSpectrum[2],
  verde: accentSpectrum[3],
  green: accentSpectrum[3],
  azul: accentSpectrum[4],
  blue: accentSpectrum[4],
  anil: accentSpectrum[5],
  indigo: accentSpectrum[5],
  roxo: accentSpectrum[6],
  violeta: accentSpectrum[6],
  purple: accentSpectrum[6],
};

const normalizeKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const cleanText = (value: unknown) =>
  String(value ?? '')
    .replace(/\uFEFF/g, '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const clampText = (value: string, maxLength: number) => cleanText(value).slice(0, maxLength);

const stripExtension = (fileName: string) => fileName.replace(/\.[^.]+$/u, '').trim() || 'Treino importado';

const getTrainingTextExportFileName = () => {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

  return `loggym-treinos-${stamp}.txt`;
};

const triggerTextDownload = (fileName: string, contents: string) => {
  const blob = new Blob([contents], {type: TRAINING_EXPORT_MIME_TYPE});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  URL.revokeObjectURL(url);
};

const humanizeLabel = (value: string) =>
  cleanText(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const resolveField = (label: string): CanonicalField | null => {
  const normalized = normalizeKey(cleanText(label));

  if (!normalized) {
    return null;
  }

  for (const [field, aliases] of Object.entries(fieldAliases) as Array<[CanonicalField, string[]]>) {
    if (aliases.includes(normalized)) {
      return field;
    }
  }

  return null;
};

const appendText = (current: string | undefined, incoming: string) => {
  const next = cleanText(incoming);

  if (!next) {
    return current;
  }

  if (!current) {
    return next;
  }

  if (normalizeKey(current) === normalizeKey(next)) {
    return current;
  }

  return `${current} ${next}`.trim();
};

const normalizeRows = (rows: Array<Array<unknown>>) =>
  rows
    .map(row => {
      const cells = row.map(cell => cleanText(cell));

      while (cells.length > 0 && !cells.at(-1)) {
        cells.pop();
      }

      return cells;
    })
    .filter(row => row.some(Boolean));

const assertImportRowsWithinLimits = (rows: string[][], label: string) => {
  if (rows.length > MAX_IMPORT_ROWS_PER_SHEET) {
    throw new Error(
      `O arquivo excede o limite de ${MAX_IMPORT_ROWS_PER_SHEET} linhas para ${label}.`,
    );
  }
};

const findHeaderRowIndex = (rows: string[][]) => {
  for (const [index, row] of rows.entries()) {
    const resolved = row.map(cell => resolveField(cell)).filter((field): field is CanonicalField => field !== null);
    const unique = new Set(resolved);

    if (unique.size >= 2 && (unique.has('exerciseName') || unique.has('workoutName'))) {
      return index;
    }

    if (unique.size >= 3) {
      return index;
    }
  }

  return -1;
};

const buildHeaderMap = (headerRow: string[]) => headerRow.map(cell => resolveField(cell));

const mapRowByHeader = (row: string[], headerMap: Array<CanonicalField | null>) => {
  const mapped: MappedRow = {};

  headerMap.forEach((field, index) => {
    if (!field) {
      return;
    }

    const value = cleanText(row[index]);

    if (value) {
      mapped[field] = value;
    }
  });

  return mapped;
};

const extractDefaults = (rows: string[][], fallbackName: string): WorkoutRowDefaults => {
  const defaults: WorkoutRowDefaults = {name: fallbackName};

  for (const row of rows) {
    if (row.length < 2) {
      continue;
    }

    const field = resolveField(row[0]);
    const value = cleanText(row.slice(1).join(' '));

    if (!field || !value) {
      continue;
    }

    if (field === 'workoutName') {
      defaults.name = value;
      continue;
    }

    if (field === 'focus') {
      defaults.focus = value;
      continue;
    }

    if (field === 'scheduledDay') {
      defaults.scheduledDay = value;
      continue;
    }

    if (field === 'accentColor') {
      defaults.accentColor = value;
      continue;
    }

    if (field === 'notes') {
      defaults.notes = appendText(defaults.notes, value);
    }
  }

  return defaults;
};

const getWorkoutMapKey = (name: string, scheduledDay?: string | null) =>
  `${normalizeKey(name)}::${normalizeKey(scheduledDay ?? '')}`;

const getOrCreateWorkoutSeed = (
  store: Map<string, WorkoutSeed>,
  identity: WorkoutRowDefaults,
  fallbackName: string,
) => {
  const resolvedName = cleanText(identity.name) || fallbackName;
  const key = getWorkoutMapKey(resolvedName, identity.scheduledDay ?? null);
  const existing = store.get(key);

  if (existing) {
    existing.focus = existing.focus ?? identity.focus;
    existing.scheduledDay = existing.scheduledDay ?? identity.scheduledDay ?? null;
    existing.accentColor = existing.accentColor ?? identity.accentColor;
    existing.notes = appendText(existing.notes, identity.notes ?? '');
    return existing;
  }

  const created: WorkoutSeed = {
    name: resolvedName,
    focus: identity.focus,
    scheduledDay: identity.scheduledDay ?? null,
    accentColor: identity.accentColor,
    notes: identity.notes,
    exercises: [],
  };

  store.set(key, created);
  return created;
};

const parseTableWorkouts = (rows: string[][], fallbackName: string) => {
  const headerIndex = findHeaderRowIndex(rows);

  if (headerIndex === -1) {
    return [];
  }

  const defaults = extractDefaults(rows.slice(0, headerIndex), fallbackName);
  const headerMap = buildHeaderMap(rows[headerIndex]);
  const workouts = new Map<string, WorkoutSeed>();
  const rollingState: WorkoutRowDefaults = {
    name: defaults.name ?? fallbackName,
    focus: defaults.focus,
    scheduledDay: defaults.scheduledDay ?? null,
    accentColor: defaults.accentColor,
    notes: defaults.notes,
  };

  for (const row of rows.slice(headerIndex + 1)) {
    const mapped = mapRowByHeader(row, headerMap);

    if (mapped.workoutName) {
      rollingState.name = mapped.workoutName;
    }

    if (mapped.focus) {
      rollingState.focus = mapped.focus;
    }

    if (mapped.scheduledDay) {
      rollingState.scheduledDay = mapped.scheduledDay;
    }

    if (mapped.accentColor) {
      rollingState.accentColor = mapped.accentColor;
    }

    if (mapped.notes) {
      rollingState.notes = appendText(rollingState.notes, mapped.notes);
    }

    if (!mapped.exerciseName) {
      continue;
    }

    const workout = getOrCreateWorkoutSeed(workouts, rollingState, fallbackName);

    workout.exercises.push({
      name: mapped.exerciseName,
      baseLoad: mapped.baseLoad,
      targetReps: mapped.targetReps,
      note: mapped.exerciseNote,
      muscleGroup: mapped.muscleGroup,
    });
  }

  return Array.from(workouts.values());
};

const detectDelimiter = (lines: string[]) => {
  const candidates = ['\t', ';', '|', ','];
  let bestDelimiter: string | null = null;
  let bestScore = 0;

  for (const delimiter of candidates) {
    const score = lines.reduce((sum, line) => sum + line.split(delimiter).length - 1, 0);

    if (score > bestScore) {
      bestDelimiter = delimiter;
      bestScore = score;
    }
  }

  return bestScore > 0 ? bestDelimiter : null;
};

const parseDelimitedLine = (line: string, delimiter: string) => {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(cleanText(current));
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(cleanText(current));

  return cells;
};

const parseTableText = (text: string, fallbackName: string) => {
  const lines = text.split(/\r?\n/u).map(line => line.trim()).filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const delimiter = detectDelimiter(lines.slice(0, 8));

  if (!delimiter) {
    return [];
  }

  const rows = lines.map(line => parseDelimitedLine(line, delimiter));
  return parseTableWorkouts(rows, fallbackName);
};

const parseInlineExercise = (line: string): ExerciseSeed | null => {
  const isBulletLine = /^[-*]\s*/u.test(line);
  const trimmed = line.replace(/^[-*]\s*/u, '').trim();

  if (!trimmed) {
    return null;
  }

  const delimiter = trimmed.includes('|') ? '|' : trimmed.includes(';') ? ';' : null;

  if (!delimiter && !isBulletLine) {
    return null;
  }

  if (!delimiter) {
    return {name: trimmed};
  }

  const parts = parseDelimitedLine(trimmed, delimiter).filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  const parsed: ExerciseSeed = {name: ''};
  let fallbackIndex = 0;

  for (const part of parts) {
    const keyValueMatch = part.match(/^([^:=|-]+)\s*[:=-]\s*(.+)$/u);

    if (keyValueMatch) {
      const field = resolveField(keyValueMatch[1]);
      const value = cleanText(keyValueMatch[2]);

      if (field === 'exerciseName') {
        parsed.name = value;
        continue;
      }

      if (field === 'baseLoad') {
        parsed.baseLoad = value;
        continue;
      }

      if (field === 'targetReps') {
        parsed.targetReps = value;
        continue;
      }

      if (field === 'exerciseNote') {
        parsed.note = appendText(parsed.note, value);
        continue;
      }

      if (field === 'muscleGroup') {
        parsed.muscleGroup = value;
        continue;
      }
    }

    if (!parsed.name) {
      parsed.name = part;
      continue;
    }

    if (fallbackIndex === 0) {
      parsed.baseLoad = part;
    } else if (fallbackIndex === 1) {
      parsed.targetReps = part;
    } else {
      parsed.note = appendText(parsed.note, part);
    }

    fallbackIndex += 1;
  }

  return parsed.name ? parsed : null;
};

const hasMeaningfulWorkout = (workout: WorkoutSeed | null) =>
  Boolean(
    workout &&
      (cleanText(workout.focus ?? '') ||
        cleanText(workout.scheduledDay ?? '') ||
        cleanText(workout.accentColor ?? '') ||
        cleanText(workout.notes ?? '') ||
        workout.exercises.length > 0),
  );

const parseStructuredText = (text: string, fallbackName: string) => {
  const workouts: WorkoutSeed[] = [];
  const lines = text.split(/\r?\n/u).map(line => line.trim());
  let currentWorkout: WorkoutSeed | null = null;
  let currentExercise: ExerciseSeed | null = null;

  const ensureWorkout = () => {
    if (!currentWorkout) {
      currentWorkout = {
        name: fallbackName,
        exercises: [],
      };
    }

    return currentWorkout;
  };

  const flushExercise = () => {
    if (currentExercise?.name) {
      ensureWorkout().exercises.push(currentExercise);
    }

    currentExercise = null;
  };

  const flushWorkout = () => {
    flushExercise();

    if (hasMeaningfulWorkout(currentWorkout)) {
      workouts.push(currentWorkout as WorkoutSeed);
    }

    currentWorkout = null;
  };

  for (const line of lines) {
    if (!line) {
      continue;
    }

    if (/^---+$|^#{2,}$/u.test(line)) {
      flushWorkout();
      continue;
    }

    const keyValueMatch = line.match(/^([^:=|-]+)\s*[:=-]\s*(.+)$/u);

    if (keyValueMatch) {
      const field = resolveField(keyValueMatch[1]);
      const value = cleanText(keyValueMatch[2]);

      if (!field || !value) {
        continue;
      }

      if (field === 'workoutName') {
        if (hasMeaningfulWorkout(currentWorkout)) {
          flushWorkout();
        }

        currentWorkout = {
          name: value,
          exercises: [],
        };
        continue;
      }

      if (field === 'focus') {
        ensureWorkout().focus = value;
        continue;
      }

      if (field === 'scheduledDay') {
        ensureWorkout().scheduledDay = value;
        continue;
      }

      if (field === 'accentColor') {
        ensureWorkout().accentColor = value;
        continue;
      }

      if (field === 'notes') {
        ensureWorkout().notes = appendText(ensureWorkout().notes, value);
        continue;
      }

      if (field === 'exerciseName') {
        flushExercise();
        currentExercise = {name: value};
        continue;
      }

      if (field === 'baseLoad') {
        currentExercise = currentExercise ?? {name: ''};
        currentExercise.baseLoad = value;
        continue;
      }

      if (field === 'targetReps') {
        currentExercise = currentExercise ?? {name: ''};
        currentExercise.targetReps = value;
        continue;
      }

      if (field === 'muscleGroup') {
        currentExercise = currentExercise ?? {name: ''};
        currentExercise.muscleGroup = value;
        continue;
      }

      if (field === 'exerciseNote') {
        if (currentExercise) {
          currentExercise.note = appendText(currentExercise.note, value);
        } else {
          ensureWorkout().notes = appendText(ensureWorkout().notes, value);
        }
      }

      continue;
    }

    const inlineExercise = parseInlineExercise(line);

    if (inlineExercise?.name) {
      flushExercise();
      currentExercise = inlineExercise;
      continue;
    }

    if (currentExercise) {
      currentExercise.note = appendText(currentExercise.note, line);
      continue;
    }

    ensureWorkout().notes = appendText(ensureWorkout().notes, line);
  }

  flushWorkout();

  return workouts;
};

const inferFocusFromName = (name: string) => {
  const normalized = normalizeKey(name);

  if (!normalized) {
    return 'Treino';
  }

  if (normalized.includes('peito')) return 'Peito';
  if (normalized.includes('costa')) return 'Costas';
  if (normalized.includes('ombro')) return 'Ombro';
  if (normalized.includes('perna') || normalized.includes('legs')) return 'Pernas';
  if (normalized.includes('braco') || normalized.includes('biceps')) return 'Bracos';
  if (normalized.includes('triceps')) return 'Triceps';
  if (normalized.includes('gluteo')) return 'Gluteos';
  if (normalized.includes('push')) return 'Push';
  if (normalized.includes('pull')) return 'Pull';
  if (normalized.includes('upper')) return 'Upper';
  if (normalized.includes('lower')) return 'Lower';

  return clampText(name, 30) || 'Treino';
};

const resolveScheduledDay = (value?: string | null) => {
  const normalized = normalizeKey(cleanText(value ?? ''));

  if (!normalized) {
    return null;
  }

  const mappedDay = weekdayAliasMap[normalized];

  if (mappedDay === '') {
    return null;
  }

  if (mappedDay) {
    return mappedDay;
  }

  return weekdayOptions.find(day => normalizeKey(day) === normalized) ?? null;
};

const resolveAccentColor = (value?: string) => {
  const cleanValue = cleanText(value ?? '');

  if (/^#[0-9A-Fa-f]{6}$/u.test(cleanValue)) {
    return cleanValue.toUpperCase();
  }

  return colorAliasMap[normalizeKey(cleanValue)] ?? DEFAULT_ACCENT_COLOR;
};

const resolveSeriesType = (value?: string) => {
  const normalized = normalizeKey(cleanText(value ?? ''));

  if (!normalized) {
    return DEFAULT_SERIES_TYPE;
  }

  if (normalized.includes('aquec') || normalized.includes('warmup') || normalized.includes('warm')) {
    return setTypeOptions[0];
  }

  if (normalized.includes('prepar')) {
    return setTypeOptions[1];
  }

  return setTypeOptions[2];
};

const sanitizeWorkoutSeeds = (user: User, workouts: WorkoutSeed[], fallbackName: string) => {
  const consolidated = new Map<string, WorkoutSeed>();

  for (const workout of workouts) {
    const resolvedName = clampText(workout.name || fallbackName, 60) || fallbackName;
    const resolvedDay = resolveScheduledDay(workout.scheduledDay);
    const key = getWorkoutMapKey(resolvedName, resolvedDay);
    const current = consolidated.get(key);

    if (!current) {
      consolidated.set(key, {
        name: resolvedName,
        focus: workout.focus,
        scheduledDay: resolvedDay,
        accentColor: workout.accentColor,
        notes: workout.notes,
        exercises: [...workout.exercises],
      });
      continue;
    }

    current.focus = current.focus ?? workout.focus;
    current.scheduledDay = current.scheduledDay ?? resolvedDay;
    current.accentColor = current.accentColor ?? workout.accentColor;
    current.notes = appendText(current.notes, workout.notes ?? '');
    current.exercises.push(...workout.exercises);
  }

  let skippedWorkouts = 0;
  const validWorkouts: WorkoutDocument[] = [];

  for (const workout of consolidated.values()) {
    const exercises = workout.exercises
      .map((exercise, index) => ({
        id: crypto.randomUUID(),
        name: clampText(exercise.name, 60),
        muscleGroup: resolveSeriesType(exercise.muscleGroup),
        baseLoad: clampText(exercise.baseLoad ?? '', 60),
        targetReps: clampText(exercise.targetReps || DEFAULT_REPS_RANGE, 20),
        note: clampText(exercise.note ?? '', 220),
        orderIndex: index,
      }))
      .filter(exercise => exercise.name.length >= 2)
      .slice(0, 12);

    const now = new Date().toISOString();
    const candidate = workoutImportSchema.safeParse({
      name: clampText(workout.name || fallbackName, 60),
      focus: clampText(workout.focus || inferFocusFromName(workout.name), 30),
      notes: clampText(workout.notes ?? '', 260),
      accentColor: resolveAccentColor(workout.accentColor),
      scheduledDay: resolveScheduledDay(workout.scheduledDay),
      exercises,
    });

    if (!candidate.success) {
      skippedWorkouts += 1;
      continue;
    }

    validWorkouts.push({
      id: crypto.randomUUID(),
      userId: user.uid,
      name: candidate.data.name,
      focus: candidate.data.focus,
      notes: candidate.data.notes,
      accentColor: candidate.data.accentColor,
      scheduledDay: candidate.data.scheduledDay,
      exercises,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (validWorkouts.length === 0) {
    throw new Error(
      'Não encontrei um treino válido nesse arquivo. Use colunas como Treino, Exercício, Carga e Repetições ou um TXT com blocos iniciados por "Treino:".',
    );
  }

  const totalExercises = validWorkouts.reduce(
    (sum, workout) => sum + workout.exercises.length,
    0,
  );

  if (validWorkouts.length > MAX_IMPORTED_WORKOUTS) {
    throw new Error(
      `O arquivo excede o limite de ${MAX_IMPORTED_WORKOUTS} treinos por importacao.`,
    );
  }

  if (totalExercises > MAX_IMPORTED_EXERCISES) {
    throw new Error(
      `O arquivo excede o limite de ${MAX_IMPORTED_EXERCISES} exercícios por importação.`,
    );
  }

  return {
    workouts: validWorkouts,
    skippedWorkouts,
    exercises: totalExercises,
  };
};

const parseSpreadsheetWorkouts = (contents: ArrayBuffer, fallbackName: string) => {
  const workbook = read(contents, {type: 'array'});
  const collected: WorkoutSeed[] = [];
  let totalRows = 0;

  if (workbook.SheetNames.length > MAX_IMPORT_SHEETS) {
    throw new Error(`O arquivo excede o limite de ${MAX_IMPORT_SHEETS} abas.`);
  }

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      continue;
    }

    const rows = normalizeRows(
      utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        blankrows: false,
      }) as Array<Array<unknown>>,
    );
    assertImportRowsWithinLimits(rows, `a aba ${sheetName}`);
    totalRows += rows.length;

    if (totalRows > MAX_IMPORT_ROWS_TOTAL) {
      throw new Error(`O arquivo excede o limite de ${MAX_IMPORT_ROWS_TOTAL} linhas totais.`);
    }

    const sheetFallbackName = humanizeLabel(sheetName) || fallbackName;
    const parsedTable = parseTableWorkouts(rows, sheetFallbackName);

    if (parsedTable.length > 0) {
      collected.push(...parsedTable);
      continue;
    }

    const structuredText = rows.map(row => row.join(' | ')).join('\n');
    collected.push(...parseStructuredText(structuredText, sheetFallbackName));
  }

  return collected;
};

const parseTextWorkouts = (contents: string, fallbackName: string) => {
  const normalized = contents.replace(/\r\n/g, '\n');
  const lineCount = normalized.split(/\r?\n/u).filter(Boolean).length;

  if (lineCount > MAX_IMPORT_ROWS_TOTAL) {
    throw new Error(`O arquivo excede o limite de ${MAX_IMPORT_ROWS_TOTAL} linhas totais.`);
  }

  const parsedTable = parseTableText(normalized, fallbackName);

  if (parsedTable.length > 0) {
    return parsedTable;
  }

  return parseStructuredText(normalized, fallbackName);
};

export const importTrainingFileForCurrentUser = async (
  user: User,
  file: File,
): Promise<TrainingImportResult> => {
  if (file.size > TRAINING_IMPORT_SIZE_BYTES) {
    throw new Error('O arquivo excede o limite de 10 MB e não pode ser importado.');
  }

  if (!TRAINING_IMPORT_FILE_EXTENSION.test(file.name)) {
    throw new Error('Use apenas arquivos .txt, .csv, .xls ou .xlsx para importar treinos.');
  }

  const fallbackName = humanizeLabel(stripExtension(file.name));
  const parsedWorkouts = /\.(xls|xlsx)$/iu.test(file.name)
    ? parseSpreadsheetWorkouts(await file.arrayBuffer(), fallbackName)
    : parseTextWorkouts(await file.text(), fallbackName);
  const sanitized = sanitizeWorkoutSeeds(user, parsedWorkouts, fallbackName);

  await importWorkoutsForUser(user, sanitized.workouts);

  return {
    fileName: file.name,
    workouts: sanitized.workouts.length,
    exercises: sanitized.exercises,
    skippedWorkouts: sanitized.skippedWorkouts,
  };
};

export const exportTrainingTextForCurrentUser = async (
  user: User,
): Promise<TrainingTextExportResult> => {
  const [workouts, sessions] = await Promise.all([
    listAllWorkoutsForUser(user.uid),
    listAllSessionsForUser(user.uid),
  ]);
  const exportableWorkouts = workouts.filter(workout => workout.exercises.length > 0);
  const contents = buildTrainingTextExportContents(exportableWorkouts, sessions);
  const exportedSessions = countTrainingTextExportSessions(exportableWorkouts, sessions);
  const fileName = getTrainingTextExportFileName();

  triggerTextDownload(fileName, contents);

  return {
    fileName,
    workouts: exportableWorkouts.length,
    exercises: exportableWorkouts.reduce(
      (sum, workout) => sum + workout.exercises.length,
      0,
    ),
    sessions: exportedSessions,
  };
};
