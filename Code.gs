function main(){
  generateGroupMatches(1);
}

function getTournamentData(tournamentId) {
  const matches = getSheetData("Matches")
    .filter(m => String(m.tournamentId) === String(tournamentId) && m.stage === "GROUP");

  const teams = getSheetData("Teams");

  const teamMap = {};
  teams.forEach(t => teamMap[t.id] = t.name);

  // enrichir les matchs
  matches.forEach(m => {
    m.teamAName = teamMap[m.teamA] || m.teamA;
    m.teamBName = teamMap[m.teamB] || m.teamB;
  });

  const standings = computeStandings(matches, teamMap);

  const isComplete = isGroupStageComplete(matches);
  
  const knockoutMatches = getSheetData("Matches")
    .filter(m => String(m.tournamentId) === String(tournamentId) && m.stage !== "GROUP");

  const goals = getSheetData("Goals")
  .filter(g => matches.some(m => m.id === g.matchId)
            || knockoutMatches.some(m => m.id === g.matchId));

  return { matches, standings, isComplete, knockoutMatches, goals };
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index');
}
