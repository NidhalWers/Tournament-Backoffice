function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();

  const headers = data[0];      // Row 1
  const rows = data.slice(1);   // Row 2+

  return rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

/**
 * Normalizes the name entered for a scorer.
 *
 * Extra spaces are removed, and each part of a compound first name
 * (space, hyphen, or apostrophe) receives consistent capitalization.
 */
function normalizePlayerName(playerName) {
  if (typeof playerName !== "string") {
    return "";
  }

  const cleanedName = playerName
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/’/g, "'")
    .replace(/\s*([-'])\s*/g, "$1");

  return cleanedName
    .toLocaleLowerCase("fr-FR")
    .replace(/(^|[\s\-'])(\p{L})/gu, (match, separator, letter) =>
      separator + letter.toLocaleUpperCase("fr-FR")
    );
}

/**
 * Produces a case-insensitive key for grouping entries for the same scorer.
 */
function getPlayerNameKey(playerName) {
  return normalizePlayerName(playerName).toLocaleLowerCase("fr-FR");
}
