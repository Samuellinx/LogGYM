import {
  workoutDocumentSchema as sharedWorkoutDocumentSchema,
  workoutSessionDocumentSchema as sharedWorkoutSessionDocumentSchema,
} from '@/shared/firestoreDocuments';
import {
  workoutDocumentSchema as webWorkoutDocumentSchema,
  workoutSessionDocumentSchema as webWorkoutSessionDocumentSchema,
} from '../web/src/lib/documentSchemas';

describe('shared firestore contracts', () => {
  it('keeps web document validation wired to the shared schemas', () => {
    expect(webWorkoutDocumentSchema).toBe(sharedWorkoutDocumentSchema);
    expect(webWorkoutSessionDocumentSchema).toBe(sharedWorkoutSessionDocumentSchema);
  });
});
