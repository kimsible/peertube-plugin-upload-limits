const test = require('ava')
const { render, html } = require('uhtml')

const { clone } = require('../helpers/client-helpers.js')

test('client-helpers - cloneInputFile', testCloneInputFile, html.node`<input id="videofile" name="input-file" type="file" />`)

function testCloneInputFile (t, input) {
  render(document.body,  html`<div>${input}</div>`)

  const cloned = clone(input)

  t.is(cloned.name, input.name)
  t.is(cloned.type, input.type)
  t.not(cloned.id, input.id)
  t.is(cloned.id, 'cloned-input-file')
  t.is(input.style.display, 'none')
  t.is(input.disabled, true)
  t.is(cloned.parentElement.localName, input.parentElement.localName)
}
