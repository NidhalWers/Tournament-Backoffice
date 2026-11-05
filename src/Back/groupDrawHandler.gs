function drawTournamentGroups(tournamentId) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const tournamentTeamsSheet = spreadsheet.getSheetByName("TournamentTeams");

  if (!tournamentTeamsSheet) {
    throw new Error("The TournamentTeams sheet is missing. Run the spreadsheet initializer.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const tournament = getSheetData("Tournaments")
      .find(entry => String(entry.id) === String(tournamentId));

    if (!tournament) throw new Error("Tournament not found.");

    const tournamentTeams = getSheetData("TournamentTeams")
      .filter(team => String(team.tournamentId) === String(tournamentId));
    const groupMatches = getSheetData("Matches")
      .filter(match => String(match.tournamentId) === String(tournamentId) && match.stage === "GROUP");
    const availability = getGroupDrawAvailability(tournament, groupMatches);

    if (!availability.canDraw) throw new Error(availability.reason);

    const configuration = getTournamentGroupConfiguration(tournamentTeams.length);
    const assignments = buildTournamentGroupAssignments(
      tournamentTeams,
      configuration,
      Math.random,
      getOverallRankedTeamIds()
    );
    saveTournamentGroupAssignments(tournamentTeamsSheet, tournamentId, assignments);

    return assignments;
  } finally {
    lock.releaseLock();
  }
}

function getTournamentGroupDrawData(tournament, tournamentTeams, groupMatches, teamMap) {
  const configuration = getTournamentGroupConfiguration(tournamentTeams.length);
  const availability = getGroupDrawAvailability(tournament, groupMatches);
  const groupLabels = getTournamentGroupLabels(configuration.groupCount);
  const pots = splitTournamentTeamsIntoPots(tournamentTeams, getOverallRankedTeamIds());
  const potByTeamId = {};
  const teamsByGroup = {};

  pots.forEach((pot, potIndex) => {
    pot.forEach(team => potByTeamId[String(team.teamId)] = potIndex + 1);
  });
  groupLabels.forEach(group => teamsByGroup[group] = []);

  tournamentTeams.forEach(team => {
    const group = String(team.group || "");

    if (teamsByGroup[group]) {
      teamsByGroup[group].push({
        id: String(team.teamId),
        name: String(teamMap[String(team.teamId)] || team.teamId),
        pot: potByTeamId[String(team.teamId)]
      });
    }
  });

  return {
    groupCount: configuration.groupCount,
    groupSize: configuration.groupSize,
    isComplete: isTournamentGroupDrawComplete(tournamentTeams, configuration),
    canDraw: availability.canDraw,
    lockedReason: availability.reason,
    groups: groupLabels.map(group => ({
      name: group,
      teams: teamsByGroup[group].sort((firstTeam, secondTeam) =>
        firstTeam.name.localeCompare(secondTeam.name)
      )
    }))
  };
}

function getGroupDrawAvailability(tournament, groupMatches) {
  if (String(tournament.status).trim().toUpperCase() !== "REGISTRATION") {
    return {
      canDraw: false,
      reason: "The group draw is locked once the tournament has left registration."
    };
  }

  if (groupMatches.length > 0) {
    return {
      canDraw: false,
      reason: "The group draw is locked because group matches already exist."
    };
  }

  return { canDraw: true, reason: "" };
}

function buildTournamentGroupAssignments(tournamentTeams, configuration, random = Math.random, rankedTeamIds = []) {
  if (tournamentTeams.length !== configuration.groupCount * configuration.groupSize) {
    throw new Error("The participant count does not match the tournament configuration.");
  }

  const teamIds = tournamentTeams.map(team => String(team.teamId));
  if (new Set(teamIds).size !== teamIds.length) {
    throw new Error("A team cannot appear more than once in the group draw.");
  }

  const tournamentTeamIds = tournamentTeams.map(team => String(team.id || ""));
  if (tournamentTeamIds.some(id => !id) ||
      new Set(tournamentTeamIds).size !== tournamentTeamIds.length) {
    throw new Error("The tournament participant list is invalid.");
  }

  const groups = getTournamentGroupLabels(configuration.groupCount);
  const pots = splitTournamentTeamsIntoPots(tournamentTeams, rankedTeamIds)
    .map(pot => shuffleTournamentTeams(pot, random));
  let assignmentIndex = 0;

  return pots.reduce((assignments, pot, potIndex) => {
    pot.forEach(team => {
      assignments.push({
        tournamentTeamId: String(team.id),
        group: groups[assignmentIndex % configuration.groupCount],
        pot: potIndex + 1
      });
      assignmentIndex++;
    });

    return assignments;
  }, []);
}

function splitTournamentTeamsIntoPots(tournamentTeams, rankedTeamIds) {
  const rankByTeamId = {};
  rankedTeamIds.forEach((teamId, index) => rankByTeamId[String(teamId)] = index);

  const orderedTeams = [...tournamentTeams].sort((firstTeam, secondTeam) => {
    const firstRank = rankByTeamId[String(firstTeam.teamId)];
    const secondRank = rankByTeamId[String(secondTeam.teamId)];
    const normalizedFirstRank = firstRank === undefined ? Number.MAX_SAFE_INTEGER : firstRank;
    const normalizedSecondRank = secondRank === undefined ? Number.MAX_SAFE_INTEGER : secondRank;

    return normalizedFirstRank - normalizedSecondRank ||
      String(firstTeam.teamId).localeCompare(String(secondTeam.teamId));
  });
  const firstPotSize = Math.ceil(orderedTeams.length / 2);

  return [orderedTeams.slice(0, firstPotSize), orderedTeams.slice(firstPotSize)];
}

function getOverallRankedTeamIds() {
  return getAggregateStandings("", "").standings.map(standing => String(standing.teamId));
}

function shuffleTournamentTeams(teams, random) {
  const shuffledTeams = [...teams];

  for (let index = shuffledTeams.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(random() * (index + 1));
    const temporaryTeam = shuffledTeams[index];
    shuffledTeams[index] = shuffledTeams[randomIndex];
    shuffledTeams[randomIndex] = temporaryTeam;
  }

  return shuffledTeams;
}

function getTournamentGroupLabels(groupCount) {
  return Array.from({ length: groupCount }, (_, index) => String.fromCharCode(65 + index));
}

function isTournamentGroupDrawComplete(tournamentTeams, configuration) {
  const expectedGroups = getTournamentGroupLabels(configuration.groupCount);
  const teamIdsByGroup = {};

  expectedGroups.forEach(group => teamIdsByGroup[group] = []);

  tournamentTeams.forEach(team => {
    const group = String(team.group || "");
    if (!teamIdsByGroup[group]) return;

    teamIdsByGroup[group].push(String(team.teamId));
  });

  const assignedTeamIds = Object.values(teamIdsByGroup).flat();

  return assignedTeamIds.length === tournamentTeams.length &&
    new Set(assignedTeamIds).size === tournamentTeams.length &&
    expectedGroups.every(group => teamIdsByGroup[group].length === configuration.groupSize);
}

function saveTournamentGroupAssignments(sheet, tournamentId, assignments) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idColumn = headers.indexOf("id");
  const tournamentIdColumn = headers.indexOf("tournamentId");
  const groupColumn = headers.indexOf("group");

  if (idColumn === -1 || tournamentIdColumn === -1 || groupColumn === -1) {
    throw new Error("The TournamentTeams sheet is missing required columns.");
  }

  const groupByTournamentTeamId = {};
  assignments.forEach(assignment => {
    groupByTournamentTeamId[assignment.tournamentTeamId] = assignment.group;
  });

  const groupValues = data.slice(1).map(row => {
    if (String(row[tournamentIdColumn]) !== String(tournamentId)) {
      return [row[groupColumn]];
    }

    const group = groupByTournamentTeamId[String(row[idColumn])];
    if (!group) throw new Error("Unable to assign every tournament team to a group.");

    return [group];
  });

  sheet.getRange(2, groupColumn + 1, groupValues.length, 1).setValues(groupValues);
}
