function getTournamentCreationData() {
  return {
    teams: getTeams(),
    formats: getTournamentCreationFormats()
  };
}

function getTournamentCreationFormats() {
  return [
    { id: "3x5", label: "3 groups of 5 teams", teamCount: 15, groupCount: 3, groupSize: 5, groupLegs: 1 },
    { id: "3x4", label: "3 groups of 4 teams", teamCount: 12, groupCount: 3, groupSize: 4, groupLegs: 1 },
    { id: "2x5", label: "2 groups of 5 teams", teamCount: 10, groupCount: 2, groupSize: 5, groupLegs: 1 },
    { id: "2x4", label: "2 groups of 4 teams", teamCount: 8, groupCount: 2, groupSize: 4, groupLegs: 1 },
    { id: "2x3-home-away", label: "2 groups of 3 teams · home and away", teamCount: 6, groupCount: 2, groupSize: 3, groupLegs: 2 }
  ];
}

function getTournamentGroupConfiguration(teamCount) {
  const format = getTournamentCreationFormats().find(candidate =>
    candidate.teamCount === Number(teamCount)
  );

  if (!format) throw new Error("Unsupported tournament team count.");

  return {
    groupCount: format.groupCount,
    groupSize: format.groupSize,
    groupLegs: format.groupLegs
  };
}

function createTournament(request) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const tournamentsSheet = spreadsheet.getSheetByName("Tournaments");
  const tournamentTeamsSheet = spreadsheet.getSheetByName("TournamentTeams");

  if (!tournamentsSheet || !tournamentTeamsSheet) {
    throw new Error("Tournament sheets are missing. Run the spreadsheet initializer.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  let tournamentRowIndex = null;

  try {
    const existingTournaments = getSheetData("Tournaments");
    const creation = buildNewTournament(
      request,
      existingTournaments,
      getSheetData("Teams"),
      () => getNextTournamentId(existingTournaments),
      () => Utilities.getUuid()
    );

    const tournamentHeaders = getSheetRecordHeaders(tournamentsSheet, creation.tournament);
    const tournamentTeamHeaders = getSheetRecordHeaders(
      tournamentTeamsSheet,
      creation.tournamentTeams[0]
    );

    tournamentRowIndex = appendSheetRecords(
      tournamentsSheet,
      [creation.tournament],
      tournamentHeaders
    );
    appendSheetRecords(tournamentTeamsSheet, creation.tournamentTeams, tournamentTeamHeaders);

    return creation.tournament;
  } catch (error) {
    if (tournamentRowIndex !== null) {
      tournamentsSheet.deleteRow(tournamentRowIndex);
    }

    throw error;
  } finally {
    lock.releaseLock();
  }
}

function buildNewTournament(request, existingTournaments, availableTeams, createTournamentId, createTournamentTeamId) {
  const values = request || {};
  const name = normalizeTournamentName(values.name);
  const date = normalizeTournamentDate(values.date);
  const format = getTournamentCreationFormats()
    .find(candidate => candidate.id === values.formatId);
  const selectedTeamIds = Array.isArray(values.teamIds)
    ? values.teamIds.map(teamId => String(teamId))
    : [];

  if (!name) throw new Error("Enter a tournament name.");
  if (!date) throw new Error("Enter a valid tournament date.");
  if (!format) throw new Error("Select a supported tournament format.");
  if (selectedTeamIds.length !== format.teamCount) {
    throw new Error(`Select exactly ${format.teamCount} teams for this format.`);
  }
  if (new Set(selectedTeamIds).size !== selectedTeamIds.length) {
    throw new Error("A team can only be selected once.");
  }

  const availableTeamIds = new Set(availableTeams.map(team => String(team.id)));
  if (selectedTeamIds.some(teamId => !availableTeamIds.has(teamId))) {
    throw new Error("One or more selected teams no longer exist.");
  }

  const tournamentId = createTournamentId(existingTournaments);

  return {
    tournament: {
      id: tournamentId,
      name,
      date,
      status: "REGISTRATION"
    },
    tournamentTeams: selectedTeamIds.map(teamId => ({
      id: createTournamentTeamId(),
      tournamentId,
      teamId,
      group: ""
    }))
  };
}

function getSheetRecordHeaders(sheet, record) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const requiredHeaders = Object.keys(record || {});
  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

  if (missingHeaders.length > 0) {
    throw new Error(`Missing required columns in ${sheet.getName()}: ${missingHeaders.join(", ")}. Run the spreadsheet initializer.`);
  }

  return headers;
}

function appendSheetRecords(sheet, records, headers) {
  const sheetHeaders = headers || getSheetRecordHeaders(sheet, records[0]);

  const firstRow = sheet.getLastRow() + 1;
  const values = records.map(record => sheetHeaders.map(header =>
    Object.prototype.hasOwnProperty.call(record, header) ? record[header] : ""
  ));

  sheet.getRange(firstRow, 1, values.length, sheetHeaders.length).setValues(values);

  return firstRow;
}

function normalizeTournamentName(name) {
  if (typeof name !== "string") return "";

  return name.normalize("NFC").trim().replace(/\s+/g, " ");
}

function normalizeTournamentDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";

  const [year, month, day] = date.split("-").map(Number);
  const normalizedDate = new Date(year, month - 1, day);

  return normalizedDate.getFullYear() === year &&
    normalizedDate.getMonth() === month - 1 &&
    normalizedDate.getDate() === day
    ? date
    : "";
}

function getNextTournamentId(tournaments) {
  const highestId = tournaments.reduce((highestId, tournament) => {
    const id = String(tournament.id == null ? "" : tournament.id).trim();

    if (!/^\d+$/.test(id)) return highestId;

    const numericId = Number(id);
    return Number.isSafeInteger(numericId) && numericId > highestId
      ? numericId
      : highestId;
  }, 0);

  return highestId + 1;
}

function setTournamentStatus(tournamentId, status) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Tournaments");

  if (!sheet) {
    throw new Error("The Tournaments sheet is missing. Run the spreadsheet initializer.");
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idColumn = headers.indexOf("id");
  const statusColumn = headers.indexOf("status");

  if (idColumn === -1 || statusColumn === -1) {
    throw new Error("The Tournaments sheet is missing the id or status column.");
  }

  const rowIndex = data.findIndex((row, index) =>
    index > 0 && String(row[idColumn]) === String(tournamentId)
  );

  if (rowIndex === -1) throw new Error("Tournament not found.");

  sheet.getRange(rowIndex + 1, statusColumn + 1).setValue(status);
}
