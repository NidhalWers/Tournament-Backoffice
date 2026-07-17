/**
 * Exécute une suite de tests et produit un résumé dans les logs.
 *
 * @param {string} suiteName Nom de la suite.
 * @param {Array<{name: string, test: Function}>} tests Tests à exécuter.
 */
function runTestSuite(suiteName, tests) {
  let passed = 0;
  let failed = 0;
  const failures = [];

  Logger.log(`===== ${suiteName} =====`);

  tests.forEach(testCase => {
    try {
      testCase.test();

      passed++;
      Logger.log(`✅ ${testCase.name}`);
    } catch (error) {
      failed++;

      const failure = {
        name: testCase.name,
        message: error.message,
        stack: error.stack
      };

      failures.push(failure);

      Logger.log(`❌ ${testCase.name}`);
      Logger.log(`   ${error.message}`);
    }
  });

  Logger.log("");
  Logger.log(`Résultat : ${passed} réussi(s), ${failed} échoué(s)`);

  if (failures.length > 0) {
    Logger.log("");
    Logger.log("Détail des erreurs :");

    failures.forEach(failure => {
      Logger.log(`- ${failure.name}: ${failure.message}`);
    });

    throw new Error(
      `${suiteName} : ${failed} test(s) en échec sur ${tests.length}.`
    );
  }

  return {
    suiteName,
    total: tests.length,
    passed,
    failed
  };
}


/**
 * Vérifie une égalité stricte.
 */
function assertEquals(expected, actual, message) {
  if (expected !== actual) {
    throw new Error(
      buildAssertionMessage(
        message,
        `Valeur attendue : ${formatTestValue(expected)}`,
        `Valeur obtenue : ${formatTestValue(actual)}`
      )
    );
  }
}


/**
 * Vérifie deux valeurs avec une tolérance numérique.
 */
function assertAlmostEquals(expected, actual, tolerance = 0.000001, message) {
  if (
    typeof actual !== "number" ||
    Math.abs(expected - actual) > tolerance
  ) {
    throw new Error(
      buildAssertionMessage(
        message,
        `Valeur attendue : ${expected} ± ${tolerance}`,
        `Valeur obtenue : ${actual}`
      )
    );
  }
}


/**
 * Compare profondément des tableaux ou des objets simples.
 */
function assertDeepEquals(expected, actual, message) {
  const expectedJson = JSON.stringify(expected);
  const actualJson = JSON.stringify(actual);

  if (expectedJson !== actualJson) {
    throw new Error(
      buildAssertionMessage(
        message,
        `Valeur attendue : ${expectedJson}`,
        `Valeur obtenue : ${actualJson}`
      )
    );
  }
}


/**
 * Vérifie qu'une condition est vraie.
 */
function assertTrue(condition, message) {
  if (condition !== true) {
    throw new Error(
      message || "La condition devait être vraie."
    );
  }
}


/**
 * Vérifie qu'une fonction déclenche une erreur.
 */
function assertThrows(callback, expectedMessage, message) {
  let thrownError = null;

  try {
    callback();
  } catch (error) {
    thrownError = error;
  }

  if (!thrownError) {
    throw new Error(
      message || "Une erreur était attendue, mais aucune n'a été levée."
    );
  }

  if (
    expectedMessage &&
    !String(thrownError.message).includes(expectedMessage)
  ) {
    throw new Error(
      buildAssertionMessage(
        message,
        `Message contenant : "${expectedMessage}"`,
        `Message obtenu : "${thrownError.message}"`
      )
    );
  }
}


function buildAssertionMessage(message, expected, actual) {
  const prefix = message ? `${message}\n` : "";

  return `${prefix}${expected}\n${actual}`;
}


function formatTestValue(value) {
  if (typeof value === "string") {
    return `"${value}"`;
  }

  return JSON.stringify(value);
}