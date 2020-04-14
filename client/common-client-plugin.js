import { createAlert, createToast, injectToast, injectAlert, disableInputFile, enableInputFile } from '../helpers/client-helpers.js'
import { checkLimits, readChunkBrowser } from '../helpers/shared-helpers.js'

async function register ({ registerHook, peertubeHelpers }) {
  if (peertubeHelpers.isLoggedIn()) {
    registerHook({
      target: 'action:router.navigation-end',
      handler: ({ path }) => handler({ path, peertubeHelpers })
    })
  }
}

function init (peertubeHelpers) {
  let outdatedBrowser, helperPlugin

  // Checking fetch and WebAssembly browser support
  if (!window.fetch || !(typeof window.WebAssembly === 'object' && typeof window.WebAssembly.instantiate === 'function')) {
    outdatedBrowser = true
  }

  // Instanciate HelperPlugin
  if (!outdatedBrowser) {
    helperPlugin = new HelperPlugin(peertubeHelpers)
  }

  return [
    outdatedBrowser,
    helperPlugin
  ]
}

async function handler ({ path, peertubeHelpers }) {
  const handleError = (error) => {
    console.error(error)
  }

  try {
    // Init
    const [outdatedBrowser, helperPlugin] = init(peertubeHelpers)

    const waitForSettings = () => {
      if (!outdatedBrowser) {
        return helperPlugin.getSettings()
          .then(({ needMarkedModule, needMediaInfoLib }) => {
            helperPlugin.lazyLoadTranslations().catch(handleError)
            if (needMarkedModule) helperPlugin.loadMarkedModule().catch(handleError)
            if (needMediaInfoLib) helperPlugin.loadMediaInfoLib().catch(handleError)

            return helperPlugin
          })
      }
    }

    const waitForRendering = async () => {
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

      if (outdatedBrowser) {
        injectAlert(createAlert('error', 'Your web browser is out of date <a href="https://browser-update.org/update.html?force_outdated=true" target="_blank" class="action-button grey-button"><span class="button-label">Update browser</span></a>'))
        // Disable videofile input without spinner
        disableInputFile(videofile, false)
        throw new Error('Your web browser is out of date')
      }

      // Clone and hide the videofile input to not dispatch-event default upload
      const clonedVideofile = videofile.cloneNode(true)
      clonedVideofile.setAttribute('id', 'cloned-videofile')
      videofile.setAttribute('style', 'display:none')
      videofile.setAttribute('disabled', true)
      videofile.parentElement.appendChild(clonedVideofile)

      return { videofile, clonedVideofile }
    }

    // If entry-route is not /videos/upload lazy load all plugin
    if (path !== '/videos/upload') {
      await waitForSettings()
      return
    }

    const [
      { settings, needMarkedModule, needMediaInfoLib },
      { videofile, clonedVideofile }
    ] = await Promise.all([waitForSettings(), waitForRendering()])

    if (needMarkedModule) {
      // Make sure marked.js is cached and markdown parsed
      helperPlugin.loadMarkedModule()
        .catch(handleError)
        .then(instructionsHTML => {
          // Display instructions
          injectAlert(createAlert('info', instructionsHTML))
        })
    }

    const dispatchChangeToOriginVideofile = () => {
      videofile.removeAttribute('disabled')
      videofile.dispatchEvent(new window.Event('change'))
    }

    clonedVideofile.addEventListener('change', async () => {
      const file = clonedVideofile.files[0]

      if (file) {
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
          // Fetch mediainfo.wasm to ensure fully cached
          if (needMediaInfoLib) {
            await window.fetch(`${peertubeHelpers.getBaseStaticRoute().replace('static', 'client-scripts/dist')}/mediainfo.wasm`)
          }

          await checkLimits({
            MediaInfo,
            getSize: () => file.size,
            readChunk: readChunkBrowser(file),
            limits: settings,
            translations: helperPlugin.translations
          })

          // Copy FileList to original videofile input and dispatch-event change
          videofile.files = clonedVideofile.files

          dispatchChangeToOriginVideofile()
        } catch (error) {
          // Notify user with as toast as errors
          error.message.split('\n').forEach(error => {
            injectToast(createToast('error', { title: helperPlugin.translations['toast-title'], content: error }))
          })

          // Restore original label text and re-enable cloned video file
          enableInputFile(clonedVideofile)
        }
      }
    })
  } catch (error) {
    handleError(error)
  }
}

class HelperPlugin {
  constructor (peertubeHelpers) {
    this.peertubeHelpers = peertubeHelpers
    this.settings = {}
    this.translations = {}
    this.instructionsHTML = ''
    this.needMediaInfoLib = false
    this.needMarkedModule = false
  }

  async getSettings () {
    this.settings = await this.peertubeHelpers.getSettings()
    this.needMediaInfoLib = this.settings.videoBitrate !== undefined || this.settings.audioBitrate !== undefined
    this.needMarkedModule = this.settings.instructions && true

    return this
  }

  getTranslation (limit) {
    return this.peertubeHelpers.translate(`upload-limits-client-${limit}-error`)
      .then(translation => {
        this.translations[`${limit}Error`] = translation

        return translation
      })
  }

  loadMarkedModule () {
    return import('marked')
      .then(module => module.default)
      .then(marked => {
        if (this.instructionsHTML === '') {
          this.instructionsHTML = marked(this.settings.instructions, { breaks: true })
        }

        return this.instructionsHTML
      })
  }

  loadMediaInfoLib () {
    return import('mediainfo.js')
      .then(() => {
        if (MediaInfo === undefined) Promise.reject(new Error('Loading MediaInfoLib failed'))
      })
  }

  lazyLoadTranslations () {
    const promises = []

    if (this.settings.fileSize !== undefined) {
      promises.push(this.getTranslation('fileSize'))
    }

    if (this.settings.videoBitrate !== undefined) {
      promises.push(this.getTranslation('videoBitrate'))
    }

    if (this.settings.audioBitrate !== undefined) {
      promises.push(this.getTranslation('audioBitrate'))
    }

    if (this.settings.fileSize !== undefined || this.settings.videoBitrate !== undefined || this.settings.audioBitrate !== undefined) {
      promises.push(this.getTranslation('toast-title'))
    }

    return Promise.all(promises)
  }
}

export {
  register
}
