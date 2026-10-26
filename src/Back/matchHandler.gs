function generateGroupMatches(tournamentId) {
  Logger.log("tournamentId : "+tournamentId);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const matchesSheet = ss.getSheetByName("Matches");

  const existing = getSheetData("Matches")
    .filter(m => String(m.tournamentId) === String(tournamentId));

  if (existing.length > 0) {
    Logger.log("Group-stage matches already exist!");
    throw new Error("Group-stage matches already exist!");
  }

  const sheet = ss.getSheetByName("TournamentTeams");
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  const idxTournament = headers.indexOf("tournamentId");
  const idxTeam = headers.indexOf("teamId");
  const idxGroup = headers.indexOf("group");

  // const tournamentData = getTournamentData(tournamentId);
  // const format = getTournamentFormat(tournamentData.standings);

  const groups = {};

  data.forEach(row => {
    if (String(row[idxTournament]) !== String(tournamentId)) return;

    const group = row[idxGroup];
    const team = row[idxTeam];

    if (!groups[group]) groups[group] = [];
    groups[group].push(team);
  });
  
  Logger.log("groups : "+JSON.stringify(groups));

  const matches = [];

  Object.keys(groups).forEach(group => {
    const teams = groups[group];

    const rounds = generateRoundRobin(teams);

    rounds.forEach(round => {
      round.forEach(match => {
        matches.push([
          Utilities.getUuid(),
          tournamentId,
          "GROUP",
          group,
          match[0],
          match[1],
          "",
          "",
          false
        ]);
      });
    });
  });

  if (matches.length > 0) {
    matchesSheet.getRange(
      matchesSheet.getLastRow() + 1,
      1,
      matches.length,
      matches[0].length
    ).setValues(matches);
  }

  return matches;
}

function generateRoundRobin(teams) {
  const rounds = [];
  const n = teams.length;

  // Clone
  let list = [...teams];

  // If odd -> bye
  if (n % 2 === 1) {
    list.push(null);
  }

  const totalRounds = list.length - 1;
  const half = list.length / 2;

  for (let round = 0; round < totalRounds; round++) {
    const roundMatches = [];

    for (let i = 0; i < half; i++) {
      const teamA = list[i];
      const teamB = list[list.length - 1 - i];

      if (teamA && teamB) {
        roundMatches.push([teamA, teamB]);
      }
    }

    rounds.push(roundMatches);

    // Rotate (except the first item)
    list.splice(1, 0, list.pop());
  }

  return balanceRoundRobinSchedule(rounds);
}

function balanceRoundRobinSchedule(rounds) {
  const maximumCombinations = 100000;
  let combinationCount = 1;

  rounds.forEach(round => {
    for (let factor = 2; factor <= round.length; factor++) {
      combinationCount *= factor;
    }
  });

  if (combinationCount > maximumCombinations) {
    return balanceRoundRobinScheduleGreedily(rounds);
  }

  const roundPermutations = rounds.map(round => getMatchPermutations(round));
  let bestSchedule = rounds.map(round => [...round]);
  let bestScore = getRoundRobinScheduleScore(bestSchedule);

  function findBestSchedule(roundIndex, scheduledRounds) {
    if (roundIndex === roundPermutations.length) {
      const score = getRoundRobinScheduleScore(scheduledRounds);

      if (isScheduleScoreBetter(score, bestScore)) {
        bestSchedule = scheduledRounds.map(round => [...round]);
        bestScore = score;
      }

      return;
    }

    roundPermutations[roundIndex].forEach(round => {
      scheduledRounds.push(round);
      findBestSchedule(roundIndex + 1, scheduledRounds);
      scheduledRounds.pop();
    });
  }

  findBestSchedule(0, []);

  return bestSchedule;
}

function balanceRoundRobinScheduleGreedily(rounds) {
  const schedule = [];

  rounds.forEach(round => {
    const remainingMatches = [...round];
    const orderedRound = [];

    while (remainingMatches.length > 0) {
      let bestIndex = 0;
      let bestScore = null;

      remainingMatches.forEach((match, index) => {
        const candidateSchedule = [...schedule, [...orderedRound, match]];
        const score = getRoundRobinScheduleScore(candidateSchedule);

        if (bestScore === null || isScheduleScoreBetter(score, bestScore)) {
          bestIndex = index;
          bestScore = score;
        }
      });

      orderedRound.push(remainingMatches.splice(bestIndex, 1)[0]);
    }

    schedule.push(orderedRound);
  });

  return schedule;
}

function getMatchPermutations(matches) {
  if (matches.length <= 1) {
    return [[...matches]];
  }

  const permutations = [];

  matches.forEach((match, index) => {
    const remainingMatches = matches.filter((_, matchIndex) => matchIndex !== index);

    getMatchPermutations(remainingMatches).forEach(permutation => {
      permutations.push([match, ...permutation]);
    });
  });

  return permutations;
}

function getRoundRobinScheduleScore(rounds) {
  const matches = rounds.reduce((all, round) => all.concat(round), []);
  const lastMatchByTeam = {};
  let consecutiveMatches = 0;
  let maximumGap = 0;
  let squaredGaps = 0;

  matches.forEach((match, matchIndex) => {
    if (matchIndex > 0 && matchesShareTeam(matches[matchIndex - 1], match)) {
      consecutiveMatches++;
    }

    match.forEach(team => {
      if (lastMatchByTeam[team] !== undefined) {
        const gap = matchIndex - lastMatchByTeam[team];
        maximumGap = Math.max(maximumGap, gap);
        squaredGaps += gap * gap;
      }

      lastMatchByTeam[team] = matchIndex;
    });
  });

  return [consecutiveMatches, maximumGap, squaredGaps];
}

function matchesShareTeam(firstMatch, secondMatch) {
  return firstMatch.some(team => secondMatch.includes(team));
}

function isScheduleScoreBetter(score, referenceScore) {
  for (let i = 0; i < score.length; i++) {
    if (score[i] !== referenceScore[i]) {
      return score[i] < referenceScore[i];
    }
  }

  return false;
}

function generateFinalPhase(tournamentId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Matches");

  const data = getTournamentData(tournamentId);

  if (!data.isComplete) {
    throw new Error("Group-stage results are incomplete or invalid.");
  }

  const existing = getSheetData("Matches")
    .filter(m => String(m.tournamentId) === String(tournamentId) && 
    ["QF", "SF", "FINAL"].includes(m.stage));

  if (existing.length > 0) {
    Logger.log("Knockout-stage matches already exist!");
    throw new Error("Knockout-stage matches already exist!");
  }

  const qualifiedData = getQualifiedTeams(data.standings);

  if (qualifiedData.teams.length === 4){
    return generateSemiFinalBracket(
      tournamentId,
      sheet,
      qualifiedData)
  }

  return generateQuarterFinalBracket(
    tournamentId,
    sheet,
    qualifiedData)
}

function generateSemiFinalBracket(tournamentId, sheet, qualifiedData) {

  const qualified = qualifiedData.teams;

  // =========================================
  // Retrieve the seeds
  // =========================================

  const groupA = qualified.filter(t => t.group === "A");
  const groupB = qualified.filter(t => t.group === "B");

  const A1 = groupA.find(t => t.rank === 1);
  const A2 = groupA.find(t => t.rank === 2);

  const B1 = groupB.find(t => t.rank === 1);
  const B2 = groupB.find(t => t.rank === 2);

  // =========================================
  // Final
  // =========================================

  const finalId = Utilities.getUuid();

  const finalMatch = [[
    finalId,
    tournamentId,
    "FINAL",
    null,
    "",
    "",
    "",
    "",
    false,
    "",
    ""
  ]];

  // =========================================
  // Semifinals
  // =========================================

  const sfMatches = [

    // SF1 : A1 vs B2
    [
      Utilities.getUuid(),
      tournamentId,
      "SF",
      null,
      A1.teamId,
      B2.teamId,
      "",
      "",
      false,
      finalId,
      "A"
    ],

    // SF2 : B1 vs A2
    [
      Utilities.getUuid(),
      tournamentId,
      "SF",
      null,
      B1.teamId,
      A2.teamId,
      "",
      "",
      false,
      finalId,
      "B"
    ]
  ];

  // =========================================
  // Save
  // =========================================

  const allMatches = [
    ...sfMatches,
    ...finalMatch
  ];

  sheet.getRange(
    sheet.getLastRow() + 1,
    1,
    allMatches.length,
    allMatches[0].length
  ).setValues(allMatches);

  return {
    matches: allMatches,
    tieBreakDetected: qualifiedData.tieBreakDetected
  };
}

function generateQuarterFinalBracket(tournamentId, sheet, qualifiedData){
  const qualified = qualifiedData.teams;
  const pairings = drawQuarterFinals(qualified);

  const finalId = Utilities.getUuid();

  const finalMatch = [[
    finalId,
    tournamentId,
    "FINAL",
    null,
    "",
    "",
    "",
    "",
    false,
    "", // nextMatchId
    ""  // nextSlot
  ]];

  // Create empty semifinals
  const sf1Id = Utilities.getUuid();
  const sf2Id = Utilities.getUuid();

  const sfMatches = [
    [
      sf1Id,
      tournamentId,
      "SF",
      null,
      "",
      "",
      "",
      "",
      false,
      finalId,
      "A"
    ],
    [
      sf2Id,
      tournamentId,
      "SF",
      null,
      "",
      "",
      "",
      "",
      false,
      finalId,
      "B"
    ]
  ];

  // Create linked quarterfinals
  const qfMatches = [];

  pairings.forEach((pair, index) => {
    let nextMatchId;
    let nextSlot;

    if (index === 0) {
      nextMatchId = sf1Id;
      nextSlot = "A";
    } else if (index === 1) {
      nextMatchId = sf1Id;
      nextSlot = "B";
    } else if (index === 2) {
      nextMatchId = sf2Id;
      nextSlot = "A";
    } else {
      nextMatchId = sf2Id;
      nextSlot = "B";
    }

    qfMatches.push([
      Utilities.getUuid(),
      tournamentId,
      "QF",
      null,
      pair[0].teamId,
      pair[1].teamId,
      "",
      "",
      false,
      nextMatchId,
      nextSlot
    ]);
  });

    const allMatches = [
    ...qfMatches,
    ...sfMatches,
    ...finalMatch
  ];

  sheet.getRange(
    sheet.getLastRow() + 1,
    1,
    allMatches.length,
    allMatches[0].length
  ).setValues(allMatches);

  return {
    matches: allMatches,
    tieBreakDetected: qualifiedData.tieBreakDetected
  };
}

function drawQuarterFinals(qualified) {
  // Overall ranking
  const sorted = [...qualified].sort((a, b) => {
    return (
      b.pts - a.pts ||
      (b.gf - b.ga) - (a.gf - a.ga) ||
      b.gf - a.gf
    );
  });

  // top 4 vs bottom 4
  const top = sorted.slice(0, 4);
  const bottom = sorted.slice(4);

  // Shuffle the bottom half (randomly)
  for (let i = bottom.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bottom[i], bottom[j]] = [bottom[j], bottom[i]];
  }

  const pairings = [];

  top.forEach(teamA => {
    let opponentIndex = bottom.findIndex(teamB => teamB.group !== teamA.group);

    // If none is found (rare case), use the fallback
    if (opponentIndex === -1) {
      opponentIndex = 0;
    }

    const teamB = bottom.splice(opponentIndex, 1)[0];

    pairings.push([teamA, teamB]);
  });

  return pairings;
}

function saveScore(matchId, scoreA, scoreB, penaltyWinner) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Matches");
  const data = sheet.getDataRange().getValues();

  const headers = data[0];
  const idxId = headers.indexOf("id");
  const idxA = headers.indexOf("scoreA");
  const idxB = headers.indexOf("scoreB");
  const idxPlayed = headers.indexOf("played");
  const idxPenaltyWinner = headers.indexOf("penaltyWinner");
  const idxNextMatchId = headers.indexOf("nextMatchId");
  const idxNextSlot = headers.indexOf("nextSlot");
  const idxTeamA = headers.indexOf("teamA");
  const idxTeamB = headers.indexOf("teamB");
  const idxStage = headers.indexOf("stage");
  const parsedScoreA = parseScore(scoreA);
  const parsedScoreB = parseScore(scoreB);
  const matchRowIndex = data.findIndex((row, index) => index > 0 && row[idxId] === matchId);

  if (matchRowIndex === -1) {
    throw new Error("Match not found");
  }

  const match = data[matchRowIndex];
  validatePenaltyWinner(match[idxStage], parsedScoreA, parsedScoreB, penaltyWinner);

  sheet.getRange(matchRowIndex + 1, idxA + 1).setValue(parsedScoreA);
  sheet.getRange(matchRowIndex + 1, idxB + 1).setValue(parsedScoreB);
  sheet.getRange(matchRowIndex + 1, idxPlayed + 1).setValue(true);
  sheet.getRange(matchRowIndex + 1, idxPenaltyWinner + 1).setValue(penaltyWinner || "");

  if (isKnockoutMatch(match, idxStage)) {
      const teamA = match[idxTeamA];
      const teamB = match[idxTeamB];

      let winner = null;

      if (parsedScoreA > parsedScoreB) {
        winner = teamA;
      } else if (parsedScoreB > parsedScoreA) {
        winner = teamB;
      } else {
        winner = penaltyWinner === "A" ? teamA : teamB;
      }

      const nextMatchId = match[idxNextMatchId];
      const nextSlot = match[idxNextSlot];

      if (nextMatchId) {
        for (let j = 1; j < data.length; j++) {
          if (data[j][idxId] === nextMatchId) {

            if (nextSlot === "A") {
              sheet.getRange(j + 1, idxTeamA + 1).setValue(winner);
            } else {
              sheet.getRange(j + 1, idxTeamB + 1).setValue(winner);
            }

            break;
          }
        }
      }
  }
}

function saveMatchWithGoals(matchId, scoreA, scoreB, goals, penaltyWinner, fairPlay) {
  const parsedScoreA = parseScore(scoreA);
  const parsedScoreB = parseScore(scoreB);
  const match = getMatchById(matchId);

  validatePenaltyWinner(match.stage, parsedScoreA, parsedScoreB, penaltyWinner);
  validateScorers(match, parsedScoreA, parsedScoreB, goals);
  validateFairPlay(match, fairPlay);

  saveScore(matchId, parsedScoreA, parsedScoreB, penaltyWinner);
  registerScorers(matchId, parsedScoreA, parsedScoreB, goals);
  registerFairPlay(matchId, fairPlay);
}

function registerScorers(matchId, scoreA, scoreB, goals) {
  const parsedScoreA = parseScore(scoreA);
  const parsedScoreB = parseScore(scoreB);
  const match = getMatchById(matchId);
  const rows = validateScorers(match, parsedScoreA, parsedScoreB, goals);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Goals");

  if (rows.length > 0) {
    sheet.getRange(
      sheet.getLastRow() + 1,
      1,
      rows.length,
      rows[0].length
    ).setValues(rows);
  }
}

function parseScore(value) {
  if (typeof value === "string" && value.trim() === "") {
    throw new Error("Invalid scores");
  }

  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error("Invalid scores");
  }

  const score = Number(value);
  if (!Number.isInteger(score) || score < 0) {
    throw new Error("Invalid scores");
  }

  return score;
}

function getMatchById(matchId) {
  const match = getSheetData("Matches")
    .find(currentMatch => String(currentMatch.id) === String(matchId));

  if (!match) {
    throw new Error("Match not found");
  }

  return match;
}

function validatePenaltyWinner(stage, scoreA, scoreB, penaltyWinner) {
  if (penaltyWinner && penaltyWinner !== "A" && penaltyWinner !== "B") {
    throw new Error("Invalid penalty shootout winner");
  }

  if (isKnockoutStage(stage) && scoreA === scoreB &&
      penaltyWinner !== "A" && penaltyWinner !== "B") {
    throw new Error("Draw: a penalty shootout winner is required");
  }
}

function validateScorers(match, scoreA, scoreB, goals) {
  if (!Array.isArray(goals)) {
    throw new Error("Invalid scorer list");
  }

  const teamNames = getTeamNamesByMatchId(match.id);
  const goalCountByTeam = { A: 0, B: 0 };

  const rows = goals.map(goal => {
    if (!goal || (goal.team !== "A" && goal.team !== "B")) {
      throw new Error("Invalid scorer team");
    }

    const playerName = normalizePlayerName(goal.player);
    if (!playerName) {
      throw new Error("Missing scorer name");
    }

    goalCountByTeam[goal.team]++;

    return [
      Utilities.getUuid(), match.tournamentId, match.id, goal.team, playerName,
      goal.team === "A" ? teamNames.teamAName : teamNames.teamBName
    ];
  });

  if (goalCountByTeam.A > scoreA || goalCountByTeam.B > scoreB) {
    throw new Error("The number of scorers exceeds the match score");
  }

  return rows;
}

function validateFairPlay(match, fairPlay) {
  if (!fairPlay || !fairPlay.teamA || !fairPlay.teamB) {
    throw new Error("Invalid fair-play data");
  }

  [fairPlay.teamA.redCards, fairPlay.teamA.seriousRedCards,
    fairPlay.teamB.redCards, fairPlay.teamB.seriousRedCards].forEach(value => {
      parseScore(value);
    });

  if (!fairPlay.solidarityTeamId) return;

  const teamBelongsToTournament = getSheetData("TournamentTeams")
    .some(team => String(team.tournamentId) === String(match.tournamentId) &&
      String(team.teamId) === String(fairPlay.solidarityTeamId));

  if (!teamBelongsToTournament) {
    throw new Error("Invalid solidarity team");
  }
}

function getTeamNamesByMatchId(matchId) {
  const matches = getSheetData("Matches");
  const teams = getSheetData("Teams");

  const match = matches.find(m => String(m.id) === String(matchId));
  if (!match) {
    throw new Error("Match not found");
  }

  const teamMap = {};
  teams.forEach(t => teamMap[t.id] = t.name);

  return {
    teamAName: teamMap[match.teamA] || match.teamA,
    teamBName: teamMap[match.teamB] || match.teamB
  };
}

function saveForfeit(matchId, scoreA, scoreB) {
  Logger.log(matchId+" "+scoreA+" ")+scoreB
  saveScore(matchId, scoreA, scoreB);
}

function isKnockoutMatch(currentMatch, idxStage){
  return isKnockoutStage(currentMatch[idxStage]);
}

function isKnockoutStage(stage) {
  return stage === "QF" || stage === "SF" || stage === "FINAL";
}
