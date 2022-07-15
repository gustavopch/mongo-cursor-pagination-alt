module.exports = {
  transform: {
    "^.+\\.ts?$": "ts-jest",
  },
  testEnvironment: "node",
  moduleFileExtensions: [ "js", "ts" ],
  testResultsProcessor: "jest-jenkins-reporter",
};
