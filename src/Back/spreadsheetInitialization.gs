function initializeSpreadsheet() {

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const sheetDefinitions = {
    "Tournaments": [
      "id", "name", "date", "status"
    ],
    "Teams": [
      "id", "name"      
    ],
    "TournamentTeams": [
      "id",	"tournamentId",	"teamId", "group"																				   
    ],
    "Matches": [
      "id",	"tournamentId",	"stage", "group", "teamA", "teamB", "scoreA",	"scoreB", "played", "nextMatchId", "nextSlot", "penaltyWinner"														 
    ],
    "Goals": [
      "id", "tournamentId", "matchId", "team", "playerName","teamName"																			   
    ],
    "FairPlay": [
      "id", "tournamentId",	"matchId", "teamId", "redCard",	"seriousRedCard","solidarityPoints"																			 
    ],
    "Referees": [
      "id", "tournamentId", "teamId", "playerName"
    ],
    "MatchReferees": [
      "id", "tournamentId", "matchId", "refereeId"
    ],
  };

  let createdSheetCount = 0;
  let addedHeaderCount = 0;

  for (const [sheetName, headers] of Object.entries(sheetDefinitions)) {

    let sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
      createdSheetCount++;
    }

    const lastColumn = sheet.getLastColumn();
    const lastRow = sheet.getLastRow();

    const isEmpty =
      lastRow === 0 ||
      (lastRow === 1 &&
       lastColumn === 1 &&
       sheet.getRange(1, 1).getValue() === "");

    if (isEmpty === true) {
      const headerRow = sheetName === "Notes" ? 2 : 1;
      
      sheet
        .getRange(headerRow, 1, 1, headers.length)
        .setValues([headers]);

      customSheetInitialization(sheet, sheetName);
    } else {
      const existingHeaders = sheet
        .getRange(1, 1, 1, lastColumn)
        .getValues()[0];

      headers.forEach(header => {
        if (existingHeaders.indexOf(header) === -1) {
          sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
          addedHeaderCount++;
        }
      });
    }
  }

  if (createdSheetCount === 0 && addedHeaderCount === 0) {
    throw new Error(
      "All required sheets already exist."
    );
  }
}

function customSheetInitialization(sheet, sheetName){
  switch (sheetName){
    default: break;
  }
}
