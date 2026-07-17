function testSaveForfeit3of4()
{
    saveForfeit("e5fce7cb-24b8-45f9-9547-e4efc6b5ae12", 3, 0);
}

function testTournamentFormat()
{
    var tournamentData = getTournamentData(5);
    getTournamentFormat(tournamentData.standings);
}

function testComputeBestScorer()
{
    computeTopScorers(5);
}
