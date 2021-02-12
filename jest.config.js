module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [ "**/test/unit/*.ts" ],
  testPathIgnorePatterns: [ "/node_modules/", "/buildOutput/" ],
  testResultsProcessor: "jest-jenkins-reporter"
};
