import {
  disableInputFile,
  enableInputFile,
  cloneInputFile,
  dispatchChangeEventToInputFile,
} from '../helpers/client-helpers.js'
import { checkLimits, readChunkBrowser } from '../helpers/shared-helpers.js'

export {
  register
}

async function register ({ registerHook, peertubeHelpers }) {
  if (peertubeHelpers.isLoggedIn()) {
    // Init plugin helper
    const helperPlugin = new HelperPlugin(peertubeHelpers)

    // Pre-load plugin settings and libraries
    helperPlugin.lazyLoad()

    // Run when route is /videos/upload
    registerHook({
      target: 'action:router.navigation-end',
      handler: ({ path }) => {
        if (path === '/videos/upload') {
          createContentObserver(videofile => {
            hookUploadInput(helperPlugin, cloneInputFile(videofile)) // Clone and hide the videofile input to not dispatch-event default upload
          })
        }
      }
    })

    // Run when refresh or manually enter /videos/upload route in browser
    if (window.location.pathname === '/videos/upload') {
      createContentObserver(videofile => {
        hookUploadInput(helperPlugin, cloneInputFile(videofile))
      })
    }
  }
}

function hookUploadInput (helperPlugin, { inputFile, clonedInputFile }) {
  clonedInputFile.addEventListener('change', async () => {
    const file = clonedInputFile.files[0]

    if (file) {
      const {
        settings,
        needMediaInfoLib,
        peertubeHelpers,
        loadMediaInfoLib
      } = helperPlugin

      const { fileSize } = settings
      if (!fileSize && !needMediaInfoLib) {
        // Copy FileList to original videofile input and dispatch-event change
        inputFile.files = clonedInputFile.files
        dispatchChangeEventToInputFile(inputFile)
        return
      }

      // Disable cloned videofile input to display spinner while checking limits
      disableInputFile(clonedInputFile)

      try {
        await checkLimits({
          MediaInfoFactory: needMediaInfoLib ? await loadMediaInfoLib() : undefined,
          getSize: () => file.size,
          readChunk: readChunkBrowser(file),
          limits: settings,
          locateFile: () => `${peertubeHelpers.getBaseStaticRoute()}/assets/MediaInfoModule.wasm`,
        })

        // Copy FileList to original videofile input and dispatch-event change
        inputFile.files = clonedInputFile.files
        dispatchChangeEventToInputFile(inputFile)
      } catch (error) {
        const { notifier, translate } = peertubeHelpers

        // Notify user with as toast as errors
        error.message.split('\n').forEach(async error => {
          const [message, data] = error.split(':')
          notifier.error(await translate(message + ':') + data)
        })

        // Restore original label text and re-enable cloned video file
        enableInputFile(clonedInputFile)
      }
    }
  })
}

function createContentObserver (callback) {
  const content = document.getElementById('content')

  const observer = new MutationObserver(async mutations => {
    for (const mutation of mutations) {
      const { type, addedNodes } = mutation

      if (type === 'childList') {
        addedNodes.forEach(node => {
          if (node instanceof HTMLElement && /my-video-upload/i.test(node.tagName)) {
            callback(node.querySelector('#videofile'))
          }
        })
      }
    }
  })

  observer.observe(content, { childList: true, subtree: true })
}

class HelperPlugin {
  constructor (peertubeHelpers) {
    this.peertubeHelpers = peertubeHelpers
    this.settings = {}
    this.needMediaInfoLib = false
  }

  lazyLoad () {
    return this.peertubeHelpers.getSettings()
      .then(settings => {
        this.settings = settings
        this.needMediaInfoLib = settings.videoBitrate !== undefined || settings.audioBitrate !== undefined
        if (this.needMediaInfoLib) this.loadMediaInfoLib().catch(error => console.error(error))
      })
  }

  loadMediaInfoLib () {
    return import('mediainfo.js')
      .then(module => module.default)
      .then(() => MediaInfo)
  }
}
