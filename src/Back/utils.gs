function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();

  const headers = data[0];      // ligne 1
  const rows = data.slice(1);   // ligne 2+

  return rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

/**
 * Normalise le nom saisi pour un buteur.
 *
 * Les espaces superflus sont supprimés et chaque partie d'un prénom composé
 * (espace, tiret ou apostrophe) reçoit une casse homogène.
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
 * Produit une clé insensible à la casse pour regrouper un même buteur.
 */
function getPlayerNameKey(playerName) {
  return normalizePlayerName(playerName).toLocaleLowerCase("fr-FR");
}
