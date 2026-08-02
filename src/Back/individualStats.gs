function computeTopScorers(tournamentId) {
  const goals = getSheetData("Goals");

  const teamIdByName = getTeamsIdByName(); 
  const teamStage = computeTeamsRank(tournamentId, teamIdByName);

  const scorers = {};
  goals
    .filter(g => String(g.tournamentId) === String(tournamentId))
    .forEach(g => {
      const playerName = normalizePlayerName(g.playerName);
      if (!playerName) {
        return;
      }

      const key = JSON.stringify([getPlayerNameKey(playerName), String(g.teamName)]);

      const teamId = teamIdByName[g.teamName];

      if (!scorers[key]) {
        scorers[key] = {
          player: playerName,
          team: g.teamName,
          goals: 0,
          stageRank: teamStage[teamId] || 0
        };
      }

      scorers[key].goals++;
      scorers[key].stageRank = Math.max(scorers[key].stageRank, teamStage[teamId] || 0);
    });

  return Object.values(scorers)
    .sort((a, b) => 
      b.goals - a.goals ||
      b.stageRank - a.stageRank
    );
}

function computeTeamsRank(tournamentId, teamIdByName){
  const matches = getSheetData("Matches");

  const stageRank = {
    GROUP: 0,
    QF: 1,
    SF: 2,
    FINAL: 3
  };

  const teamStage = {};

  matches
    .filter(m => String(m.tournamentId) === String(tournamentId))
    .forEach(m => {

      const rank = stageRank[m.stage] || 0;

      let teamAId = m.teamA;
      let teamBId = m.teamB;

      // Group-stage matches contain IDs,
      // while knockout matches currently contain names.
      if (teamIdByName[teamAId]) {
        teamAId = teamIdByName[teamAId];
      }

      if (teamIdByName[teamBId]) {
        teamBId = teamIdByName[teamBId];
      }

      if (teamAId) {
        teamStage[teamAId] = Math.max(teamStage[teamAId] || 0, rank);
      }

      if (teamBId) {
        teamStage[teamBId] = Math.max(teamStage[teamBId] || 0, rank);
      }

      // Bonus: tournament winner
      if (m.stage === "FINAL" && m.played) {

        let winner = null;

        if (Number(m.scoreA) > Number(m.scoreB)) {
          winner = teamAId;
        }
        else if (Number(m.scoreB) > Number(m.scoreA)) {
          winner = teamBId;
        }
        else {
          // Draw -> penalty shootout winner
          if (m.penaltyWinner === "A") {
            winner = teamAId;
          }
          else if (m.penaltyWinner === "B") {
            winner = teamBId;
          }
        }

        if (winner) {
          teamStage[winner] = 4;
        }
      }
    });

    return teamStage;
}
