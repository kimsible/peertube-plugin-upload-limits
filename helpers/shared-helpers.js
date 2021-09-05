async function checkLimits ({
  MediaInfoFactory,
  getSize,
  readChunk,
  limits,
  locateFile
}) {
  let errors = []
  if (limits.fileSize) {
    if (getSize() > limits.fileSize * 1000000) {
      errors = [`File size exceeds the maximum allowed: ${limits.fileSize} Mo.`]
    }
  }

  if (MediaInfoFactory !== undefined && (limits.videoBitrate || limits.audioBitrate)) {
    const mediainfo = await MediaInfoFactory({ locateFile })

    const { media } = await mediainfo.analyzeData(getSize, readChunk)

    media.track.forEach((track) => {
      if (limits.videoBitrate && track['@type'] === 'Video') {
        if (track.BitRate > limits.videoBitrate * 1000000) {
          errors = [...errors, `Video bit rate exceeds the maximum allowed: ${limits.videoBitrate} Mbps.`]
        }
      }

      if (limits.audioBitrate && track['@type'] === 'Audio') {
        if (track.BitRate > limits.audioBitrate * 1000) {
          errors = [...errors, `Audio bit rate exceeds the maximum allowed: ${limits.audioBitrate} kbps.`]
        }
      }
    })
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'))
  }
}

function readChunkBrowser (file) {
  return (chunkSize, offset) =>
    new Promise((resolve, reject) => {
      const reader = new window.FileReader()

      reader.onload = (event) => {
        if (event.target.error) {
          reject(event.target.error)
        }
        resolve(new Uint8Array(event.target.result))
      }

      reader.readAsArrayBuffer(file.slice(offset, offset + chunkSize))
    })
}

module.exports = {
  checkLimits,
  readChunkBrowser
}
