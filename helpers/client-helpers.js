function clone (input) {
  const cloned = input.cloneNode(true)
  cloned.id = 'cloned-input-file'
  input.setAttribute('style', 'display:none')
  input.setAttribute('disabled', true)
  input.parentElement.appendChild(cloned)
  return cloned
}

module.exports = {
  clone
}
