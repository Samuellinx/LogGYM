const {readFileSync} = require('fs');
const path = require('path');

const rules = readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');

const getFunctionBody = functionName => {
  const marker = `function ${functionName}`;
  const start = rules.indexOf(marker);

  if (start === -1) {
    return '';
  }

  const nextFunction = rules.indexOf('\n    function ', start + marker.length);

  return rules.slice(start, nextFunction === -1 ? undefined : nextFunction);
};

describe('firestore rules', () => {
  it('allows saved workout sessions to include the finalization timestamp', () => {
    const sessionRule = getFunctionBody('isWorkoutSessionDocument');

    expect(sessionRule).toContain("'finishedAt'");
    expect(sessionRule).toContain("!data.keys().hasAny(['finishedAt'])");
    expect(sessionRule).toContain(
      '|| isTimestampText(data.finishedAt))',
    );
  });
});
