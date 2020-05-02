const MediaInfo = require('mediainfo.js')
const { promises: { open, readFile } } = require('fs')
const { resolve } = require('path')
const { checkLimits } = require('./helpers/shared-helpers.js')
const { readChunkNode } = require('./helpers/server-helpers.js')

async function register ({ registerSetting, settingsManager, registerHook, getRouter }) {
  registerSetting({
    name: 'instructions',
    label: 'Instructions',
    type: getRouter !== undefined ? 'markdown-enhanced' : 'input-textarea', // use markdown-enhanced only if implemented
    private: false
  })

  registerSetting({
    name: 'fileSize',
    label: 'Maximum file size (Mo)',
    type: 'input',
    private: false
  })

  registerSetting({
    name: 'videoBitrate',
    label: 'Maximum video bitrate (Mbps)',
    type: 'input',
    private: false
  })

  registerSetting({
    name: 'audioBitrate',
    label: 'Maximum audio bitrate (kbps)',
    type: 'input',
    private: false
  })

  registerHook({
    target: 'filter:api.video.upload.accept.result',
    handler: ({ accepted }, { videoFile }) => handler({ accepted, videoFilePath: videoFile.path, videoFileSize: videoFile.size, settingsManager })
  })

  const { version: serverVersion } = JSON.parse(await readFile(resolve(process.cwd(), './package.json')))

  if (parseFloat(serverVersion.substr(0, 3)) >= 2.2) {
    registerHook({
      target: 'filter:api.video.post-import-url.accept.result',
      handler: ({ accepted }, { videoFilePath, videoFile }) => handler({ accepted, videoFilePath, videoFileSize: videoFile.size, settingsManager })
    })

    registerHook({
      target: 'filter:api.video.post-import-torrent.accept.result',
      handler: ({ accepted }, { videoFilePath, videoFile }) => handler({ accepted, videoFilePath, videoFileSize: videoFile.size, settingsManager })
    })
  }
}

async function handler ({ accepted, videoFilePath, videoFileSize, settingsManager }) {
  if (!accepted) {
    console.log('[Plugin Upload Limits]', 'NOT-ACCEPTED', 'by PeerTube itself')
    return {
      accepted: false
    }
  }

  try {
    const [fileSize, videoBitrate, audioBitrate] = await Promise.all([
      settingsManager.getSetting('fileSize'),
      settingsManager.getSetting('videoBitrate'),
      settingsManager.getSetting('audioBitrate')
    ])

    if (!fileSize && !videoBitrate && !audioBitrate) {
      console.log('[Plugin Upload Limits]', 'ACCEPTED', 'No defined limits')

      return {
        accepted: true
      }
    }

    const fileHandle = await open(videoFilePath)

    await checkLimits({
      MediaInfo,
      getSize: () => videoFileSize,
      readChunk: readChunkNode(fileHandle),
      limits: {
        fileSize,
        videoBitrate,
        audioBitrate
      }
    })

    console.log('[Plugin Upload Limits]', 'ACCEPTED', 'VideoFile passed all limits')

    return {
      accepted: true
    }
  } catch (error) {
    console.log('[Plugin Upload Limits]', 'NOT-ACCEPTED', error)

    return {
      accepted: false,
      errorMessage: error.message
    }
  }
}

async function unregister () {}

module.exports = {
  register,
  unregister
}
