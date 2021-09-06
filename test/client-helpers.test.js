const test = require('ava')

const {
  disableInputFile,
  enableInputFile,
  cloneInputFile
} = require('../helpers/client-helpers.js')

test('client-helpers - disableInputFile - with spinner', testDisableEnableInputFile, true, true)
test('client-helpers - disableInputFile - without spinner', testDisableEnableInputFile, true, false)
test('client-helpers - enableInputFile', testDisableEnableInputFile, false)
test('client-helpers - disableEnableInputFile', testDisableEnableInputFile, 'toggle', true)
test('client-helpers - cloneInputFile', testCloneInputFile, '<input name="input-file" type="file" />')

function testDisableEnableInputFile (t, disable, spinner) {
  const container = document.createElement('div')
  const span = document.createElement('span')
  const input = document.createElement('input')

  const innerText = 'lorem ipsum'
  span.innerText = innerText

  container.appendChild(span)
  container.appendChild(input)

  if (disable === true) {
    disableInputFile(input, spinner)
    t.is(input.getAttribute('disabled'), 'true')
    t.is(container.classList.value, 'disabled')
    if (spinner) {
      t.is(span.classList.value, 'disabled-input-spinner')
      t.not(span.innerText, innerText)
      t.is(span.getAttribute('_innerText'), innerText)
    }
  } else {
    if (disable === 'toggle') {
      disableInputFile(input, spinner)
    }
    enableInputFile(input)
    t.is(input.getAttribute('disabled'), null)
    t.not(container.classList.value, 'disabled')
    t.is(span.getAttribute('_innerText'), null)
    t.is(span.innerText, innerText)
    t.not(span.classList.value, 'disabled-input-spinner')
  }
}

function testCloneInputFile (t, input) {
  const container = document.createElement('div')
  container.innerHTML = input

  const { clonedInputFile, inputFile } = cloneInputFile(container.firstChild)

  t.is(inputFile.name, container.firstChild.name)
  t.is(clonedInputFile.type, container.firstChild.type)
  t.is(clonedInputFile.name, container.firstChild.name)
  t.is(clonedInputFile.id, 'cloned-inputfile')
  t.is(container.firstChild.style.display, 'none')
  t.is(container.firstChild.disabled, true)
  t.is(clonedInputFile.parentElement.tagName, container.tagName)
}
