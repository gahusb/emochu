export function liveCourseOptions(args) {
  let profile = 'default', batch = '', rest = args;
  if (rest[0] === '--festival') { profile = 'festival'; rest = rest.slice(1); }
  else if (rest[0] === '--matrix') {
    if (!/^[1-8]$/.test(rest[1] ?? '')) throw new Error('MATRIX_BATCH_REQUIRED_1_TO_8');
    profile = 'matrix'; batch = rest[1]; rest = rest.slice(2);
  }
  let replay = '';
  if (profile === 'matrix' && rest.length === 1 && rest[0] === '--rules') return { profile, batch, replay, rulesOnly: true };
  if (rest.length) {
    if (rest[0] !== '--replay' || rest.length !== 2 || !/^report-[0-9TZ.-]+\.json$/.test(rest[1])) throw new Error('LIVE_ARGUMENTS_INVALID');
    replay = rest[1];
  }
  return { profile, batch, replay };
}

export const canSendProbeAi = (totalCalls, caseCalls, matrix, rateLimited = false) => !rateLimited && totalCalls < 3 && (!matrix || caseCalls < 1);
