function testRefereeLogic() {
  runTestSuite("Referee logic", [
    {
      name: "With_GroupMatch_Should_OnlyReturnAvailableRefereesFromOtherGroups",
      test: function() {
        // Arrange
        const data = createRefereeTestData();

        // Act
        const result = getEligibleRefereeIdsForMatch(
          "A1",
          data.matches,
          data.tournamentTeams,
          data.referees,
          []
        );

        // Assert
        assertDeepEquals(["ref-b5", "ref-c5"], result);
      }
    },
    {
      name: "With_RefereeAlreadyAssignedAtSameTime_Should_NotReturnReferee",
      test: function() {
        // Arrange
        const data = createRefereeTestData();
        const assignments = [
          { matchId: "C1", refereeId: "ref-b5" }
        ];

        // Act
        const result = getEligibleRefereeIdsForMatch(
          "A1",
          data.matches,
          data.tournamentTeams,
          data.referees,
          assignments
        );

        // Assert
        assertDeepEquals(["ref-c5"], result);
      }
    },
    {
      name: "With_RefereeTeamNotPlayingAtMatchSlot_Should_ReturnReferee",
      test: function() {
        // Arrange
        const data = createRefereeTestData();

        // Act
        const result = getEligibleRefereeIdsForMatch(
          "A2",
          data.matches,
          data.tournamentTeams,
          data.referees,
          []
        );

        // Assert
        assertDeepEquals(["ref-b1", "ref-b5", "ref-c5"], result);
      }
    },
    {
      name: "With_ParallelGroups_Should_AssignSameSlotToMatchingPositions",
      test: function() {
        // Arrange
        const data = createRefereeTestData();

        // Act
        const result = getGroupMatchSlots(data.matches);

        // Assert
        assertDeepEquals({ A1: 0, A2: 1, B1: 0, B2: 1, C1: 0, C2: 1 }, result);
      }
    }
  ]);
}

function createRefereeTestData() {
  return {
    matches: [
      { id: "A1", group: "A", teamA: "A1", teamB: "A2" },
      { id: "A2", group: "A", teamA: "A3", teamB: "A4" },
      { id: "B1", group: "B", teamA: "B1", teamB: "B2" },
      { id: "B2", group: "B", teamA: "B3", teamB: "B4" },
      { id: "C1", group: "C", teamA: "C1", teamB: "C2" },
      { id: "C2", group: "C", teamA: "C3", teamB: "C4" }
    ],
    tournamentTeams: [
      { teamId: "A5", group: "A" },
      { teamId: "B1", group: "B" },
      { teamId: "B5", group: "B" },
      { teamId: "C5", group: "C" }
    ],
    referees: [
      { id: "ref-a5", teamId: "A5" },
      { id: "ref-b1", teamId: "B1" },
      { id: "ref-b5", teamId: "B5" },
      { id: "ref-c5", teamId: "C5" }
    ]
  };
}
