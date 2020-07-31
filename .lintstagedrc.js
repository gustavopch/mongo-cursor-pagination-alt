module.exports = {
  '*.{js,ts}': [
    'tsdx lint',
    () => 'tsc --noEmit',
    'tsdx test --passWithNoTests',
  ],
}
