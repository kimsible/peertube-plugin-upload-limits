import { disableInputFile, enableInputFile } from '../helpers/client-helpers.js'
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
          handler(helperPlugin)
        }
      }
    })

    // Run when refresh or manually enter /videos/upload route in browser
    if (window.location.pathname === '/videos/upload') {
      handler(helperPlugin)
    }
  }
}

async function handler (helperPlugin) {
  try {
    hookUploadInput(helperPlugin, await videofileRendering(helperPlugin))
  } catch (error) {
    handleError(error)
  }
}

function handleError (error) {
  console.error(error)
}

function hookUploadInput (helperPlugin, { videofile, clonedVideofile}) {
  const dispatchChangeToOriginVideofile = () => {
    videofile.removeAttribute('disabled')
    videofile.dispatchEvent(new Event('change'))
  }

  clonedVideofile.addEventListener('change', async () => {
    const file = clonedVideofile.files[0]

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
        videofile.files = clonedVideofile.files

        dispatchChangeToOriginVideofile()
        return
      }

      // Disable cloned videofile input to display spinner while checking limits
      disableInputFile(clonedVideofile)

      try {
        await checkLimits({
          MediaInfoFactory: needMediaInfoLib ? await loadMediaInfoLib() : undefined,
          getSize: () => file.size,
          readChunk: readChunkBrowser(file),
          limits: settings,
          locateFile: () => `${peertubeHelpers.getBaseStaticRoute()}/assets/MediaInfoModule.wasm`,
        })

        // Copy FileList to original videofile input and dispatch-event change
        videofile.files = clonedVideofile.files

        dispatchChangeToOriginVideofile()
      } catch (error) {
        const { notifier, translate } = peertubeHelpers

        // Notify user with as toast as errors
        error.message.split('\n').forEach(async error => {
          const [message, data] = error.split(':')
          notifier.error(await translate(message + ':') + data)
        })

        // Restore original label text and re-enable cloned video file
        enableInputFile(clonedVideofile)
      }
    }
  })
}

async function videofileRendering (helperPlugin) {
  // Waiting for DOMContent updated with a timeout of 5 seconds
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      clearInterval(interval)
      reject(new Error('DOMContent cannot be loaded'))
    }, 5000)

    // Waiting for videofile input in DOM
    const interval = setInterval(() => {
      if (document.getElementById('videofile') !== null) {
        clearTimeout(timeout)
        clearInterval(interval)
        resolve()
      }
    }, 10)
  })

  const videofile = document.getElementById('videofile')

  // First rendering
  if (helperPlugin) {
    createComponentObserver(helperPlugin)
  }

  // Clone and hide the videofile input to not dispatch-event default upload
  const clonedVideofile = videofile.cloneNode(true)
  clonedVideofile.setAttribute('id', 'cloned-videofile')
  videofile.setAttribute('style', 'display:none')
  videofile.setAttribute('disabled', true)
  videofile.parentElement.appendChild(clonedVideofile)

  return { videofile, clonedVideofile }
}

function createComponentObserver (helperPlugin) {
  const component = document.querySelector('my-videos-add')

  const observer = new MutationObserver(async mutations => {
    for (const mutation of mutations) {
      const { type, addedNodes } = mutation

      // Re-run hookUploadInput if my-video-upload component is re-loaded
      const node = addedNodes[0]
      if (type === 'childList' && node instanceof HTMLElement) {
        if (/my-video-upload/i.test(node.parentElement.tagName) && /upload-video-container/.test(node.classList.value)) {
          hookUploadInput(helperPlugin, await videofileRendering())
        }
      }
    }
  })

  observer.observe(component, { childList: true, subtree: true })
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
        if (this.needMediaInfoLib) this.loadMediaInfoLib().catch(handleError)
      })
  }

  loadMediaInfoLib () {
    return import('mediainfo.js')
      .then(module => module.default)
      .then(() => MediaInfo)
  }
}
