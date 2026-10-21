function testMatchLogic() {
  runTestSuite("Match logic", [
    {
      name: "With_EvenSizedGroup_Should_GenerateEveryPairing",
      test: function() {
        // Arrange
        const teams = ["A", "B", "C", "D"];

        // Act
        const rounds = generateRoundRobin(teams);
        const matches = rounds.reduce((all, round) => all.concat(round), []);

        // Assert
        assertEquals(3, rounds.length);
        assertEquals(6, matches.length);
        assertRoundRobinContainsEachPairOnce(matches, teams);
      }
    },
    {
      name: "With_OddSizedGroup_Should_NotCreateMatchAgainstBye",
      test: function() {
        // Arrange
        const teams = ["A", "B", "C"];

        // Act
        const rounds = generateRoundRobin(teams);
        const matches = rounds.reduce((all, round) => all.concat(round), []);

        // Assert
        assertEquals(3, rounds.length);
        assertEquals(3, matches.length);
        assertTrue(matches.every(match => match[0] !== null && match[1] !== null));
        assertRoundRobinContainsEachPairOnce(matches, teams);
      }
    },
    {
      name: "With_TeamList_Should_NotModifyProvidedList",
      test: function() {
        // Arrange
        const teams = ["A", "B", "C"];

        // Act
        generateRoundRobin(teams);

        // Assert
        assertDeepEquals(["A", "B", "C"], teams);
      }
    },
    {
      name: "With_FiveTeamGroup_Should_AvoidConsecutiveMatchesAndLimitWait",
      test: function() {
        // Arrange
        const teams = ["A", "B", "C", "D", "E"];

        // Act
        const rounds = generateRoundRobin(teams);
        const matches = rounds.reduce((all, round) => all.concat(round), []);
        const hasConsecutiveMatch = matches.some((match, index) => {
          if (index === 0) return false;

          return match.some(team => matches[index - 1].includes(team));
        });
        const maximumGap = getMaximumMatchGap(matches);

        // Assert
        assertRoundRobinContainsEachPairOnce(matches, teams);
        assertEquals(false, hasConsecutiveMatch);
        assertTrue(maximumGap <= 3);
      }
    },
    {
      name: "With_MatchStages_Should_IdentifyOnlyKnockoutMatches",
      test: function() {
        // Arrange
        const knockoutStages = ["QF", "SF", "FINAL"];

        // Act / Assert
        knockoutStages.forEach(stage => {
          assertTrue(isKnockoutMatch([stage], 0));
        });

        assertEquals(false, isKnockoutMatch(["GROUP"], 0));
        assertEquals(false, isKnockoutMatch([""], 0));
      }
    }
  ]);
}

function assertRoundRobinContainsEachPairOnce(matches, teams) {
  const actualPairs = matches
    .map(match => [match[0], match[1]].sort().join("-"))
    .sort();
  const expectedPairs = [];

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      expectedPairs.push([teams[i], teams[j]].sort().join("-"));
    }
  }

  assertDeepEquals(expectedPairs.sort(), actualPairs);
}

function getMaximumMatchGap(matches) {
  const lastMatchByTeam = {};
  let maximumGap = 0;

  matches.forEach((match, matchIndex) => {
    match.forEach(team => {
      if (lastMatchByTeam[team] !== undefined) {
        maximumGap = Math.max(maximumGap, matchIndex - lastMatchByTeam[team]);
      }

      lastMatchByTeam[team] = matchIndex;
    });
  });

  return maximumGap;
}
