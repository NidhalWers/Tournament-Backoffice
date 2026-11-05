function getTournamentRefereeData(tournamentId, matches, teamMap) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const requiredSheets = ["Referees", "MatchReferees"];
  const missingSheets = requiredSheets.filter(sheetName => !spreadsheet.getSheetByName(sheetName));
  const tournamentTeams = getSheetData("TournamentTeams")
    .filter(team => String(team.tournamentId) === String(tournamentId))
    .map(team => ({
      teamId: team.teamId,
      teamName: String(teamMap[String(team.teamId)] || team.teamId),
      group: team.group
    }))
    .sort((firstTeam, secondTeam) => firstTeam.teamName.localeCompare(secondTeam.teamName));

  if (missingSheets.length > 0) {
    return {
      refereeSetupReady: false,
      missingRefereeSheets: missingSheets,
      tournamentTeams,
      referees: [],
      refereeAssignments: [],
      eligibleRefereeIdsByMatch: {}
    };
  }

  const referees = getSheetData("Referees")
    .filter(referee => String(referee.tournamentId) === String(tournamentId))
    .map(referee => {
      const team = tournamentTeams.find(entry => String(entry.teamId) === String(referee.teamId));

      return {
        id: referee.id,
        teamId: referee.teamId,
        playerName: String(referee.playerName || ""),
        teamName: team ? team.teamName : String(referee.teamId),
        group: team ? team.group : ""
      };
    })
    .sort((firstReferee, secondReferee) =>
      firstReferee.teamName.localeCompare(secondReferee.teamName) ||
      firstReferee.playerName.localeCompare(secondReferee.playerName)
    );
  const refereeAssignments = getSheetData("MatchReferees")
    .filter(assignment => String(assignment.tournamentId) === String(tournamentId));
  const eligibleRefereeIdsByMatch = {};

  matches.forEach(match => {
    eligibleRefereeIdsByMatch[String(match.id)] = getEligibleRefereeIdsForMatch(
      match.id,
      matches,
      tournamentTeams,
      referees,
      refereeAssignments
    );
  });

  return {
    refereeSetupReady: true,
    missingRefereeSheets: [],
    tournamentTeams,
    referees,
    refereeAssignments,
    eligibleRefereeIdsByMatch
  };
}

function getEligibleRefereeIdsForMatch(matchId, matches, tournamentTeams, referees, assignments) {
  const targetMatch = matches.find(match => String(match.id) === String(matchId));

  if (!targetMatch) return [];

  const slotByMatchId = getGroupMatchSlots(matches);
  const targetSlot = slotByMatchId[String(targetMatch.id)];
  const groupByTeamId = {};

  tournamentTeams.forEach(team => {
    groupByTeamId[String(team.teamId)] = String(team.group);
  });

  const playingTeamIds = new Set();

  matches.forEach(match => {
    if (slotByMatchId[String(match.id)] !== targetSlot) return;

    playingTeamIds.add(String(match.teamA));
    playingTeamIds.add(String(match.teamB));
  });

  const busyRefereeIds = new Set();

  assignments.forEach(assignment => {
    if (String(assignment.matchId) === String(targetMatch.id)) return;

    const assignedSlot = slotByMatchId[String(assignment.matchId)];

    if (assignedSlot === targetSlot) {
      busyRefereeIds.add(String(assignment.refereeId));
    }
  });

  return referees
    .filter(referee => {
      const refereeId = String(referee.id);
      const teamId = String(referee.teamId);
      const refereeGroup = groupByTeamId[teamId];

      return refereeGroup !== undefined &&
        refereeGroup !== String(targetMatch.group) &&
        !playingTeamIds.has(teamId) &&
        !busyRefereeIds.has(refereeId);
    })
    .map(referee => referee.id);
}

function getGroupMatchSlots(matches) {
  const nextSlotByGroup = {};
  const slotByMatchId = {};

  matches.forEach(match => {
    const group = String(match.group);
    const slot = nextSlotByGroup[group] || 0;

    slotByMatchId[String(match.id)] = slot;
    nextSlotByGroup[group] = slot + 1;
  });

  return slotByMatchId;
}

function saveTournamentReferee(tournamentId, teamId, playerName) {
  const normalizedName = normalizePlayerName(playerName);

  if (!normalizedName) {
    throw new Error("Enter the referee's name.");
  }

  const tournamentTeam = getSheetData("TournamentTeams").find(team =>
    String(team.tournamentId) === String(tournamentId) &&
    String(team.teamId) === String(teamId)
  );

  if (!tournamentTeam) {
    throw new Error("This team does not belong to the tournament.");
  }

  const sheet = getRequiredRefereeSheet("Referees");
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const duplicate = getSheetData("Referees").some(referee =>
      String(referee.tournamentId) === String(tournamentId) &&
      String(referee.teamId) === String(teamId) &&
      getPlayerNameKey(referee.playerName) === getPlayerNameKey(normalizedName)
    );

    if (duplicate) {
      throw new Error("This referee is already registered for the team.");
    }

    const refereeId = Utilities.getUuid();

    sheet.appendRow([refereeId, tournamentId, teamId, normalizedName]);

    return refereeId;
  } finally {
    lock.releaseLock();
  }
}

function deleteTournamentReferee(refereeId) {
  const refereeSheet = getRequiredRefereeSheet("Referees");
  getRequiredRefereeSheet("MatchReferees");
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const isAssigned = getSheetData("MatchReferees")
      .some(assignment => String(assignment.refereeId) === String(refereeId));

    if (isAssigned) {
      throw new Error("Remove this referee from all matches before deleting them.");
    }

    const data = refereeSheet.getDataRange().getValues();
    const idColumn = data[0].indexOf("id");
    const rowIndex = data.findIndex((row, index) =>
      index > 0 && String(row[idColumn]) === String(refereeId)
    );

    if (rowIndex === -1) {
      throw new Error("Referee not found.");
    }

    refereeSheet.deleteRow(rowIndex + 1);
  } finally {
    lock.releaseLock();
  }
}

function saveMatchReferee(matchId, refereeId) {
  const assignmentSheet = getRequiredRefereeSheet("MatchReferees");
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const matches = getSheetData("Matches")
      .filter(match => match.stage === "GROUP");
    const match = matches.find(entry => String(entry.id) === String(matchId));

    if (!match) {
      throw new Error("Group match not found.");
    }

    const assignmentData = assignmentSheet.getDataRange().getValues();
    const headers = assignmentData[0];
    const matchIdColumn = headers.indexOf("matchId");
    const refereeIdColumn = headers.indexOf("refereeId");
    const assignmentRow = assignmentData.findIndex((row, index) =>
      index > 0 && String(row[matchIdColumn]) === String(matchId)
    );

    if (!refereeId) {
      if (assignmentRow !== -1) {
        assignmentSheet.deleteRow(assignmentRow + 1);
      }

      return;
    }

    const referees = getSheetData("Referees")
      .filter(referee => String(referee.tournamentId) === String(match.tournamentId));
    const tournamentTeams = getSheetData("TournamentTeams")
      .filter(team => String(team.tournamentId) === String(match.tournamentId));
    const assignments = getSheetData("MatchReferees")
      .filter(assignment => String(assignment.tournamentId) === String(match.tournamentId));
    const eligibleRefereeIds = getEligibleRefereeIdsForMatch(
      matchId,
      matches.filter(entry => String(entry.tournamentId) === String(match.tournamentId)),
      tournamentTeams,
      referees,
      assignments
    ).map(String);

    if (!eligibleRefereeIds.includes(String(refereeId))) {
      throw new Error("This referee is not available for this match.");
    }

    if (assignmentRow !== -1) {
      assignmentSheet.getRange(assignmentRow + 1, refereeIdColumn + 1).setValue(refereeId);
      return;
    }

    assignmentSheet.appendRow([
      Utilities.getUuid(),
      match.tournamentId,
      matchId,
      refereeId
    ]);
  } finally {
    lock.releaseLock();
  }
}

function getRequiredRefereeSheet(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(`Missing ${sheetName} sheet. Run the spreadsheet initializer first.`);
  }

  return sheet;
}
