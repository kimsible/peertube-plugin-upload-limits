const test = require('ava')
const MediaInfoFactory = require('mediainfo.js')

const { promises: { readFile, open } } = require('fs')
const { readChunkBrowser, checkLimits } = require('../helpers/shared-helpers.js')
const { readChunkNode } = require('../helpers/server-helpers.js')

const filepath = './test/sample-media.mp4'

test('shared-helpers - readChunk Comparison', async t => {
  const chunkSize = 1024
  const offset = 512

  const file = new window.File([await readFile(filepath)], filepath)
  const fileHandle = await open(filepath, 'r')

  const browserOutput = await readChunkBrowser(file)(chunkSize, offset)
  const nodeOutput = await readChunkNode(fileHandle)(chunkSize, offset)

  t.deepEqual(browserOutput, nodeOutput)

  await fileHandle.close()
})

test('shared-helpers - checkLimits - no exceed', testCheckLimits, { fileSize: '10', videoBitrate: '10', audioBitrate: '384' })

test('shared-helpers - checkLimits - exceeded size', testCheckLimits, { fileSize: '1' }, {
  message: 'File size exceeds the maximum allowed: 1 Mo.'
})

test('shared-helpers - checkLimits - exceeded video bitrate', testCheckLimits, { videoBitrate: '1' }, {
  message: 'Video bit rate exceeds the maximum allowed: 1 Mbps.'
})

test('shared-helpers - checkLimits - exceeded audio bitrate', testCheckLimits, { audioBitrate: '10' }, {
  message: 'Audio bit rate exceeds the maximum allowed: 10 kbps.'
})

test('shared-helpers - checkLimits - exceeded all', testCheckLimits, { fileSize: '1', videoBitrate: '1', audioBitrate: '10' }, {
  message: `File size exceeds the maximum allowed: 1 Mo.
Video bit rate exceeds the maximum allowed: 1 Mbps.
Audio bit rate exceeds the maximum allowed: 10 kbps.`
})

async function testCheckLimits (t, limits, expectedError) {
  const fileHandle = await open(filepath, 'r')
  const { size } = await fileHandle.stat()

  const getSize = () => size
  const readChunk = readChunkNode(fileHandle)

  if (expectedError) {
    await t.throwsAsync(() => checkLimits({ MediaInfoFactory, getSize, readChunk, limits }), expectedError)
  } else {
    await t.notThrowsAsync(() => checkLimits({ MediaInfoFactory, getSize, readChunk, limits }))
  }

  await fileHandle.close()
}
