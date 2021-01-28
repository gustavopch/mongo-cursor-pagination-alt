module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ["**/test/unit/*.ts"],
  "testResultsProcessor": "jest-jenkins-reporter"
};
