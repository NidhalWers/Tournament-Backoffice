function testNormalizePlayerNames() {
  runTestSuite("Scorer name normalization", [
    {
      name: "standardizes lowercase and uppercase letters",
      test: function() {
        assertEquals("Jean", normalizePlayerName("jEAN"));
      }
    },
    {
      name: "removes extra spaces",
      test: function() {
        assertEquals("Jean Pierre", normalizePlayerName("  JEAN   PIERRE  "));
      }
    },
    {
      name: "handles compound first names and apostrophes",
      test: function() {
        assertEquals("Jean-Pierre D'Angelo", normalizePlayerName("jean-pierre d'ANGELO"));
        assertEquals("D'Angelo", normalizePlayerName("d’angelo"));
        assertEquals("Élodie", normalizePlayerName("éLODIE"));
      }
    },
    {
      name: "rejects non-string or empty values",
      test: function() {
        assertEquals("", normalizePlayerName(null));
        assertEquals("", normalizePlayerName("   "));
      }
    },
    {
      name: "produces the same key regardless of case",
      test: function() {
        assertEquals(getPlayerNameKey("JEAN"), getPlayerNameKey("jean"));
        assertEquals(getPlayerNameKey("d'angelo"), getPlayerNameKey("D’ANGELO"));
      }
    }
  ]);
}
