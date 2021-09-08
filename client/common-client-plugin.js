import { spinner } from './spinner.module.css'
import { clone } from '../helpers/client-helpers.js'
import { checkLimits, readChunkBrowser } from '../helpers/shared-helpers.js'

export {
  register
}

async function register ({ registerHook, peertubeHelpers }) {
  if (peertubeHelpers.isLoggedIn()) {
    // Init plugin helper
    const helper = new HelperPlugin(peertubeHelpers)

    // Pre-load plugin settings and libraries
    await helper.lazyLoad()

    // Run when route is /videos/upload
    registerHook({
      target: 'action:router.navigation-end',
      handler: ({ path }) => {
        if (path === '/videos/upload') {
          connect(hook.bind(helper))
        }
      }
    })

    // Run when refresh or manually enter /videos/upload route in browser
    if (window.location.pathname === '/videos/upload') {
      connect(hook.bind(helper))
    }
  }
}

function hook (input) {
  // No settings defined - no hook
  if (!this.settings.fileSize && !this.needMediaInfoLib) return

  // Clone and hide the videofile input to not dispatch-event default upload
  clone(input).addEventListener('change', async ({ target: cloned }) => {
    const file = cloned.files[0]

    if (file) {
      const parentClassName = cloned.parentElement.className

      // Disable cloned videofile input to display spinner while checking limits
      cloned.setAttribute('disabled', true)
      cloned.parentElement.className = `${parentClassName} ${spinner}`

      try {
        await checkLimits({
          MediaInfoFactory: this.needMediaInfoLib ? await this.loadMediaInfoLib() : undefined,
          getSize: () => file.size,
          readChunk: readChunkBrowser(file),
          limits: this.settings,
          locateFile: () => `${this.peertubeHelpers.getBaseStaticRoute()}/assets/MediaInfoModule.wasm`,
        })

        // Copy FileList to original videofile input and dispatch-event change
        input.files = cloned.files
        input.removeAttribute('disabled')
        input.dispatchEvent(new Event('change'))
      } catch (error) {
        const { notifier, translate } = this.peertubeHelpers

        // Notify user with as toast as errors
        error.message.split('\n').forEach(async error => {
          const [message, data] = error.split(':')
          notifier.error(await translate(message + ':') + data)
        })

        // Restore original label text and re-enable cloned video file
        cloned.removeAttribute('disabled')
        cloned.parentElement.className = parentClassName
      }
    }
  })
}

function connect (callback) {
  const videofile = document.getElementById('videofile')
  if (videofile) callback(videofile) // if videofile already rendered

  const content = document.getElementById('content')

  const observer = new MutationObserver(mutations => {
    for (const { addedNodes, removedNodes } of mutations) {
      addedNodes.forEach(node => {
        if (node.localName === 'my-video-upload') {
          callback(node.querySelector('#videofile'))
        }

        if (node.localName === 'my-video-edit') { // if component of video-editing is added - disconnect
          observer.disconnect()
        }
      })

      removedNodes.forEach(node => {
        if (node.localName === 'my-videos-add') { // if main-component is removed - disconnect
          observer.disconnect()
        }
      })
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
