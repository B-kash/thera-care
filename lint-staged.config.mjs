/**
 * Run app-wide lint when something under that app is staged (same as CI),
 * instead of passing only staged paths to eslint (which can miss cross-file rules).
 */
export default {
  'backend/{src,test}/**/*.ts': () => 'npm run lint:ci --prefix backend',
  'frontend/**/*.{ts,tsx}': () => 'npm run lint --prefix frontend',
};
