function registerFairPlay(matchId, fairPlay){
  const matches = getSheetData("Matches");
  const match = matches.find(m => String(m.id) === String(matchId));

  const fairPlaySheet = SpreadsheetApp
  .getActiveSpreadsheet()
  .getSheetByName("FairPlay");

  const fairPlayRows = [
    [
      Utilities.getUuid(),
      match.tournamentId,
      matchId,
      match.teamA,
      fairPlay.teamA.redCards,
      fairPlay.teamA.seriousRedCards,
      0
    ],
    [
      Utilities.getUuid(),
      match.tournamentId,
      matchId,
      match.teamB,
      fairPlay.teamB.redCards,
      fairPlay.teamB.seriousRedCards,
      0
    ]
  ];

  if (fairPlay.solidarityTeamId) {
    fairPlayRows.push([
      Utilities.getUuid(),
      match.tournamentId,
      matchId,
      fairPlay.solidarityTeamId,
      0,
      0,
      1
    ]);
  }

  fairPlaySheet
    .getRange(
        fairPlaySheet.getLastRow() + 1,
        1,
        fairPlayRows.length,
        fairPlayRows[0].length
    )
    .setValues(fairPlayRows);
}

function computeFairPlayByTeam(fairPlay){
  const fairPlayByTeam = {};

  fairPlay.forEach(fp => {
    const key = fp.teamId;

    if (!fairPlayByTeam[key]) {
      fairPlayByTeam[key] = {
        red: 0,
        seriousRed: 0,
        solidarity: 0
      };
    }

    fairPlayByTeam[key].red += Number(fp.redCard || 0);
    fairPlayByTeam[key].seriousRed += Number(fp.seriousRedCard || 0);
    fairPlayByTeam[key].solidarity += Number(fp.solidarityPoints || 0);
  });

  return fairPlayByTeam;
}
