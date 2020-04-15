const test = require('ava')

const { createToast, injectToast, createAlert, injectAlert, disableInputFile, enableInputFile } = require('../helpers/client-helpers.js')

test('client-helpers - createToast - Success', testCreateToast, 'success', { title: 'Success', content: 'lorem ipsum' }, `
<p-toastitem>
<div class="ui-toast-message ui-shadow ui-toast-message-success">
<div class="ui-toast-message-content">
<a class="ui-toast-close-icon"></a>
<div class="notification-block">
<div class="message">
<h3>Success</h3>
<p>lorem ipsum</p>
</div>
<span class="glyphicon glyphicon-ok"></span>
</div>
</div>
</div>
</p-toastitem>
`)

test('client-helpers - createToast - Error', testCreateToast, 'error', { title: 'Error', content: 'lorem ipsum' }, `
<p-toastitem>
<div class="ui-toast-message ui-shadow ui-toast-message-error">
<div class="ui-toast-message-content">
<a class="ui-toast-close-icon"></a>
<div class="notification-block">
<div class="message">
<h3>Error</h3>
<p>lorem ipsum</p>
</div>
<span class="glyphicon glyphicon-remove"></span>
</div>
</div>
</div>
</p-toastitem>
`)

function testCreateToast (t, type, { title, content }, expectedHTML) {
  const toast = createToast(type, { title, content })
  t.deepEqual(toast.outerHTML, expectedHTML.replace(/\n/g, ''))
}

test('client-helpers - injectToast', async t => {
  const pToast = document.createElement('p-toast')
  const container = document.createElement('div')
  const toast = createToast('success', 'success')

  pToast.appendChild(container)
  document.body.appendChild(pToast)

  injectToast(toast, 700)
  t.is(container.firstChild.tagName, toast.tagName)
  t.is(container.firstChild.firstChild.style.animation, 'toastin 0.7s')

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
  await sleep(700)
  t.is(container.firstChild.firstChild.style.animation, 'toastout 0.7s')
  await sleep(700)
  t.is(container.firstChild, null)
})

test('client-helpers - createAlert', testCreateAlert, 'info', '<p>lorem ipsum</p>', `
<div class="alert alert-info">
<p>lorem ipsum</p>
</div>
`)

function testCreateAlert (t, type, content, expectedHTML) {
  const alert = createAlert(type, content)
  t.deepEqual(alert.outerHTML, expectedHTML.replace(/\n/g, ''))
}

test('client-helpers - injectAlert', t => {
  const myVideosAdd = document.createElement('my-videos-add')
  const container = document.createElement('div')
  const firstChild = document.createElement('div')

  container.appendChild(firstChild)
  myVideosAdd.appendChild(container)
  document.body.appendChild(myVideosAdd)

  injectAlert(createAlert('error', '<p>lorem ipsum</p>'))

  t.is(container.firstChild.classList.value, 'alert alert-error')
})

test('client-helpers - disableInputFile - with spinner', testDisableEnableInputFile, true, true)
test('client-helpers - disableInputFile - without spinner', testDisableEnableInputFile, true, false)
test('client-helpers - enableInputFile', testDisableEnableInputFile, false)
test('client-helpers - disableEnableInputFile', testDisableEnableInputFile, 'toggle', true)

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
