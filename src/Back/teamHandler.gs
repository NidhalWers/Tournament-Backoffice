function getTeams() {
  return getSheetData("Teams")
    .filter(team => String(team.id || "").trim() && normalizeTeamName(team.name))
    .map(team => ({
      id: String(team.id),
      name: normalizeTeamName(team.name)
    }))
    .sort((firstTeam, secondTeam) => firstTeam.name.localeCompare(secondTeam.name));
}

function createTeam(teamName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Teams");

  if (!sheet) {
    throw new Error("The Teams sheet is missing. Run the spreadsheet initializer.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const existingTeams = getSheetData("Teams");
    const team = buildNewTeam(
      teamName,
      existingTeams,
      () => getNextTeamId(existingTeams)
    );
    sheet.appendRow([team.id, team.name]);

    return team;
  } finally {
    lock.releaseLock();
  }
}

function buildNewTeam(teamName, existingTeams, createId) {
  const normalizedName = normalizeTeamName(teamName);

  if (!normalizedName) {
    throw new Error("Enter a team name.");
  }

  const normalizedNameKey = getTeamNameKey(normalizedName);
  const hasDuplicate = existingTeams.some(team =>
    getTeamNameKey(team.name) === normalizedNameKey
  );

  if (hasDuplicate) {
    throw new Error("A team with this name already exists.");
  }

  return {
    id: createId(),
    name: normalizedName
  };
}

function normalizeTeamName(teamName) {
  if (typeof teamName !== "string") return "";

  return teamName
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function getTeamNameKey(teamName) {
  return normalizeTeamName(teamName).toLocaleLowerCase("fr-FR");
}

function getNextTeamId(teams) {
  const highestNumericId = teams.reduce((highestId, team) => {
    const id = String(team.id == null ? "" : team.id).trim();

    if (!/^\d+$/.test(id)) return highestId;

    const numericId = Number(id);
    return Number.isSafeInteger(numericId) && numericId > highestId
      ? numericId
      : highestId;
  }, 0);

  return highestNumericId + 1;
}
