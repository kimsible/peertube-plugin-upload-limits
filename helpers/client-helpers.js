function disableInputFile (input, spinner = true) {
  const container = input.parentElement
  const span = container.firstChild
  input.setAttribute('disabled', true)
  container.classList.add('disabled')
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
  disableInputFile,
  enableInputFile
}
