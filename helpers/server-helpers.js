function readChunkNode (fileHandle) {
  return (chunkSize, offset) =>
    fileHandle.read(Buffer.alloc(chunkSize), 0, chunkSize, offset)
      .then(({ buffer }) => new Uint8Array(buffer))
}

module.exports = {
  readChunkNode
}
