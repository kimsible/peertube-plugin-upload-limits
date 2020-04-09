const MediaInfo = require('mediainfo.js')
const { promises: { open } } = require('fs')
const { checkLimits, readChunkNode } = require('./helpers/shared-helpers.js')

async function register ({ registerSetting, settingsManager, registerHook }) {
  registerSetting({
    name: 'instructions',
    label: 'Instructions',
    type: 'input-textarea',
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
    handler: async ({ accepted }, { videoFile }) => {
      if (!accepted) {
        console.log('[Plugin Upload Limits]', 'NOT-ACCEPTED', 'by PeerTube itself')
        return { accepted: false }
      }

      try {
        const [fileSize, videoBitrate, audioBitrate] = await Promise.all([
          settingsManager.getSetting('fileSize'),
          settingsManager.getSetting('videoBitrate'),
          settingsManager.getSetting('audioBitrate')
        ])

        if (!fileSize && !videoBitrate && !audioBitrate) {
          console.log('[Plugin Upload Limits]', 'ACCEPTED', 'No defined limits')

          return { accepted: true }
        }

        const fileHandle = await open(videoFile.path)

        await checkLimits({
          MediaInfo,
          getSize: () => videoFile.size,
          readChunk: readChunkNode(fileHandle),
          limits: { fileSize, videoBitrate, audioBitrate }
        })

        console.log('[Plugin Upload Limits]', 'ACCEPTED', 'VideoFile passed all limits')

        return { accepted: true }
      } catch (error) {
        console.log('[Plugin Upload Limits]', 'NOT-ACCEPTED', error)

        return { accepted: false }
      }
    }
  })
}

async function unregister () {}

module.exports = {
  register,
  unregister
}
