module.exports = {
  '*.{js,ts}': ['tsdx lint', 'tsc-files', 'tsdx test --passWithNoTests'],
}
