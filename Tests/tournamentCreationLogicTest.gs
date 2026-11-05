function testTournamentCreationLogic() {
  runTestSuite("Tournament creation logic", [
    {
      name: "With_EachSupportedFormat_Should_CreateTheExpectedParticipantCountAndLegs",
      test: function() {
        // Arrange
        const formats = getTournamentCreationFormats();
        const availableTeams = createAvailableTeams(15);

        // Act
        const creations = formats.map(format => buildNewTournament(
          createTournamentRequest(format.id, format.teamCount),
          [],
          availableTeams,
          () => 1,
          () => "tournament-team"
        ));

        // Assert
        creations.forEach((creation, index) => {
          assertEquals(formats[index].teamCount, creation.tournamentTeams.length);
          assertEquals("REGISTRATION", creation.tournament.status);
          assertDeepEquals(
            {
              groupCount: formats[index].groupCount,
              groupSize: formats[index].groupSize,
              groupLegs: formats[index].groupLegs
            },
            getTournamentGroupConfiguration(formats[index].teamCount)
          );
          assertTrue(creation.tournamentTeams.every(team => team.group === ""));
        });
      }
    },
    {
      name: "With_IncompatibleTeamCount_Should_RejectWithoutCreatingTournamentData",
      test: function() {
        // Arrange
        const availableTeams = createAvailableTeams(10);
        const request = createTournamentRequest("2x5", 9);

        // Act
        const createTournamentData = () => buildNewTournament(
          request,
          [],
          availableTeams,
          () => 1,
          () => "tournament-team"
        );

        // Assert
        assertThrows(createTournamentData, "Select exactly 10 teams");
      }
    },
    {
      name: "With_UnknownOrRepeatedTeam_Should_RejectTournamentCreation",
      test: function() {
        // Arrange
        const availableTeams = createAvailableTeams(6);
        const repeatedTeamRequest = createTournamentRequest("2x3-home-away", 6);
        repeatedTeamRequest.teamIds[5] = repeatedTeamRequest.teamIds[0];
        const unknownTeamRequest = createTournamentRequest("2x3-home-away", 6);
        unknownTeamRequest.teamIds[5] = "unknown";

        // Act
        const createWithRepeatedTeam = () => buildNewTournament(
          repeatedTeamRequest,
          [],
          availableTeams,
          () => 1,
          () => "tournament-team"
        );
        const createWithUnknownTeam = () => buildNewTournament(
          unknownTeamRequest,
          [],
          availableTeams,
          () => 1,
          () => "tournament-team"
        );

        // Assert
        assertThrows(createWithRepeatedTeam, "only be selected once");
        assertThrows(createWithUnknownTeam, "no longer exist");
      }
    },
    {
      name: "With_ValidRequest_Should_PersistRegistrationStatusWithoutGroupAssignments",
      test: function() {
        // Arrange
        const request = createTournamentRequest("2x3-home-away", 6);

        // Act
        const result = buildNewTournament(
          request,
          [{ id: 4 }],
          createAvailableTeams(6),
          getNextTournamentId,
          () => "tournament-team"
        );

        // Assert
        assertDeepEquals(
          {
            id: 5,
            name: "Autumn Cup",
            date: "2026-11-05",
            status: "REGISTRATION"
          },
          result.tournament
        );
        assertTrue(result.tournamentTeams.every(team => team.group === ""));
      }
    },
    {
      name: "With_InvalidNameOrDate_Should_RejectTournamentCreation",
      test: function() {
        // Arrange
        const availableTeams = createAvailableTeams(6);
        const invalidNameRequest = createTournamentRequest("2x3-home-away", 6);
        invalidNameRequest.name = "   ";
        const invalidDateRequest = createTournamentRequest("2x3-home-away", 6);
        invalidDateRequest.date = "2026-02-30";

        // Act
        const createWithInvalidName = () => buildNewTournament(
          invalidNameRequest,
          [],
          availableTeams,
          () => 1,
          () => "tournament-team"
        );
        const createWithInvalidDate = () => buildNewTournament(
          invalidDateRequest,
          [],
          availableTeams,
          () => 1,
          () => "tournament-team"
        );

        // Assert
        assertThrows(createWithInvalidName, "Enter a tournament name");
        assertThrows(createWithInvalidDate, "Enter a valid tournament date");
      }
    },
    {
      name: "With_UndrawnGroups_Should_BlockGroupMatchGeneration",
      test: function() {
        // Arrange
        const incompleteGroups = { "": ["1", "2", "3", "4", "5", "6"] };
        const completeGroups = {
          A: ["1", "2", "3"],
          B: ["4", "5", "6"]
        };

        // Act
        const validateUndrawnGroups = () =>
          validateTournamentGroupsForGeneration(incompleteGroups);
        validateTournamentGroupsForGeneration(completeGroups);

        // Assert
        assertThrows(validateUndrawnGroups, "Draw complete groups");
      }
    },
    {
      name: "With_ChangedRegistrationTeams_Should_PreserveRowsAndClearDraw",
      test: function() {
        // Arrange
        const existingTeams = createRegistrationTeams(6).map((team, index) => ({
          ...team,
          tournamentId: "1",
          group: index < 3 ? "A" : "B"
        }));
        const availableTeams = createAvailableTeams(7);

        // Act
        const result = buildUpdatedTournamentTeams(
          existingTeams,
          ["1", "2", "3", "4", "5", "7"],
          availableTeams,
          () => "new-entry"
        );

        // Assert
        assertDeepEquals(
          existingTeams.slice(0, 5).map(team => team.id).concat(["new-entry"]),
          result.map(team => team.id)
        );
        assertDeepEquals(["1", "2", "3", "4", "5", "7"], result.map(team => team.teamId));
        assertTrue(result.every(team => team.group === ""));
      }
    },
    {
      name: "With_UnchangedRegistrationTeams_Should_PreserveExistingDraw",
      test: function() {
        // Arrange
        const existingTeams = createRegistrationTeams(6).map((team, index) => ({
          ...team,
          tournamentId: "1",
          group: index < 3 ? "A" : "B"
        }));

        // Act
        const result = buildUpdatedTournamentTeams(
          existingTeams,
          ["6", "5", "4", "3", "2", "1"],
          createAvailableTeams(6)
        );

        // Assert
        assertDeepEquals(existingTeams, result);
      }
    },
    {
      name: "With_DifferentSupportedParticipantCount_Should_ResizeRegistration",
      test: function() {
        // Arrange
        const existingTeams = createRegistrationTeams(6)
          .map(team => ({ ...team, tournamentId: "1" }));
        let nextId = 7;

        // Act
        const result = buildUpdatedTournamentTeams(
          existingTeams,
          ["1", "2", "3", "4", "5", "6", "7", "8"],
          createAvailableTeams(8),
          () => `entry-${nextId++}`
        );

        // Assert
        assertEquals(8, result.length);
        assertDeepEquals(
          ["entry-1", "entry-2", "entry-3", "entry-4", "entry-5", "entry-6", "entry-7", "entry-8"],
          result.map(team => team.id)
        );
        assertTrue(result.every(team => team.group === ""));
      }
    }
  ]);
}

function createTournamentRequest(formatId, teamCount) {
  return {
    name: "Autumn Cup",
    date: "2026-11-05",
    formatId,
    teamIds: createAvailableTeams(teamCount).map(team => String(team.id))
  };
}

function createAvailableTeams(teamCount) {
  return Array.from({ length: teamCount }, (_, index) => ({
    id: index + 1,
    name: `Team ${index + 1}`
  }));
}

function createRegistrationTeams(teamCount) {
  return Array.from({ length: teamCount }, (_, index) => ({
    id: `entry-${index + 1}`,
    teamId: String(index + 1),
    group: ""
  }));
}
