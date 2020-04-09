function createToast (type, { title, content }) {
  const toastItem = document.createElement('p-toastitem')

  const toastMessage = document.createElement('div')
  toastMessage.classList.add('ui-toast-message', 'ui-shadow', `ui-toast-message-${type}`)

  const toastMessageContent = document.createElement('div')
  toastMessageContent.classList.add('ui-toast-message-content')

  const toastIcon = document.createElement('a')
  toastIcon.classList.add('ui-toast-close-icon')

  const toastNotificationBlock = document.createElement('div')
  toastNotificationBlock.classList.add('notification-block')

  const message = document.createElement('div')
  message.classList.add('message')

  const h3 = document.createElement('h3')
  h3.textContent = title

  const p = document.createElement('p')
  p.textContent = content

  const icon = document.createElement('span')
  if (type === 'success') {
    icon.classList.add('glyphicon', 'glyphicon-ok')
  } else if (type === 'error') {
    icon.classList.add('glyphicon', 'glyphicon-remove')
  }

  message.appendChild(h3)
  message.appendChild(p)
  toastNotificationBlock.appendChild(message)
  toastNotificationBlock.appendChild(icon)
  toastMessageContent.appendChild(toastIcon)
  toastMessageContent.appendChild(toastNotificationBlock)
  toastMessage.appendChild(toastMessageContent)
  toastItem.appendChild(toastMessage)
  return toastItem
}

function injectToast (toast, timeout = 10000) {
  const container = document.querySelector('p-toast').firstChild
  container.appendChild(toast)
  toast.firstChild.setAttribute('style', 'animation: toastin 0.7s')
  setTimeout(() => {
    toast.firstChild.setAttribute('style', 'animation: toastout 0.7s')
    setTimeout(() => { container.removeChild(toast) }, 700)
  }, timeout)
}

// Using old DOM functions for old-browser compatibility
function createAlert (type, content) {
  const alert = document.createElement('div')
  alert.className = `alert alert-${type}`
  alert.innerHTML = content
  return alert
}

// Using old DOM functions for old-browser compatibility
function injectAlert (alert) {
  const container = document.querySelector('my-videos-add').childNodes[0]
  container.insertBefore(alert, container.childNodes[0])
}

// Using old DOM functions for old-browser compatibility
// For old browsers use disableInputFile(input, false)
function disableInputFile (input, spinner = true) {
  const container = input.parentElement || input.parentNode
  const span = container.childNodes[0]
  input.setAttribute('disabled', true)
  container.className = `${container.className} disabled`
  if (spinner) {
    span.setAttribute('_innerText', span.innerText)
    span.innerText = ''
    span.classList.add('disabled-input-spinner')
  }
}

function enableInputFile (input) {
  const container = input.parentElement
  const span = container.firstChild
  container.classList.remove('disabled')
  span.classList.remove('disabled-input-spinner')
  const innerText = span.getAttribute('_innerText')
  if (innerText) {
    span.innerText = innerText
    span.removeAttribute('_innerText')
  }
  input.removeAttribute('disabled')
}

module.exports = {
  createAlert,
  createToast,
  injectToast,
  injectAlert,
  disableInputFile,
  enableInputFile
}
