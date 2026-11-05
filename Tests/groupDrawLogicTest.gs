function testGroupDrawLogic() {
  runTestSuite("Group draw logic", [
    {
      name: "With_EachSupportedParticipantCount_Should_AssignEveryTeamToExpectedGroups",
      test: function() {
        // Arrange
        const formats = getTournamentCreationFormats();

        // Act
        const assignmentsByFormat = formats.map(format => {
          const teams = createDrawTeams(format.teamCount);
          const configuration = getTournamentGroupConfiguration(format.teamCount);

          return {
            assignments: buildTournamentGroupAssignments(teams, configuration, () => 0.5),
            configuration
          };
        });

        // Assert
        assignmentsByFormat.forEach(({ assignments, configuration }) => {
          const groupCounts = assignments.reduce((counts, assignment) => {
            counts[assignment.group] = (counts[assignment.group] || 0) + 1;
            return counts;
          }, {});

          assertEquals(configuration.groupCount * configuration.groupSize, assignments.length);
          assertEquals(assignments.length, new Set(assignments.map(assignment => assignment.tournamentTeamId)).size);
          Object.values(groupCounts).forEach(count => assertEquals(configuration.groupSize, count));
        });
      }
    },
    {
      name: "With_ExistingDraw_Should_ReplaceAllAssignments",
      test: function() {
        // Arrange
        const teams = createDrawTeams(6).map(team => ({ ...team, group: "A" }));
        const configuration = getTournamentGroupConfiguration(6);

        // Act
        const assignments = buildTournamentGroupAssignments(teams, configuration, () => 0.5);

        // Assert
        assertEquals(6, assignments.length);
        assertEquals(3, assignments.filter(assignment => assignment.group === "A").length);
        assertEquals(3, assignments.filter(assignment => assignment.group === "B").length);
      }
    },
    {
      name: "With_GroupMatchesOrNonRegistrationStatus_Should_LockDraw",
      test: function() {
        // Arrange
        const registrationTournament = { status: "REGISTRATION" };
        const groupTournament = { status: "GROUP" };
        const groupMatches = [{ stage: "GROUP" }];

        // Act
        const available = getGroupDrawAvailability(registrationTournament, []);
        const lockedByMatch = getGroupDrawAvailability(registrationTournament, groupMatches);
        const lockedByStatus = getGroupDrawAvailability(groupTournament, []);

        // Assert
        assertTrue(available.canDraw);
        assertEquals(false, lockedByMatch.canDraw);
        assertEquals(false, lockedByStatus.canDraw);
      }
    },
    {
      name: "With_IncompleteOrDuplicateParticipants_Should_RejectDraw",
      test: function() {
        // Arrange
        const configuration = getTournamentGroupConfiguration(6);
        const incompleteTeams = createDrawTeams(5);
        const duplicateTeams = createDrawTeams(6);
        duplicateTeams[5].teamId = duplicateTeams[0].teamId;

        // Act
        const drawIncompleteTeams = () =>
          buildTournamentGroupAssignments(incompleteTeams, configuration, () => 0.5);
        const drawDuplicateTeams = () =>
          buildTournamentGroupAssignments(duplicateTeams, configuration, () => 0.5);

        // Assert
        assertThrows(drawIncompleteTeams, "participant count");
        assertThrows(drawDuplicateTeams, "more than once");
      }
    },
    {
      name: "With_CompleteAssignments_Should_RecognizeCompleteDraw",
      test: function() {
        // Arrange
        const configuration = getTournamentGroupConfiguration(6);
        const teams = createDrawTeams(6);
        const assignments = buildTournamentGroupAssignments(teams, configuration, () => 0.5);
        const assignedTeams = teams.map(team => ({
          ...team,
          group: assignments.find(assignment => assignment.tournamentTeamId === String(team.id)).group
        }));

        // Act
        const result = isTournamentGroupDrawComplete(assignedTeams, configuration);

        // Assert
        assertTrue(result);
      }
    },
    {
      name: "With_OverallRanking_Should_SplitTeamsIntoTwoBalancedPots",
      test: function() {
        // Arrange
        const teams = createDrawTeams(6);
        const configuration = getTournamentGroupConfiguration(6);
        const rankedTeamIds = ["6", "5", "4", "3", "2", "1"];

        // Act
        const assignments = buildTournamentGroupAssignments(
          teams,
          configuration,
          () => 0.999,
          rankedTeamIds
        );

        // Assert
        assertDeepEquals(
          ["6", "5", "4"],
          splitTournamentTeamsIntoPots(teams, rankedTeamIds)[0].map(team => team.teamId)
        );
        ["A", "B"].forEach(group => {
          assertEquals(3, assignments.filter(assignment => assignment.group === group).length);
          assertTrue(assignments.filter(assignment => assignment.group === group && assignment.pot === 1).length >= 1);
          assertTrue(assignments.filter(assignment => assignment.group === group && assignment.pot === 2).length >= 1);
        });
      }
    }
  ]);
}

function createDrawTeams(teamCount) {
  return Array.from({ length: teamCount }, (_, index) => ({
    id: `entry-${index + 1}`,
    teamId: String(index + 1),
    group: ""
  }));
}
