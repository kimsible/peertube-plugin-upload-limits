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

function dispatchChangeEventToInputFile (input) {
  input.removeAttribute('disabled')
  input.dispatchEvent(new Event('change'))
}

function cloneInputFile (input) {
  const clonedInput = input.cloneNode(true)
  clonedInput.setAttribute('id', 'cloned-inputfile')
  input.setAttribute('style', 'display:none')
  input.setAttribute('disabled', true)
  input.parentElement.appendChild(clonedInput)

  return { inputFile: input, clonedInputFile: clonedInput }
}

module.exports = {
  disableInputFile,
  enableInputFile,
  dispatchChangeEventToInputFile,
  cloneInputFile
}
