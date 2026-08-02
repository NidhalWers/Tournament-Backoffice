function testNormalizePlayerNames() {
  runTestSuite("Normalisation des noms de buteurs", [
    {
      name: "uniformise minuscules et majuscules",
      test: function() {
        assertEquals("Jean", normalizePlayerName("jEAN"));
      }
    },
    {
      name: "supprime les espaces superflus",
      test: function() {
        assertEquals("Jean Pierre", normalizePlayerName("  JEAN   PIERRE  "));
      }
    },
    {
      name: "gère les prénoms composés et les apostrophes",
      test: function() {
        assertEquals("Jean-Pierre D'Angelo", normalizePlayerName("jean-pierre d'ANGELO"));
        assertEquals("D'Angelo", normalizePlayerName("d’angelo"));
        assertEquals("Élodie", normalizePlayerName("éLODIE"));
      }
    },
    {
      name: "refuse les valeurs non textuelles ou vides",
      test: function() {
        assertEquals("", normalizePlayerName(null));
        assertEquals("", normalizePlayerName("   "));
      }
    },
    {
      name: "produit la même clé quelle que soit la casse",
      test: function() {
        assertEquals(getPlayerNameKey("JEAN"), getPlayerNameKey("jean"));
        assertEquals(getPlayerNameKey("d'angelo"), getPlayerNameKey("D’ANGELO"));
      }
    }
  ]);
}
