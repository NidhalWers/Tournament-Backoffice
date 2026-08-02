/**
 * Runs a test suite and writes a summary to the logs.
 *
 * @param {string} suiteName Suite name.
 * @param {Array<{name: string, test: Function}>} tests Tests to run.
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
  Logger.log(`Result: ${passed} passed, ${failed} failed`);

  if (failures.length > 0) {
    Logger.log("");
    Logger.log("Error details:");

    failures.forEach(failure => {
      Logger.log(`- ${failure.name}: ${failure.message}`);
    });

    throw new Error(
      `${suiteName}: ${failed} of ${tests.length} test(s) failed.`
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
 * Checks strict equality.
 */
function assertEquals(expected, actual, message) {
  if (expected !== actual) {
    throw new Error(
      buildAssertionMessage(
        message,
        `Expected value: ${formatTestValue(expected)}`,
        `Actual value: ${formatTestValue(actual)}`
      )
    );
  }
}


/**
 * Compares two values with a numeric tolerance.
 */
function assertAlmostEquals(expected, actual, tolerance = 0.000001, message) {
  if (
    typeof actual !== "number" ||
    Math.abs(expected - actual) > tolerance
  ) {
    throw new Error(
      buildAssertionMessage(
        message,
        `Expected value: ${expected} ± ${tolerance}`,
        `Actual value: ${actual}`
      )
    );
  }
}


/**
 * Deeply compares arrays or plain objects.
 */
function assertDeepEquals(expected, actual, message) {
  const expectedJson = JSON.stringify(expected);
  const actualJson = JSON.stringify(actual);

  if (expectedJson !== actualJson) {
    throw new Error(
      buildAssertionMessage(
        message,
        `Expected value: ${expectedJson}`,
        `Actual value: ${actualJson}`
      )
    );
  }
}


/**
 * Checks that a condition is true.
 */
function assertTrue(condition, message) {
  if (condition !== true) {
    throw new Error(
      message || "The condition was expected to be true."
    );
  }
}


/**
 * Checks that a function throws an error.
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
      message || "An error was expected, but none was thrown."
    );
  }

  if (
    expectedMessage &&
    !String(thrownError.message).includes(expectedMessage)
  ) {
    throw new Error(
      buildAssertionMessage(
        message,
        `Message containing: "${expectedMessage}"`,
        `Actual message: "${thrownError.message}"`
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
