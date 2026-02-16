// Import commands.js using ES2015 syntax:
import "./commands";

// Suppress uncaught exceptions from the app (React dev mode)
Cypress.on("uncaught:exception", (err, runnable) => {
  // Return false to prevent Cypress from failing the test
  return false;
});
