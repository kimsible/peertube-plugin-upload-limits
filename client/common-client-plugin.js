import MediaInfo from 'mediainfo.js'

import { createAlert, createToast, injectToast, injectAlert, disableInputFile, enableInputFile } from '../helpers/client-helpers.js'
import { checkLimits, readChunkBrowser } from '../helpers/shared-helpers.js'

async function register ({ registerHook, peertubeHelpers }) {
  if (peertubeHelpers.isLoggedIn()) {
    // Lazy load plugin settings
    const helperPlugin = new HelperPlugin(peertubeHelpers)
    await waitForSettings(helperPlugin)

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
    const [
      { hasInstructions },
      { videofile, clonedVideofile }
    ] = await Promise.all([
      waitForSettings(helperPlugin),
      waitForRendering(helperPlugin)
    ])

    if (hasInstructions) {
      // Make sure instructions are cached
      helperPlugin.instructions()
        .catch(handleError)
        .then(({ title, content }) => {
          const { showModal } = helperPlugin.peertubeHelpers

          if (showModal !== undefined) {
            showModal({
              title,
              content,
              confirm: {
                value: 'OK'
              }
            })
          } else {
            injectAlert(createAlert('info', `<h5><strong>${title}</strong></h5>${content}`))
          }
        })
    }

    hookUploadInput({
      videofile,
      clonedVideofile,
      helperPlugin
    })
  } catch (error) {
    handleError(error)
  }
}

function hookUploadInput ({
  videofile,
  clonedVideofile,
  helperPlugin
}) {
  const dispatchChangeToOriginVideofile = () => {
    videofile.removeAttribute('disabled')
    videofile.dispatchEvent(new Event('change'))
  }

  clonedVideofile.addEventListener('change', async () => {
    const file = clonedVideofile.files[0]

    if (file) {
      const { settings, needMediaInfoLib, peertubeHelpers } = helperPlugin

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
        // Fetch MediaInfoModule.wasm to ensure fully cached
        if (needMediaInfoLib) {
          await fetch(`${peertubeHelpers.getBaseStaticRoute()}/wasm/MediaInfoModule.wasm`)
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
            injectToast(createToast('error', {
              title: helperPlugin.translations.toastTitleError,
              content: error
            }))
          }
        })

        // Restore original label text and re-enable cloned video file
        enableInputFile(clonedVideofile)
      }
    }
  })
}

function handleError (error) {
  console.error(error)
}

function waitForSettings (helperPlugin) {
  return helperPlugin.getSettings()
    .then(({ hasInstructions, needMediaInfoLib }) => {
      helperPlugin.lazyLoadTranslations().catch(handleError)
      if (hasInstructions) helperPlugin.instructions().catch(handleError)
      // if (needMediaInfoLib) helperPlugin.loadMediaInfoLib().catch(handleError)

      return helperPlugin
    })
}

async function waitForRendering (helperPlugin) {
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
          const { videofile, clonedVideofile } = await waitForRendering()

          hookUploadInput({
            videofile,
            clonedVideofile,
            helperPlugin
          })
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

  async instructions () {
    if (this.instructionsHTML.length === 0) {
      const { markdownRenderer } = this.peertubeHelpers

      if (typeof markdownRenderer !== 'undefined') {
        const html = await markdownRenderer.enhancedMarkdownToHTML(this.settings.instructions)
        this.instructionsHTML = html
      } else {
        const marked = await import(/* webpackChunkName: "marked" */ 'marked').then(module => module.default)
        this.instructionsHTML = marked(this.settings.instructions, { breaks: true })
      }
    }

    return {
      title: this.translations.instructionsTitle || 'Upload instructions',
      content: this.instructionsHTML
    }
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

    if (this.settings.instructions !== undefined) {
      promises.push(this.peertubeHelpers.translate('upload-limits-client-instructionsTitle').then(title => {
        this.translations.instructionsTitle = title
      }))
    }

    return Promise.all(promises)
  }
}

export {
  register
}
