function testTournamentLogic() {
  runTestSuite("Tournament logic", [
    {
      name: "detects the format from the standings",
      test: function() {
        const standings = {
          A: [{}, {}, {}],
          B: [{}, {}, {}]
        };

        assertDeepEquals({ groupCount: 2, groupSize: 3 }, getTournamentFormat(standings));
      }
    },
    {
      name: "considers the group stage complete only when every match has been played",
      test: function() {
        assertTrue(isGroupStageComplete([]));
        assertTrue(isGroupStageComplete([{ played: true }, { played: true }]));
        assertEquals(false, isGroupStageComplete([{ played: true }, { played: false }]));
      }
    },
    {
      name: "calculates wins, draws, goals, and points",
      test: function() {
        const matches = [
          groupMatch("A", "1", "2", 2, 1, true),
          groupMatch("A", "1", "3", 0, 0, true),
          groupMatch("A", "2", "3", "", "", false)
        ];
        const standings = computeStandings(
          matches,
          { "1": "Alpha", "2": "Bravo", "3": "Charlie" },
          []
        );

        assertDeepEquals(["Alpha", "Charlie", "Bravo"], standings.A.map(row => row.team));
        assertDeepEquals(["1", "3", "2"], standings.A.map(row => row.teamId));
        assertDeepEquals(
          { played: 2, win: 1, draw: 1, loss: 0, gf: 2, ga: 1, pts: 4 },
          selectStandingStats(standings.A[0])
        );
        assertDeepEquals(
          { played: 1, win: 0, draw: 1, loss: 0, gf: 0, ga: 0, pts: 1 },
          selectStandingStats(standings.A[1])
        );
      }
    },
    {
      name: "breaks ties by goal difference and then goals scored",
      test: function() {
        const matches = [
          groupMatch("A", "1", "2", 3, 1, true),
          groupMatch("A", "3", "4", 2, 0, true)
        ];
        const standings = computeStandings(matches, {}, []);

        assertDeepEquals(["1", "3", "2", "4"], standings.A.map(row => row.team));
      }
    },
    {
      name: "With_SamePointsAndGoalDifference_Should_UseHeadToHeadBeforeGoalsScored",
      test: function() {
        // Arrange
        const matches = [
          groupMatch("A", "1", "2", 2, 0, true),
          groupMatch("A", "1", "3", 0, 4, true),
          groupMatch("A", "2", "3", 4, 0, true),
          groupMatch("A", "2", "4", 0, 4, true)
        ];

        // Act
        const standings = computeStandings(matches, {}, []);
        const teamOneIndex = standings.A.findIndex(team => team.teamId === "1");
        const teamTwoIndex = standings.A.findIndex(team => team.teamId === "2");

        // Assert
        assertTrue(teamOneIndex < teamTwoIndex);
        assertEquals(2, standings.A[teamOneIndex].gf);
        assertEquals(4, standings.A[teamTwoIndex].gf);
      }
    },
    {
      name: "With_ThreeTeamsTied_Should_UseHeadToHeadMiniTable",
      test: function() {
        // Arrange
        const standings = [
          { teamId: "1", pts: 6, gf: 1, ga: 0, fairPlayScore: 0 },
          { teamId: "2", pts: 6, gf: 5, ga: 4, fairPlayScore: 0 },
          { teamId: "3", pts: 6, gf: 8, ga: 7, fairPlayScore: 0 }
        ];
        const matches = [
          groupMatch("A", "1", "2", 1, 0, true),
          groupMatch("A", "1", "3", 1, 0, true),
          groupMatch("A", "2", "3", 1, 0, true)
        ];

        // Act
        const result = sortGroupStandings(standings, matches);

        // Assert
        assertDeepEquals(["1", "2", "3"], result.map(team => team.teamId));
      }
    },
    {
      name: "uses fair play after sporting criteria",
      test: function() {
        const matches = [groupMatch("A", "1", "2", 0, 0, false)];
        const fairPlay = [
          { teamId: "1", solidarityPoints: 1 },
          { teamId: "2", redCard: 1 }
        ];
        const standings = computeStandings(matches, {}, fairPlay);

        assertDeepEquals(["1", "2"], standings.A.map(row => row.team));
        assertEquals(1, standings.A[0].fairPlayScore);
        assertEquals(-3, standings.A[1].fairPlayScore);
      }
    },
    {
      name: "qualifies the top two teams from each group for the semifinals",
      test: function() {
        const standings = {
          A: [{ team: "A1" }, { team: "A2" }, { team: "A3" }],
          B: [{ team: "B1" }, { team: "B2" }, { team: "B3" }]
        };
        const result = getQualifiedTeams(standings);

        assertDeepEquals(
          ["A1:A:1", "A2:A:2", "B1:B:1", "B2:B:2"],
          result.teams.map(team => `${team.team}:${team.group}:${team.rank}`)
        );
        assertEquals(false, result.tieBreakOccurred);
      }
    },
    {
      name: "selects the two best third-place teams using sporting criteria",
      test: function() {
        const standings = {
          A: rankedGroup("A", { pts: 4, gf: 3, ga: 2, fairPlayScore: 0 }),
          B: rankedGroup("B", { pts: 5, gf: 2, ga: 1, fairPlayScore: 0 }),
          C: rankedGroup("C", { pts: 4, gf: 4, ga: 2, fairPlayScore: 0 })
        };
        const result = computeQualifiedTeamsForThreeGroups(standings);
        const thirdPlaces = result.teams.filter(team => team.rank === 3);

        assertDeepEquals(["B3", "C3"], thirdPlaces.map(team => team.team));
        assertEquals(false, result.tieBreakOccurred);
      }
    }
  ]);
}

function groupMatch(group, teamA, teamB, scoreA, scoreB, played) {
  return { group, teamA, teamB, scoreA, scoreB, played };
}

function selectStandingStats(standing) {
  return {
    played: standing.played,
    win: standing.win,
    draw: standing.draw,
    loss: standing.loss,
    gf: standing.gf,
    ga: standing.ga,
    pts: standing.pts
  };
}

function rankedGroup(prefix, thirdStats) {
  return [
    { team: `${prefix}1`, pts: 9, gf: 5, ga: 0, fairPlayScore: 0 },
    { team: `${prefix}2`, pts: 6, gf: 4, ga: 1, fairPlayScore: 0 },
    Object.assign({ team: `${prefix}3` }, thirdStats)
  ];
}
