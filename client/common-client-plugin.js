import 'mediainfo.js'
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
  let outdatedBrowser

  // Checking fetch and WebAssembly browser support
  if (!window.fetch || !(typeof window.WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function')) {
    outdatedBrowser = true
  }

  // Instanciate HelperPlugin
  const helperPlugin = new HelperPlugin(peertubeHelpers)

  return { outdatedBrowser, helperPlugin }
}

async function handler ({ path, peertubeHelpers }) {
  const handleError = (error) => {
    console.error(error)
  }

  try {
    // Init
    const { outdatedBrowser, helperPlugin } = init(peertubeHelpers)

    const waitForSettings = () => {
      return helperPlugin.getSettings()
        .then(({ hasInstructions, needMediaInfoLib }) => {
          helperPlugin.lazyLoadTranslations().catch(handleError)
          if (hasInstructions) helperPlugin.instructions.catch(handleError)
          // if (needMediaInfoLib) helperPlugin.loadMediaInfoLib().catch(handleError)

          return helperPlugin
        })
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
        injectAlert(createAlert('warning', 'Your web browser is out of date, you can only benefit video checking server-side <a href="https://browser-update.org/update.html?force_outdated=true" target="_blank" class="action-button grey-button"><span class="button-label">Update browser</span></a>'))
        return {}
      }

      // No support with multitabs (activated URL and Torrent imports)
      const tabs = document.querySelectorAll('.video-add-tabset > .nav-tabs .nav-item')
      if (tabs.length > 1) {
        injectAlert(createAlert('warning', 'No video checking support with enabled URL or torrent import.'))
        return { tabs }
      }

      // Clone and hide the videofile input to not dispatch-event default upload
      const clonedVideofile = videofile.cloneNode(true)
      clonedVideofile.setAttribute('id', 'cloned-videofile')
      videofile.setAttribute('style', 'display:none')
      videofile.setAttribute('disabled', true)
      videofile.parentElement.appendChild(clonedVideofile)

      return { videofile, clonedVideofile, tabs }
    }

    // If entry-route is not /videos/upload lazy load all plugin
    if (path !== '/videos/upload') {
      await waitForSettings()
      return
    }

    const [
      { settings, hasInstructions, needMediaInfoLib },
      { videofile, clonedVideofile, tabs }
    ] = await Promise.all([waitForSettings(), waitForRendering()])

    if (hasInstructions) {
      // Make sure marked.js is cached and markdown parsed
      helperPlugin.instructions
        .catch(handleError)
        .then(instructionsHTML => {
          const { showModal } = peertubeHelpers

          if (showModal !== undefined) {
            showModal({
              title: 'Instructions',
              content: instructionsHTML,
              confirm: {
                value: 'OK'
              }
            })
          } else {
            injectAlert(createAlert('info', instructionsHTML))
          }
        })
    }

    if (outdatedBrowser || tabs.length > 1) return

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
            await fetch(`${peertubeHelpers.getBaseStaticRoute()}/wasm/mediainfo.wasm`)
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
          const { notifier } = peertubeHelpers

          // Notify user with as toast as errors
          error.message.split('\n').forEach(error => {
            if (notifier !== undefined) {
              notifier.error(error)
            } else {
              injectToast(createToast('error', { title: helperPlugin.translations.toastTitleError, content: error }))
            }
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
    this.hasInstructions = false
  }

  async getSettings () {
    this.settings = await this.peertubeHelpers.getSettings()
    this.needMediaInfoLib = this.settings.videoBitrate !== undefined || this.settings.audioBitrate !== undefined
    this.hasInstructions = this.settings.instructions && true

    return this
  }

  get instructions () {
    if (this.instructionsHTML.length > 0) {
      return Promise.resolve(this.instructionsHTML)
    }

    const { markdownRenderer } = this.peertubeHelpers

    if (typeof markdownRenderer !== 'undefined') {
      return markdownRenderer.enhancedMarkdownToHTML(this.settings.instructions)
        .then(html => {
          this.instructionsHTML = html
          return this.instructionsHTML
        })
    }

    return import(/* webpackChunkName: "marked" */ 'marked')
      .then(module => module.default)
      .then(marked => {
        this.instructionsHTML = marked(this.settings.instructions, { breaks: true })
        return this.instructionsHTML
      })
  }

  getTranslation (limit) {
    return this.peertubeHelpers.translate(`upload-limits-client-${limit}-error`)
      .then(translation => {
        this.translations[`${limit}Error`] = translation

        return translation
      })
  }

  /*
  loadMediaInfoLib () {
    return import(/* webpackChunkName: "mediainfo" *//* 'mediainfo.js')
      .then(() => {
        if (MediaInfo === undefined) Promise.reject(new Error('Loading MediaInfoLib failed'))
      })
  } */

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
      promises.push(this.getTranslation('toastTitle'))
    }

    return Promise.all(promises)
  }
}

export {
  register
}
