const builder = require('electron-builder')
const packageFile = require('./../package.json')
const version = packageFile.version
const Platform = builder.Platform
const Arch = builder.Arch

require('./createPackage.js')('linux', {arch: Arch.x64}).then(function (path) {
  const options = {
    linux: {
      target: ['AppImage'],
      icon: 'icons/icon256.png',
      category: 'Network',
      packageCategory: 'Network',
      mimeTypes: ['x-scheme-handler/http', 'x-scheme-handler/https', 'text/html'],
      synopsis: 'Useful Browser is a fast, minimal browser that thinks the way you do.',
      description: 'The ADHD-friendly browser with tree-based navigation, breadcrumb history, and built-in ad blocking. Open source and free forever.',
      maintainer: 'Useful Ventures <hello@usefulventures.co>',
    },
    directories: {
      output: 'dist/app/'
    },
    publish: null
  }

  builder.build({
    prepackaged: path,
    targets: Platform.LINUX.createTarget(['AppImage'], Arch.x64),
    config: options
  })
})
