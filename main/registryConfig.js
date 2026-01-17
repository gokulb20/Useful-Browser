var regedit = require('regedit')

var installPath = process.execPath

var keysToCreate = [
  'HKCU\\Software\\Classes\\UsefulBrowser',
  'HKCU\\Software\\Classes\\UsefulBrowser\\Application',
  'HKCU\\Software\\Classes\\UsefulBrowser\\DefaulIcon',
  'HKCU\\Software\\Classes\\UsefulBrowser\\shell\\open\\command',
  'HKCU\\Software\\Clients\\StartMenuInternet\\UsefulBrowser\\Capabilities\\FileAssociations',
  'HKCU\\Software\\Clients\\StartMenuInternet\\UsefulBrowser\\Capabilities\\StartMenu',
  'HKCU\\Software\\Clients\\StartMenuInternet\\UsefulBrowser\\Capabilities\\URLAssociations',
  'HKCU\\Software\\Clients\\StartMenuInternet\\UsefulBrowser\\DefaultIcon',
  'HKCU\\Software\\Clients\\StartMenuInternet\\UsefulBrowser\\InstallInfo',
  'HKCU\\Software\\Clients\\StartMenuInternet\\UsefulBrowser\\shell\\open\\command'
]

var registryConfig = {
  'HKCU\\Software\\RegisteredApplications': {
    UsefulBrowser: {
      value: 'Software\\Clients\\StartMenuInternet\\UsefulBrowser\\Capabilities',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Classes\\UsefulBrowser': {
    default: {
      value: 'Useful Browser Document',
      type: 'REG_DEFAULT'
    }
  },
  'HKCU\\Software\\Classes\\UsefulBrowser\\Application': {
    ApplicationIcon: {
      value: installPath + ',0',
      type: 'REG_SZ'
    },
    ApplicationName: {
      value: 'Useful Browser',
      type: 'REG_SZ'
    },
    AppUserModelId: {
      value: 'UsefulBrowser',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Classes\\UsefulBrowser\\DefaulIcon': {
    ApplicationIcon: {
      value: installPath + ',0',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Classes\\UsefulBrowser\\shell\\open\\command': {
    default: {
      value: '"' + installPath + '" "%1"',
      type: 'REG_DEFAULT'
    }
  },
  'HKCU\\Software\\Classes\\.htm\\OpenWithProgIds': {
    UsefulBrowser: {
      value: 'Empty',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Classes\\.html\\OpenWithProgIds': {
    UsefulBrowser: {
      value: 'Empty',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\UsefulBrowser\\Capabilities\\FileAssociations': {
    '.htm': {
      value: 'UsefulBrowser',
      type: 'REG_SZ'
    },
    '.html': {
      value: 'UsefulBrowser',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\UsefulBrowser\\Capabilities\\StartMenu': {
    StartMenuInternet: {
      value: 'Useful Browser',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\UsefulBrowser\\Capabilities\\URLAssociations': {
    http: {
      value: 'UsefulBrowser',
      type: 'REG_SZ'
    },
    https: {
      value: 'UsefulBrowser',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\UsefulBrowser\\DefaultIcon': {
    default: {
      value: installPath + ',0',
      type: 'REG_DEFAULT'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\UsefulBrowser\\InstallInfo': {
    IconsVisible: {
      value: 1,
      type: 'REG_DWORD'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\UsefulBrowser\\shell\\open\\command': {
    default: {
      value: installPath,
      type: 'REG_DEFAULT'
    }
  }
}

var registryInstaller = {
  install: function () {
    return new Promise(function (resolve, reject) {
      regedit.createKey(keysToCreate, function (err) {
        regedit.putValue(registryConfig, function (err) {
          if (err) {
            reject()
          } else {
            resolve()
          }
        })
      })
    })
  },
  uninstall: function () {
    return new Promise(function (resolve, reject) {
      regedit.deleteKey(keysToCreate, function (err) {
        if (err) {
          reject()
        } else {
          resolve()
        }
      })
    })
  }
}
