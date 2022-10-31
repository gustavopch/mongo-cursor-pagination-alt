const globalTeardown = async (): Promise<void> => {
  try {
    await global.memoryMongoDb.stop()
  } catch (error) {
    console.log(error)
    process.exit(1)
  }
}

export default globalTeardown
