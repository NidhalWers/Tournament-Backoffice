function getAggregateStandings(startDate, endDate) {
  const tournaments = getSheetData("Tournaments");
  const teams = getSheetData("Teams");
  const tournamentTeams = getSheetData("TournamentTeams");
  const matches = getSheetData("Matches");
  const dateRange = getAggregateDateRange(startDate, endDate);

  const completedTournaments = tournaments.filter(tournament =>
    isTournamentFinished(tournament, matches) &&
    isTournamentWithinAggregateDateRange(tournament, dateRange)
  );

  return {
    tournaments: completedTournaments.map(tournament => ({
      id: String(tournament.id),
      name: tournament.name || String(tournament.id)
    })),
    standings: computeAggregateStandings(
      completedTournaments,
      teams,
      tournamentTeams,
      matches
    )
  };
}

function getAggregateDateRange(startDate, endDate) {
  const range = {
    startDate: normalizeAggregateDate(startDate, "start date"),
    endDate: normalizeAggregateDate(endDate, "end date")
  };

  if (range.startDate && range.endDate && range.startDate > range.endDate) {
    throw new Error("The start date must be before the end date");
  }

  return range;
}

function normalizeAggregateDate(value, label) {
  if (value === "" || value == null) return null;

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    if (date.getFullYear() !== year || date.getMonth() !== month - 1 ||
        date.getDate() !== day) {
      throw new Error(`Invalid ${label}`);
    }

    return value;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${label}`);
  }

  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => index === 0 ? String(part) : String(part).padStart(2, "0"))
    .join("-");
}

function isTournamentWithinAggregateDateRange(tournament, dateRange) {
  if (!dateRange.startDate && !dateRange.endDate) return true;

  const tournamentDate = normalizeAggregateDate(tournament.date, "tournament date");
  if (!tournamentDate) return false;

  return (!dateRange.startDate || tournamentDate >= dateRange.startDate) &&
    (!dateRange.endDate || tournamentDate <= dateRange.endDate);
}

function isTournamentFinished(tournament, matches) {
  return String(tournament.status).trim().toUpperCase() === "FINISHED" &&
    matches.some(match =>
    String(match.tournamentId) === String(tournament.id) &&
    match.stage === "FINAL" &&
    getAggregateMatchWinner(match)
  );
}

function computeAggregateStandings(tournaments, teams, tournamentTeams, matches) {
  const teamNameById = {};
  const aggregateByTeamId = {};

  teams.forEach(team => teamNameById[String(team.id)] = team.name);

  tournaments.forEach(tournament => {
    const tournamentId = String(tournament.id);
    const participatingTeamIds = [...new Set(tournamentTeams
      .filter(tournamentTeam => String(tournamentTeam.tournamentId) === tournamentId)
      .map(tournamentTeam => String(tournamentTeam.teamId)))];
    const tournamentMatches = matches
      .filter(match => String(match.tournamentId) === tournamentId);
    const placements = computeTournamentFinalPlacements(
      participatingTeamIds,
      tournamentMatches,
      teamNameById
    );

    placements.forEach(placement => {
      if (!aggregateByTeamId[placement.teamId]) {
        aggregateByTeamId[placement.teamId] = {
          teamId: placement.teamId,
          teamName: teamNameById[placement.teamId] || placement.teamId,
          placementSum: 0,
          participationCount: 0,
          wins: 0,
          gf: 0,
          ga: 0,
          tournamentScores: [],
          placements: []
        };
      }

      const aggregate = aggregateByTeamId[placement.teamId];
      aggregate.placementSum += placement.rank;
      aggregate.participationCount++;
      aggregate.wins += placement.wins;
      aggregate.gf += placement.gf;
      aggregate.ga += placement.ga;
      const tournamentScore = computeTournamentPlacementScore(
        placement.rank,
        participatingTeamIds.length
      );
      aggregate.tournamentScores.push(tournamentScore);
      aggregate.placements.push({
        tournamentId,
        tournamentName: tournament.name || tournamentId,
        rank: placement.rank,
        score: tournamentScore
      });
    });
  });

  return sortAggregateStandings(Object.values(aggregateByTeamId)
    .map(aggregate => ({
      ...aggregate,
      averagePlacement: aggregate.placementSum / aggregate.participationCount,
      weightedScore: computeWeightedPlacementScore(aggregate.tournamentScores),
      goalDifference: aggregate.gf - aggregate.ga
    })));
}

function sortAggregateStandings(standings) {
  return [...standings].sort((a, b) =>
      b.weightedScore - a.weightedScore ||
      b.wins - a.wins ||
      b.goalDifference - a.goalDifference ||
      b.gf - a.gf ||
      a.teamName.localeCompare(b.teamName) ||
      a.teamId.localeCompare(b.teamId)
    );
}

function computeTournamentPlacementScore(rank, participantCount) {
  if (!Number.isInteger(rank) || !Number.isInteger(participantCount) ||
      participantCount < 2 || rank < 1 || rank > participantCount) {
    throw new Error("Invalid tournament placement");
  }

  return 10 + 90 * (participantCount - rank) / (participantCount - 1);
}

function computeWeightedPlacementScore(tournamentScores) {
  return [...tournamentScores]
    .sort((a, b) => b - a)
    .reduce((total, score, index) => total + score * Math.pow(0.5, index), 0);
}

function computeTournamentFinalPlacements(teamIds, matches, teamNameById) {
  const statsByTeamId = computeTournamentTeamStats(teamIds, matches);
  const stageRankByTeamId = computeTournamentStageRanks(teamIds, matches);

  return [...teamIds]
    .sort((teamAId, teamBId) => {
      const teamAStats = statsByTeamId[teamAId];
      const teamBStats = statsByTeamId[teamBId];

      return (
        stageRankByTeamId[teamBId] - stageRankByTeamId[teamAId] ||
        teamBStats.wins - teamAStats.wins ||
        (teamBStats.gf - teamBStats.ga) - (teamAStats.gf - teamAStats.ga) ||
        teamBStats.gf - teamAStats.gf ||
        (teamNameById[teamAId] || teamAId).localeCompare(teamNameById[teamBId] || teamBId) ||
        teamAId.localeCompare(teamBId)
      );
    })
    .map((teamId, index) => ({
      teamId,
      rank: index + 1,
      ...statsByTeamId[teamId]
    }));
}

function computeTournamentTeamStats(teamIds, matches) {
  const statsByTeamId = {};

  teamIds.forEach(teamId => {
    statsByTeamId[teamId] = { wins: 0, gf: 0, ga: 0 };
  });

  matches.forEach(match => {
    if (!isPlayedMatchWithValidScores(match)) return;

    const teamAId = String(match.teamA);
    const teamBId = String(match.teamB);
    const scoreA = Number(match.scoreA);
    const scoreB = Number(match.scoreB);

    if (statsByTeamId[teamAId]) {
      statsByTeamId[teamAId].gf += scoreA;
      statsByTeamId[teamAId].ga += scoreB;
      if (getAggregateMatchWinner(match) === teamAId) statsByTeamId[teamAId].wins++;
    }

    if (statsByTeamId[teamBId]) {
      statsByTeamId[teamBId].gf += scoreB;
      statsByTeamId[teamBId].ga += scoreA;
      if (getAggregateMatchWinner(match) === teamBId) statsByTeamId[teamBId].wins++;
    }
  });

  return statsByTeamId;
}

function computeTournamentStageRanks(teamIds, matches) {
  const stageRankByTeamId = {};
  const stageRank = { QF: 1, SF: 2, FINAL: 3 };

  teamIds.forEach(teamId => stageRankByTeamId[teamId] = 0);

  matches.forEach(match => {
    if (!isPlayedMatchWithValidScores(match) || !stageRank[match.stage]) return;

    const rank = stageRank[match.stage];
    const teamAId = String(match.teamA);
    const teamBId = String(match.teamB);

    if (stageRankByTeamId[teamAId] !== undefined) {
      stageRankByTeamId[teamAId] = Math.max(stageRankByTeamId[teamAId], rank);
    }

    if (stageRankByTeamId[teamBId] !== undefined) {
      stageRankByTeamId[teamBId] = Math.max(stageRankByTeamId[teamBId], rank);
    }

    if (match.stage === "FINAL") {
      const winner = getAggregateMatchWinner(match);
      if (winner && stageRankByTeamId[winner] !== undefined) {
        stageRankByTeamId[winner] = 4;
      }
    }
  });

  return stageRankByTeamId;
}

function getAggregateMatchWinner(match) {
  if (!isPlayedMatchWithValidScores(match)) return null;

  const scoreA = Number(match.scoreA);
  const scoreB = Number(match.scoreB);

  if (scoreA > scoreB) return String(match.teamA);
  if (scoreB > scoreA) return String(match.teamB);
  if (match.penaltyWinner === "A") return String(match.teamA);
  if (match.penaltyWinner === "B") return String(match.teamB);

  return null;
}
