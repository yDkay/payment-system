const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    env: {
      apiUrl: "http://localhost:3001",
      apiKey: "test_key",
    },
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 30000,
    watchForFileChanges: false,
    experimentalRunAllSpecs: true,
    retries: {
      runMode: 1,
      openMode: 0,
    },
    specPattern: "cypress/e2e/**/*.cy.js",
    supportFile: "cypress/support/e2e.js",
    setupNodeEvents(on, config) {
      // No plugins needed for now
    },
  },
});
