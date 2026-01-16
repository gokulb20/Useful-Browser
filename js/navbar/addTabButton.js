var browserUI = require('browserUI.js')

var addTabButton = document.getElementById('add-tab-button')

function initialize () {
  // Guard against missing element (e.g., if add-tab-button doesn't exist in HTML)
  if (!addTabButton) {
    console.warn('[addTabButton] add-tab-button element not found, skipping initialization')
    return
  }
  addTabButton.addEventListener('click', function (e) {
    browserUI.addTab()
  })
}

module.exports = { initialize }
