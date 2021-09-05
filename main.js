const MediaInfoFactory = require('mediainfo.js')
const { promises: { open } } = require('fs')
const { checkLimits } = require('./helpers/shared-helpers.js')
const { readChunkNode } = require('./helpers/server-helpers.js')

async function register ({ registerSetting, settingsManager, registerHook }) {
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

  const instructions = await settingsManager.getSetting('instructions')

  if (instructions) {
    registerSetting({
      name: 'instructions',
      label: 'Instructions - DEPRECATED - please use upload-instructions plugin instead',
      type: 'markdown-enhanced',
      private: false
    })
  }

  registerHook({
    target: 'filter:api.video.upload.accept.result',
    handler: ({ accepted }, { videoFile }) => handler({ accepted, videoFilePath: videoFile.path, videoFileSize: videoFile.size, settingsManager })
  })

  registerHook({
    target: 'filter:api.video.post-import-url.accept.result',
    handler: ({ accepted }, { videoFilePath, videoFile }) => handler({ accepted, videoFilePath, videoFileSize: videoFile.size, settingsManager })
  })

  registerHook({
    target: 'filter:api.video.post-import-torrent.accept.result',
    handler: ({ accepted }, { videoFilePath, videoFile }) => handler({ accepted, videoFilePath, videoFileSize: videoFile.size, settingsManager })
  })
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
      MediaInfoFactory,
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
