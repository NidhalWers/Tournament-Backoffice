function testMatchLogic() {
  runTestSuite("Logique des matchs", [
    {
      name: "génère toutes les rencontres d'un groupe pair",
      test: function() {
        const rounds = generateRoundRobin(["A", "B", "C", "D"]);
        const matches = rounds.reduce((all, round) => all.concat(round), []);

        assertEquals(3, rounds.length);
        assertEquals(6, matches.length);
        assertRoundRobinContainsEachPairOnce(matches, ["A", "B", "C", "D"]);
      }
    },
    {
      name: "gère un groupe impair sans créer de match contre l'exempt",
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
      name: "ne modifie pas la liste d'équipes reçue",
      test: function() {
        const teams = ["A", "B", "C"];

        generateRoundRobin(teams);

        assertDeepEquals(["A", "B", "C"], teams);
      }
    },
    {
      name: "identifie uniquement les matchs à élimination directe",
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
