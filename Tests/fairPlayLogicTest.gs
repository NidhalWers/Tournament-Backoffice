function testFairPlayLogic() {
  runTestSuite("Logique du fair-play", [
    {
      name: "cumule les sanctions et la solidarité par équipe",
      test: function() {
        const result = computeFairPlayByTeam([
          { teamId: "A", redCard: 1, seriousRedCard: 0, solidarityPoints: 2 },
          { teamId: "B", redCard: 0, seriousRedCard: 1, solidarityPoints: 0 },
          { teamId: "A", redCard: 2, seriousRedCard: 1, solidarityPoints: 1 }
        ]);

        assertDeepEquals({
          A: { red: 3, seriousRed: 1, solidarity: 3 },
          B: { red: 0, seriousRed: 1, solidarity: 0 }
        }, result);
      }
    },
    {
      name: "traite les valeurs absentes comme des zéros",
      test: function() {
        const result = computeFairPlayByTeam([
          { teamId: "A" },
          { teamId: "A", redCard: "2", solidarityPoints: "1" }
        ]);

        assertDeepEquals({
          A: { red: 2, seriousRed: 0, solidarity: 1 }
        }, result);
      }
    },
    {
      name: "renvoie un résultat vide sans événements",
      test: function() {
        assertDeepEquals({}, computeFairPlayByTeam([]));
      }
    }
  ]);
}
