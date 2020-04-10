import { createAlert, createToast, injectToast, injectAlert, disableInputFile, enableInputFile } from '../helpers/client-helpers.js'
import { checkLimits, readChunkBrowser } from '../helpers/shared-helpers.js'

async function register ({ registerHook, peertubeHelpers }) {
  registerHook({
    target: 'action:router.navigation-end',
    handler: ({ path }) => initClient({ path, peertubeHelpers })
  })
}

async function initClient ({ path, peertubeHelpers }) {
  if (path !== '/videos/upload') return

  try {
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
  } catch (error) {
    console.error(error)
    return
  }

  const videofile = document.getElementById('videofile')

  // Checking fetch and WebAssembly browser support
  if (!window.fetch || !(typeof window.WebAssembly === 'object' && typeof window.WebAssembly.instantiate === 'function')) {
    injectAlert(createAlert('error', 'Your web browser is out of date <a href="https://browser-update.org/update.html?force_outdated=true" target="_blank" class="action-button grey-button"><span class="button-label">Update browser</span></a>'))
    // Disable videofile input without spinner
    disableInputFile(videofile, false)
    return
  }

  // Disable and display spinner in videofile input while plugin is not fully loaded
  disableInputFile(videofile)

  try {
    const { instructions, fileSize, videoBitrate, audioBitrate } = await peertubeHelpers.getSettings()

    if (instructions) {
      // Lazy load marked
      const { default: marked } = await import('marked')
      injectAlert(createAlert('info', marked(instructions, { sanitize: true, breaks: true })))
    }

    if (!fileSize && !videoBitrate && !audioBitrate) {
      // Re-enable videofile input
      enableInputFile(videofile)
      return
    }

    // Clone and hide the videofile input to not dispatch-event default upload
    const clonedVideofile = videofile.cloneNode(true)
    clonedVideofile.setAttribute('id', 'cloned-videofile')
    videofile.setAttribute('style', 'display:none')
    videofile.parentElement.insertBefore(clonedVideofile, videofile)

    // - Load translations
    // - Lazy load MediaInfo
    // - Fetch mediainfo.wasm to ensure fully cached
    const [
      fileSizeError,
      videoBitrateError,
      audioBitrateError,
      toastErrorTitle
    ] = await Promise.all([
      peertubeHelpers.translate('upload-limits-client-fileSize-error'),
      peertubeHelpers.translate('upload-limits-client-videoBitrate-error'),
      peertubeHelpers.translate('upload-limits-client-audioBitrate-error'),
      peertubeHelpers.translate('upload-limits-client-toast-error-title'),
      import('mediainfo.js'),
      window.fetch(`${peertubeHelpers.getBaseStaticRoute().replace('static', 'client-scripts/dist')}/mediainfo.wasm`)
    ])

    // Re-enable cloned videofile input once plugin is fully loaded
    enableInputFile(clonedVideofile)

    clonedVideofile.addEventListener('change', async () => {
      const file = clonedVideofile.files[0]

      if (file) {
        // Disable cloned videofile input while checking limits
        disableInputFile(clonedVideofile)

        const limits = { fileSize, videoBitrate, audioBitrate }

        const translations = { fileSizeError, videoBitrateError, audioBitrateError }

        try {
          await checkLimits({ MediaInfo, getSize: () => file.size, readChunk: readChunkBrowser(file), limits, translations })

          // Re-enable videofile input in case disabled
          videofile.removeAttribute('disabled')

          // Copy FileList to original videofile input and dispatch-event change
          videofile.files = clonedVideofile.files
          videofile.dispatchEvent(new window.Event('change'))
        } catch (error) {
          // Notify user with as toast as errors
          error.message.split('\n').forEach(error => {
            injectToast(createToast('error', { title: toastErrorTitle, content: error }))
          })

          // Restore original label text and re-enable cloned video file
          enableInputFile(clonedVideofile)
        }
      }
    })
  } catch (error) {
    // Re-enable videofile input
    enableInputFile(videofile)

    // Console log any errors
    console.error('Plugin Upload Limits', error)
  }
}

export {
  register
}
