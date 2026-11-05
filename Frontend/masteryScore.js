/* The 0-100 topic score and the percentages built from it (tested in masteryScore.test.js).

   score = 70% recent accuracy + 20% difficulty performance + 10% consistency (answer streak), over the last five answers.

   A score is always worked out from the answer history rather than read back from the saved one, and every percentage shown
   is a whole number from 0 to 100, so a bad value in a saved record (a string, a number out of range, a missing difficulty)
   can never reach the screen as "46768%". */
export const DIFF_WEIGHT = { Easy: 50, Medium: 75, Hard: 100 };

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/* A whole number from 0 to 100, or 0 for anything that is not a number. */
export const percent = (n) => (Number.isFinite(Number(n)) && n !== null && n !== "" ? clamp(Math.round(Number(n)), 0, 100) : 0);

export function computeTopicScore(history) {
  const answers = Array.isArray(history) ? history.filter((h) => h && typeof h === "object") : [];
  if (!answers.length) return null;
  const recent = answers.slice(-5);
  const recentAccuracy = (recent.filter((h) => h.correct).length / recent.length) * 100;
  // An exercise with no (or an unknown) difficulty counts as Medium instead of turning the whole score into NaN.
  const weight = (h) => (Object.hasOwn(DIFF_WEIGHT, h.difficulty) ? DIFF_WEIGHT[h.difficulty] : DIFF_WEIGHT.Medium);
  const difficultyScore = recent.reduce((sum, h) => sum + (h.correct ? weight(h) : weight(h) * 0.2), 0) / recent.length;
  let streak = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    const dir = recent[i].correct ? 1 : -1;
    if (streak === 0 || Math.sign(streak) === dir) streak += dir; else break;
  }
  const consistencyScore = clamp(50 + streak * 17, 0, 100);
  return Math.round(recentAccuracy * 0.70 + difficultyScore * 0.20 + consistencyScore * 0.10);
}

/* The score of one saved topic record ({ history, score, lastPracticedAt }), or null when it has not been assessed. The history
   decides; a record with no history falls back to its saved score, as a number from 0 to 100. */
export function topicScoreOf(rec) {
  if (!rec || typeof rec !== "object") return null;
  const fromHistory = computeTopicScore(rec.history);
  if (fromHistory != null) return fromHistory;
  const saved = rec.score;
  return saved === null || saved === undefined || saved === "" || !Number.isFinite(Number(saved)) ? null : percent(saved);
}
