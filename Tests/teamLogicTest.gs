function testTeamLogic() {
  runTestSuite("Team logic", [
    {
      name: "With_ValidName_Should_NormalizeWhitespaceWithoutChangingAccentsOrPunctuation",
      test: function() {
        // Arrange
        const teamName = "  Les   Étoiles - A.C.  ";

        // Act
        const result = normalizeTeamName(teamName);

        // Assert
        assertEquals("Les Étoiles - A.C.", result);
      }
    },
    {
      name: "With_EmptyName_Should_RejectTeamCreation",
      test: function() {
        // Arrange
        const existingTeams = [];

        // Act
        const createEmptyTeam = () => buildNewTeam("   ", existingTeams, () => 1);
        const createTeamWithoutName = () => buildNewTeam(null, existingTeams, () => 1);

        // Assert
        assertThrows(
          createEmptyTeam,
          "Enter a team name"
        );
        assertThrows(
          createTeamWithoutName,
          "Enter a team name"
        );
      }
    },
    {
      name: "With_NameMatchingByCaseOrWhitespace_Should_RejectDuplicate",
      test: function() {
        // Arrange
        const existingTeams = [{ id: 1, name: "Les Étoiles" }];

        // Act
        const createDuplicate = () =>
          buildNewTeam("  les   étoiles  ", existingTeams, () => 2);

        // Assert
        assertThrows(
          createDuplicate,
          "already exists"
        );
      }
    },
    {
      name: "With_DifferentAccentOrPunctuation_Should_AllowDistinctTeams",
      test: function() {
        // Arrange
        const existingTeams = [{ id: 1, name: "Equipe AC" }];

        // Act
        const result = buildNewTeam("Équipe A.C.", existingTeams, () => 2);

        // Assert
        assertDeepEquals({ id: 2, name: "Équipe A.C." }, result);
      }
    },
    {
      name: "With_ExistingNumericIdentifiers_Should_IncrementTheHighestIdentifier",
      test: function() {
        // Arrange
        const existingTeams = [
          { id: 3, name: "Alpha" },
          { id: "7", name: "Bravo" },
          { id: "legacy-guid", name: "Charlie" }
        ];

        // Act
        const nextTeamId = getNextTeamId(existingTeams);

        // Assert
        assertEquals(8, nextTeamId);
      }
    },
    {
      name: "With_NoNumericIdentifier_Should_StartAtOne",
      test: function() {
        // Arrange
        const existingTeams = [{ id: "legacy-guid", name: "Alpha" }];

        // Act
        const nextTeamId = getNextTeamId(existingTeams);

        // Assert
        assertEquals(1, nextTeamId);
      }
    },
    {
      name: "With_RepeatedSubmission_Should_RejectSecondNormalizedName",
      test: function() {
        // Arrange
        const existingTeams = [];
        const firstTeam = buildNewTeam("  FC   Paris ", existingTeams, () => 1);
        existingTeams.push(firstTeam);

        // Act
        const createDuplicate = () =>
          buildNewTeam("fc paris", existingTeams, () => 2);

        // Assert
        assertThrows(
          createDuplicate,
          "already exists"
        );
      }
    }
  ]);
}
