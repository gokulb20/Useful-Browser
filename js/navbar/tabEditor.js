var searchbar = require('searchbar/searchbar.js')
var webviews = require('webviews.js')
var modalMode = require('modalMode.js')
var urlParser = require('util/urlParser.js')
var keyboardNavigationHelper = require('util/keyboardNavigationHelper.js')
var bookmarkStar = require('navbar/bookmarkStar.js')
var contentBlockingToggle = require('navbar/contentBlockingToggle.js')

const tabEditor = {
  container: document.getElementById('tab-editor'),
  input: document.getElementById('tab-editor-input'),
  star: null,
  isShown: false,
  show: function (tabId, editingValue, showSearchbar) {
    /* Edit mode is not available in modal mode. */
    if (modalMode.enabled()) {
      return
    }

    tabEditor.container.hidden = false
    tabEditor.isShown = true

    bookmarkStar.update(tabId, tabEditor.star)
    contentBlockingToggle.update(tabId, tabEditor.contentBlockingToggle)

    webviews.requestPlaceholder('editMode')

    document.body.classList.add('is-edit-mode')

    var currentURL = urlParser.getSourceURL(tabs.get(tabId).url)
    if (currentURL === 'min://newtab') {
      currentURL = ''
    }

    tabEditor.input.value = editingValue || currentURL
    tabEditor.input.focus()
    if (!editingValue) {
      tabEditor.input.select()
    }
    // https://github.com/minbrowser/min/discussions/1506
    tabEditor.input.scrollLeft = 0

    // Dropdown autocomplete removed - URL bar now works without suggestions
    // User types and presses Enter to navigate directly

    /* animation */
    if (tabs.count() > 1) {
      requestAnimationFrame(function () {
        var item = document.querySelector(`.tab-item[data-tab="${tabId}"]`)
        var originCoordinates = item.getBoundingClientRect()

        var finalCoordinates = document.querySelector('#tabs').getBoundingClientRect()

        var translateX = Math.min(Math.round(originCoordinates.x - finalCoordinates.x) * 0.45, window.innerWidth)

        tabEditor.container.style.opacity = 0
        tabEditor.container.style.transform = `translateX(${translateX}px)`
        requestAnimationFrame(function () {
          tabEditor.container.style.transition = '0.135s all'
          tabEditor.container.style.opacity = 1
          tabEditor.container.style.transform = ''
        })
      })
    }
  },
  hide: function () {
    tabEditor.container.hidden = true
    tabEditor.container.removeAttribute('style')
    tabEditor.isShown = false

    tabEditor.input.blur()
    searchbar.hide()

    document.body.classList.remove('is-edit-mode')
    // Clear navigation mode classes
    document.body.classList.remove('background-tab-mode', 'sibling-tab-mode')

    webviews.hidePlaceholder('editMode')
  },
  initialize: function () {
    tabEditor.input.setAttribute('placeholder', l('searchbarPlaceholder'))

    tabEditor.star = bookmarkStar.create()
    tabEditor.container.appendChild(tabEditor.star)

    tabEditor.contentBlockingToggle = contentBlockingToggle.create()
    tabEditor.container.appendChild(tabEditor.contentBlockingToggle)

    keyboardNavigationHelper.addToGroup('searchbar', tabEditor.container)

    // Input event listener removed - no autocomplete dropdown

    tabEditor.input.addEventListener('keypress', function (e) {
      if (e.keyCode === 13) { // return key pressed; update the url
        searchbar.openURL(this.value, e)
        e.preventDefault()
      }
      // Autocomplete selection movement logic removed - no dropdown
    })

    document.getElementById('webviews').addEventListener('click', function () {
      tabEditor.hide()
    })
  }
}

tabEditor.initialize()

module.exports = tabEditor
