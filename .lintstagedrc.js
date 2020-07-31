module.exports = {
  '*.{js,ts}': [
    'tsdx lint src test',
    () => 'tsc --noEmit',
    'tsdx test --passWithNoTests',
  ],
}
