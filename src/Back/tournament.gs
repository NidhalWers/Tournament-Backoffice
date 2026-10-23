function getTournaments() {
  const data = getSheetData("Tournaments");
  Logger.log(JSON.stringify(data));

  return data.map(t => ({
    id: String(t.id),
    name: String(t.name),
    status: String(t.status),
    date: t.date ? new Date(t.date).toISOString() : null
  }));
}

function getTournamentData(tournamentId) {
  const matches = getSheetData("Matches")
    .filter(m => String(m.tournamentId) === String(tournamentId) && m.stage === "GROUP");

  const teams = getSheetData("Teams");

  const teamMap = {};
  teams.forEach(t => teamMap[String(t.id)] = t.name);

  // Enrich matches
  matches.forEach(m => {
    m.teamAName = teamMap[m.teamA] || m.teamA;
    m.teamBName = teamMap[m.teamB] || m.teamB;
  });

  const fairPlay = getSheetData("FairPlay")
  .filter(fp => String(fp.tournamentId) === String(tournamentId));

  const standings = computeStandings(matches, teamMap, fairPlay);

  const isComplete = isGroupStageComplete(matches);
  
  const knockoutMatches = getSheetData("Matches")
    .filter(m => String(m.tournamentId) === String(tournamentId) && m.stage !== "GROUP")
    .map(m => ({
      ...m,
      teamAName: teamMap[String(m.teamA)] || m.teamA,
      teamBName: teamMap[String(m.teamB)] || m.teamB
    }));

  const goals = getSheetData("Goals")
  .filter(g => matches.some(m => m.id === g.matchId)
            || knockoutMatches.some(m => m.id === g.matchId));

  const refereeData = getTournamentRefereeData(tournamentId, matches, teamMap);

  var response = { matches, standings, isComplete, knockoutMatches, goals, ...refereeData };
  return response;

}

function getTournamentFormat(standings) {
  const groupCount = Object.keys(standings).length;
  const groupSize = Object.values(standings)[0].length;

  return { groupCount, groupSize };
}

function hasMatches(tournamentId) {
  return getSheetData("Matches")
    .some(m => m.tournamentId === tournamentId && m.stage === "GROUP");
}

function isGroupStageComplete(matches) {
  return matches.every(m => m.played === true);
}

function computeStandings(matches, teamMap, fairPlay) {
  const groups = {};

  const fairPlayByTeam = computeFairPlayByTeam(fairPlay);

  matches.forEach(m => {
    if (!groups[m.group]) groups[m.group] = {};

    const g = groups[m.group];

    const teamAName = teamMap[m.teamA] || m.teamA;
    const teamBName = teamMap[m.teamB] || m.teamB;

    [
      { team: teamAName, teamId: m.teamA },
      { team: teamBName, teamId: m.teamB }
    ].forEach(({ team, teamId }) => {

      const fp = fairPlayByTeam[teamId] || {
        red: 0,
        seriousRed: 0,
        solidarity: 0
      };

      if (!g[team]) {
        g[team] = {
          team,
          teamId,
          played: 0,
          win: 0,
          draw: 0,
          loss: 0,
          gf: 0,
          ga: 0,
          pts: 0,    
          redCards: fp.red,
          seriousRedCards: fp.seriousRed,
          solidarityPoints: fp.solidarity,
          fairPlayScore:
          fp.solidarity
          - fp.red * 3
          - fp.seriousRed * 6
            };
      }
    });

    if (m.played && m.scoreA !== "" && m.scoreB !== "") {
      const a = parseInt(m.scoreA);
      const b = parseInt(m.scoreB);

      g[teamAName].played++;
      g[teamBName].played++;

      g[teamAName].gf += a;
      g[teamAName].ga += b;

      g[teamBName].gf += b;
      g[teamBName].ga += a;

      if (a > b) {
        g[teamAName].win++;
        g[teamBName].loss++;
        g[teamAName].pts += 3;
      } else if (a < b) {
        g[teamBName].win++;
        g[teamAName].loss++;
        g[teamBName].pts += 3;
      } else {
        g[teamAName].draw++;
        g[teamBName].draw++;
        g[teamAName].pts += 1;
        g[teamBName].pts += 1;
      }
    }
  });

  Object.keys(groups).forEach(group => {
    groups[group] = Object.values(groups[group]).sort((a, b) => {
      return (
        b.pts - a.pts ||
        (b.gf - b.ga) - (a.gf - a.ga) ||
        b.gf - a.gf ||
        b.fairPlayScore - a.fairPlayScore
      );
    });
  });

  return groups;
}

function getQualifiedTeams(standings) {
  const format = getTournamentFormat(standings);

  if (format.groupCount === 2 && format.groupSize === 5){
    return computeQualifiedTeamsForTwoGroupsWithFiveTeams(standings);
  }

  if (format.groupCount === 2 && (format.groupSize === 4 || format.groupSize === 3)){
    return computeQualifiedTeamsForDirectSemiFinals(standings);
  }

  if (format.groupCount === 3){
    return computeQualifiedTeamsForThreeGroups(standings);
  } 
}

function computeQualifiedTeamsForTwoGroupsWithFiveTeams(standings){
  const qualified = [];

  Object.keys(standings).forEach(group => {
    const teams = standings[group];

    for (let i = 0; i < 4; i++) {
      if (!teams[i]) continue;

      qualified.push({
        ...teams[i],
        group,
        rank: i + 1
      });
    }
  });

  return {
    teams: qualified,
    tieBreakOccurred: false
  };
}

function computeQualifiedTeamsForDirectSemiFinals(standings){
  const qualified = [];

  Object.keys(standings).forEach(group => {
    const teams = standings[group];

    for (let i = 0; i < 2; i++) {
      qualified.push({
        ...teams[i],
        group,
        rank: i + 1
      });
    }
  });

  return {
    teams: qualified,
    tieBreakOccurred: false
  };
}

function computeQualifiedTeamsForThreeGroups(standings) {  
  const qualified = [];
  const thirdPlace = [];

  Object.keys(standings).forEach(group => {
    const groupTeams = standings[group];

    // First and second place
    qualified.push({
      ...groupTeams[0],
      group,
      rank: 1
    });

    qualified.push({
      ...groupTeams[1],
      group,
      rank: 2
    });

    // Third place
    if (groupTeams[2]) {
      thirdPlace.push({
        ...groupTeams[2],
        group,
        rank: 3
      });
    }
  });

  let tieBreakOccurred = false;
  // Rank the best third-place teams
  thirdPlace.sort((a, b) => {
    // Points
    if (b.pts !== a.pts) return b.pts - a.pts;

    // Goal difference
    const diffA = a.gf - a.ga;
    const diffB = b.gf - b.ga;

    if (diffB !== diffA) return diffB - diffA;

    // Goals scored
    if (b.gf !== a.gf) return b.gf - a.gf;

    if (b.fairPlayScore !== a.fairPlayScore)
      return b.fairPlayScore - a.fairPlayScore;

    // ⚠️ Complete tie -> random draw
    tieBreakOccurred = true;
    return Math.random() - 0.5;
  });

  // Keep the best two
  qualified.push(...thirdPlace.slice(0, 2));

  return {
    teams: qualified,
    tieBreakOccurred: tieBreakOccurred
  };
}

function getTournamentTeams(matchId){
  const matches = getSheetData("Matches");
  const match = matches.find(m => String(m.id) === String(matchId));

  if (!match) {
    throw new Error("Match not found.");
  }

  const tournamentId = match.tournamentId;

  const tournamentTeams = getSheetData("TournamentTeams")
    .filter(tt => String(tt.tournamentId) === String(tournamentId));

  const teams = getSheetData("Teams");

  return tournamentTeams.map(tt => {
    const team = teams.find(t => String(t.id) === String(tt.teamId));
    return {
      id: tt.teamId,
      name: team ? team.name : tt.teamId
    };
  }).sort((a, b) => a.name.localeCompare(b.name));  
}

function getTeamsIdByName() {
  const teams = getSheetData("Teams");

  const teamIdByName = {};

  teams.forEach(t => {
    teamIdByName[t.name] = t.id;
  });

  return teamIdByName;
}
