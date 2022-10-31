const mongodbMemoryServerOptions = {
  instance: {
    dbName: `${process.env.BUILD_NUMBER}_${Math.floor(Math.random() * 100000)}`,
  },
  binary: {
    version: '4.0.2',
    skipMD5: true,
  },
  autoStart: true,
}

export { mongodbMemoryServerOptions }
