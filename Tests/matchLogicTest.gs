function testMatchLogic() {
  runTestSuite("Match logic", [
    {
      name: "generates every pairing for an even-sized group",
      test: function() {
        const rounds = generateRoundRobin(["A", "B", "C", "D"]);
        const matches = rounds.reduce((all, round) => all.concat(round), []);

        assertEquals(3, rounds.length);
        assertEquals(6, matches.length);
        assertRoundRobinContainsEachPairOnce(matches, ["A", "B", "C", "D"]);
      }
    },
    {
      name: "handles an odd-sized group without creating a match against the bye",
      test: function() {
        const rounds = generateRoundRobin(["A", "B", "C"]);
        const matches = rounds.reduce((all, round) => all.concat(round), []);

        assertEquals(3, rounds.length);
        assertEquals(3, matches.length);
        assertTrue(matches.every(match => match[0] !== null && match[1] !== null));
        assertRoundRobinContainsEachPairOnce(matches, ["A", "B", "C"]);
      }
    },
    {
      name: "does not modify the provided team list",
      test: function() {
        const teams = ["A", "B", "C"];

        generateRoundRobin(teams);

        assertDeepEquals(["A", "B", "C"], teams);
      }
    },
    {
      name: "identifies only knockout matches",
      test: function() {
        ["QF", "SF", "FINAL"].forEach(stage => {
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
