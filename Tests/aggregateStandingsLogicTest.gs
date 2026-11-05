function testAggregateStandingsLogic() {
  runTestSuite("Aggregate standings logic", [
    {
      name: "With_AdditionalParticipation_Should_AddDiminishingWeightedValue",
      test: function() {
        // Arrange
        const secondPlace = computeTournamentPlacementScore(2, 6);
        const fifthPlace = computeTournamentPlacementScore(5, 6);

        // Act
        const oneTournamentScore = computeWeightedPlacementScore([secondPlace]);
        const twoTournamentScore = computeWeightedPlacementScore([secondPlace, fifthPlace]);
        const championScore = computeWeightedPlacementScore([
          computeTournamentPlacementScore(1, 6)
        ]);

        // Assert
        assertAlmostEquals(82, secondPlace);
        assertAlmostEquals(28, fifthPlace);
        assertAlmostEquals(82, oneTournamentScore);
        assertAlmostEquals(96, twoTournamentScore);
        assertAlmostEquals(100, championScore);
        assertTrue(twoTournamentScore > oneTournamentScore);
        assertTrue(championScore > twoTournamentScore);
      }
    },
    {
      name: "With_SameWeightedScore_Should_UseSportingCriteria",
      test: function() {
        // Arrange
        const standings = [
          aggregateStanding("1", "Alpha", 90, 3, 7, 5),
          aggregateStanding("2", "Bravo", 90, 4, 5, 4),
          aggregateStanding("3", "Charlie", 90, 4, 6, 5)
        ];

        // Act
        const result = sortAggregateStandings(standings);

        // Assert
        assertDeepEquals(["Charlie", "Bravo", "Alpha"], result.map(standing => standing.teamName));
      }
    },
    {
      name: "With_EqualStage_Should_UseWinsGoalDifferenceAndGoalsForTournamentPlacement",
      test: function() {
        // Arrange
        const matches = [
          aggregateMatch("SF", "1", "9", 2, 0, true),
          aggregateMatch("SF", "2", "8", 1, 0, true)
        ];

        // Act
        const result = computeTournamentFinalPlacements(
          ["1", "2"],
          matches,
          { "1": "Alpha", "2": "Bravo" }
        );

        // Assert
        assertDeepEquals(["1", "2"], result.map(placement => placement.teamId));
        assertDeepEquals([1, 2], result.map(placement => placement.rank));
      }
    },
    {
      name: "With_InvalidMatchResult_Should_ExcludeItFromAggregateStatistics",
      test: function() {
        // Arrange
        const matches = [
          aggregateMatch("GROUP", "1", "2", 2, 1, true),
          aggregateMatch("GROUP", "1", "2", "", 4, true)
        ];

        // Act
        const result = computeTournamentTeamStats(["1", "2"], matches);

        // Assert
        assertDeepEquals({ wins: 1, gf: 2, ga: 1 }, result["1"]);
        assertDeepEquals({ wins: 0, gf: 1, ga: 2 }, result["2"]);
      }
    },
    {
      name: "With_ValidFinal_Should_IncludeOnlyCompletedTournament",
      test: function() {
        // Arrange
        const tournament = { id: "T1", status: "FINISHED" };
        const unfinishedTournament = { id: "T1", status: "IN_PROGRESS" };
        const validFinal = Object.assign(
          aggregateMatch("FINAL", "1", "2", 0, 0, true),
          { tournamentId: "T1", penaltyWinner: "A" }
        );
        const incompleteFinal = Object.assign(
          aggregateMatch("FINAL", "1", "2", "", "", false),
          { tournamentId: "T1" }
        );

        // Act / Assert
        assertTrue(isTournamentFinished(tournament, [validFinal]));
        assertEquals(false, isTournamentFinished(unfinishedTournament, [validFinal]));
        assertEquals(false, isTournamentFinished(tournament, [incompleteFinal]));
      }
    },
    {
      name: "With_DateRange_Should_IncludeOnlyTournamentsInsideInclusivePeriod",
      test: function() {
        // Arrange
        const dateRange = getAggregateDateRange("2026-10-01", "2026-10-31");

        // Act / Assert
        assertTrue(isTournamentWithinAggregateDateRange({ date: "2026-10-01" }, dateRange));
        assertTrue(isTournamentWithinAggregateDateRange({ date: "2026-10-31" }, dateRange));
        assertEquals(false, isTournamentWithinAggregateDateRange({ date: "2026-09-30" }, dateRange));
        assertEquals(false, isTournamentWithinAggregateDateRange({ date: "" }, dateRange));
        assertThrows(
          () => getAggregateDateRange("2026-02-30", ""),
          "Invalid start date"
        );
        assertThrows(
          () => getAggregateDateRange("2026-11-01", "2026-10-31"),
          "start date must be before"
        );
      }
    },
    {
      name: "With_CompletedTournaments_Should_AggregateTeamsByIdentifier",
      test: function() {
        // Arrange
        const tournaments = [
          { id: "T1", name: "Tournament 1" },
          { id: "T2", name: "Tournament 2" }
        ];
        const teams = [
          { id: "1", name: "Alpha" },
          { id: "2", name: "Bravo" },
          { id: "3", name: "Charlie" }
        ];
        const tournamentTeams = [
          { tournamentId: "T1", teamId: "1" },
          { tournamentId: "T1", teamId: "2" },
          { tournamentId: "T2", teamId: "1" },
          { tournamentId: "T2", teamId: "3" }
        ];
        const matches = [
          Object.assign(aggregateMatch("FINAL", "1", "2", 2, 0, true), { tournamentId: "T1" }),
          Object.assign(aggregateMatch("FINAL", "3", "1", 0, 1, true), { tournamentId: "T2" })
        ];

        // Act
        const result = computeAggregateStandings(tournaments, teams, tournamentTeams, matches);

        // Assert
        assertEquals("1", result[0].teamId);
        assertEquals(2, result[0].participationCount);
        assertEquals(1, result[0].averagePlacement);
        assertEquals(150, result[0].weightedScore);
        assertEquals(2, result[0].wins);
        assertEquals(1, result.find(standing => standing.teamId === "2").participationCount);
      }
    }
  ]);
}

function aggregateStanding(teamId, teamName, weightedScore, wins, gf, ga) {
  return {
    teamId,
    teamName,
    weightedScore,
    wins,
    gf,
    ga,
    goalDifference: gf - ga,
    placements: []
  };
}

function aggregateMatch(stage, teamA, teamB, scoreA, scoreB, played) {
  return { stage, teamA, teamB, scoreA, scoreB, played };
}
