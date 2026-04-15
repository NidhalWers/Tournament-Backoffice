function computeTopScorers(tournamentId) {
  const goals = getSheetData("Goals");

  const scorers = {};

  goals
    .filter(g => String(g.tournamentId) === String(tournamentId))
    .forEach(g => {
      const key = g.playerName + "_" + g.teamName;

      if (!scorers[key]) {
        scorers[key] = {
          player: g.playerName,
          team: g.teamName,
          goals: 0
        };
      }

      scorers[key].goals++;
    });

  return Object.values(scorers)
    .sort((a, b) => b.goals - a.goals);
}
