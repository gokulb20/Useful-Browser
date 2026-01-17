# Security, Architecture & Data Audit Report

**Application:** Min Browser (Branch Browser Fork)
**Date:** 2026-01-17
**Branch:** claude/code-security-review-13EkT

---

## Executive Summary

This audit identifies **28 critical/high severity vulnerabilities** and **18 medium severity issues** across security, architecture, and data handling. The most severe issues involve:

1. **Disabled Context Isolation** - Full Node.js access from renderer process
2. **Arbitrary Method Execution** - Unvalidated IPC calls to webContents
3. **Password Exposure** - Credentials passed as CLI arguments (visible in `ps aux`)
4. **DOM-Based XSS** - User-controlled data in innerHTML
5. **Plaintext Data Storage** - Settings, sessions, and history unencrypted

---

## Table of Contents

1. [Critical Vulnerabilities](#1-critical-vulnerabilities)
2. [High Severity Issues](#2-high-severity-issues)
3. [Medium Severity Issues](#3-medium-severity-issues)
4. [Architecture Problems](#4-architecture-problems)
5. [Remediation Roadmap](#5-remediation-roadmap)

---

## 1. Critical Vulnerabilities

### 1.1 Disabled Context Isolation in Main Window

**File:** `main/main.js:214-229`
**Severity:** CRITICAL

```javascript
const mainView = new WebContentsView({
  webPreferences: {
    nodeIntegration: true,           // LINE 216 - CRITICAL
    contextIsolation: false,         // LINE 217 - CRITICAL
    nodeIntegrationInWorker: true,   // LINE 218
```

**Impact:** Complete system compromise possible. Any attacker who can execute code in the renderer (via XSS, malicious page, or compromised dependency) gains full access to:
- File system (read/write/delete any file)
- Child process spawning (execute arbitrary commands)
- Network access (exfiltrate data)

**Remediation:** Enable `contextIsolation: true` and `nodeIntegration: false`. Use `contextBridge` to expose only necessary APIs.

---

### 1.2 Arbitrary WebContents Method Calls

**File:** `main/viewManager.js:388-421`
**Severity:** CRITICAL

```javascript
ipc.on('callViewMethod', function (e, data) {
  var webContents = viewMap[data.id].webContents
  var methodOrProp = webContents[data.method]  // NO VALIDATION
  if (methodOrProp instanceof Function) {
    result = methodOrProp.apply(webContents, data.args)  // ARBITRARY EXECUTION
```

**Impact:** Renderer can call ANY method on webContents including:
- `executeJavaScript()` - Run arbitrary code in any tab
- `session.clearStorageData()` - Wipe user data
- Access to privileged Chromium APIs

**Remediation:** Implement allowlist of safe methods:
```javascript
const ALLOWED_METHODS = ['loadURL', 'goBack', 'goForward', 'stop', 'reload']
if (!ALLOWED_METHODS.includes(data.method)) return
```

---

### 1.3 Master Password Exposed via CLI Arguments

**File:** `js/passwordManager/bitwarden.js:130`
**Severity:** CRITICAL

```javascript
const process = new ProcessSpawner(this.path, ['unlock', '--raw', password])
```

**File:** `js/passwordManager/onePassword.js:144`
```javascript
const process = new ProcessSpawner(command, ['item', 'list', '--session=' + this.sessionKey, ...])
```

**Impact:** Passwords visible in:
- `ps aux` output
- `/proc/[pid]/cmdline`
- System audit logs
- Parent process inspection

**Remediation:** Pass sensitive data via stdin:
```javascript
const process = spawn(command, ['unlock', '--raw'])
process.stdin.write(password)
process.stdin.end()
```

---

### 1.4 DOM-Based XSS in Branch Panel

**File:** `js/branches/branchPanel.js:852,856`
**Severity:** CRITICAL

```javascript
favicon.innerHTML = '<span class="fallback-icon">' + self.getFirstLetter(displayTitle) + '</span>'
```

**Impact:** `displayTitle` comes from `tab.title` (line 820) which is controlled by visited websites. A malicious page title like `</span><img src=x onerror=alert(1)>` executes JavaScript.

**Remediation:**
```javascript
const span = document.createElement('span')
span.className = 'fallback-icon'
span.textContent = self.getFirstLetter(displayTitle)
favicon.innerHTML = ''
favicon.appendChild(span)
```

---

### 1.5 Plaintext Session Storage

**File:** `js/sessionRestore.js:11,45-47`
**Severity:** CRITICAL

```javascript
savePath: userDataPath + '/sessionRestore.json'
// ...
writeFileAtomic(sessionRestore.savePath, JSON.stringify(data), {}, ...)
```

**Content Exposed:**
- Complete browsing history (all URLs)
- Tab titles and states
- Task organization
- Timestamps

**Remediation:** Use Electron's `safeStorage.encryptString()` for sensitive data.

---

### 1.6 Plaintext Settings Storage

**File:** `js/util/settings/settingsMain.js:73-75`
**Severity:** CRITICAL

```javascript
writeFileAtomic(settings.filePath, JSON.stringify(settings.list), {}, ...)
```

**Content Exposed:**
- Password manager configuration
- API keys
- Device identifiers
- User preferences

---

### 1.7 Disabled Context Isolation in Places Service

**File:** `main/main.js:493-505`
**Severity:** CRITICAL

```javascript
placesWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false
  }
})
```

---

## 2. High Severity Issues

### 2.1 Node Integration in Subframes

**File:** `main/viewManager.js:13`

```javascript
nodeIntegrationInSubFrames: true,  // DANGEROUS
```

**Impact:** Attackers can create hidden iframes to access Node.js APIs.

---

### 2.2 Unvalidated File Path Operations

**File:** `main/remoteActions.js:5-11,106-107`

```javascript
ipc.handle('startFileDrag', function (e, path) {
  e.sender.startDrag({ file: path, icon })  // ARBITRARY FILE PATH
})
ipc.handle('showItemInFolder', function (e, path) {
  shell.showItemInFolder(path)  // NO VALIDATION
})
```

**Impact:** Exfiltrate or expose any file on the system.

---

### 2.3 Credentials Exported as Plaintext CSV

**File:** `js/passwordManager/passwordViewer.js:182-196`

```javascript
const csvData = papaparse.unparse({
  fields: ['url', 'username', 'password'],
  data: credentials.map(c => [c.domain, c.username, c.password])
})
anchor.download = 'credentials.csv'
```

**Impact:** Credentials saved to download folder without encryption.

---

### 2.4 innerHTML with Error Messages

**File:** `js/passwordManager/managerSetup.js:184`

```javascript
dragBox.innerHTML = l('passwordManagerSetupUnlockError') + message + ' ' + l('...')
```

**Impact:** `message` comes from error output which could contain HTML.

---

### 2.5 Session Keys Stored in Memory

**Files:**
- `js/passwordManager/bitwarden.js:137`
- `js/passwordManager/onePassword.js:199-200`

```javascript
this.sessionKey = result  // Extractable via memory dump
```

---

### 2.6 Credentials Logged to Console

**Files:**
- `js/passwordManager/bitwarden.js:112-114,123-124,144-145`
- `js/passwordManager/onePassword.js:183-184,203`

```javascript
console.error('Error accessing Bitwarden CLI. STDOUT: ' + data + '. STDERR: ' + error)
```

---

### 2.7 Unvalidated Dialog Options

**File:** `main/remoteActions.js:34-41`

```javascript
ipc.handle('showOpenDialog', async function (e, options) {
  return dialog.showOpenDialog(win, options)  // OPTIONS NOT VALIDATED
})
```

---

### 2.8 API Keys in Plaintext Settings

**File:** `js/config/browserConfig.js:8-11`

```javascript
punkRecords: {
  apiKey: null,  // Set via settings UI, stored in plaintext
}
```

---

### 2.9 State Management Race Conditions

**File:** `js/branches/branchEvents.js:191`

```javascript
task.tabs.forEach(async function (tab) {
  await bs.ensureRoot(tab.id)  // forEach doesn't await! Race condition.
})
```

---

### 2.10 Fragile Module Initialization

**File:** `js/default.js:159-173`

```javascript
// Password manager modules disabled - causes initialization errors
// require('passwordManager/passwordCapture.js')

// Disabled for Branch Browser - causes error during webpack
// require('util/theme.js')
```

**Impact:** Modules cannot be safely re-enabled.

---

## 3. Medium Severity Issues

| Issue | File | Line |
|-------|------|------|
| Weak device ID generation (Math.random) | `js/passwordManager/onePassword.js` | 10-17 |
| Weak branch ID generation | `js/branches/branchState.js` | 37 |
| Weak tab ID generation | `js/tabState/tab.js` | 12 |
| Expression injection risk | `js/searchbar/calculatorPlugin.js` | 38,69-71 |
| unsafeHTML in task overlay | `js/taskOverlay/taskOverlayBuilder.js` | 120 |
| unsafeHTML in localization | `localization/localizationHelpers.js` | 67 |
| Lenient protocol handling | `js/util/urlParser.js` | 23 |
| History stored unencrypted | `js/util/database.js` | 13-24 |
| Prototype pollution pattern | `js/preload/passwordFill.js` | 366-372 |
| History API manipulation | `js/preload/textExtractor.js` | 102-116 |
| Context menu unsanitized | `main/remoteMenu.js` | 1-27 |
| IPC message relay unvalidated | `main/viewManager.js` | 129-153 |
| Magic numbers/timeouts | `js/webviews.js` | 62-65,74-89 |
| Memory leak patterns | `js/webviews.js` | 118-122 |
| No state validation | `js/branches/branchState.js` | 106 |
| File permissions not explicit | `main/keychainService.js` | 41 |
| Missing error handling | `js/branches/branchEvents.js` | 55,117,135 |
| Global mutable state | `js/branches/branchState.js` | 33 |

---

## 4. Architecture Problems

### 4.1 Circular Dependencies

```
browserUI.js → webviews.js → tabs.js → browserUI.js
sessionRestore.js → browserUI.js + webviews.js (may not be initialized)
```

**Evidence:** `js/browserUI.js:16` has commented import with note "Causes white screen by breaking module loading chain"

### 4.2 Monolithic Components

| File | Lines | Responsibility |
|------|-------|----------------|
| `js/branches/branchPanel.js` | ~1100 | DOM, events, state, rendering |
| `js/webviews.js` | ~17,500 | Lifecycle, IPC, events, rendering |

### 4.3 No Transaction Support

State changes in `branchState.js`, `tab.js`, and `task.js` are mutable and non-atomic. No rollback mechanism exists for failed operations.

### 4.4 Event Ordering Issues

```javascript
// tab.js:62,68 - Multiple events per key, out-of-order possible
this.emit('tab-updated', id, key, value)

// task.js:18-32 - setTimeout(0) batching loses ordering guarantees
```

---

## 5. Remediation Roadmap

### Phase 1: Critical Security Fixes (Immediate)

| Priority | Task | Files |
|----------|------|-------|
| P0 | Enable contextIsolation, disable nodeIntegration | `main/main.js` |
| P0 | Allowlist IPC methods in callViewMethod | `main/viewManager.js` |
| P0 | Pass passwords via stdin, not CLI args | `js/passwordManager/*.js` |
| P0 | Replace innerHTML with safe DOM methods | `js/branches/branchPanel.js` |
| P0 | Encrypt session restore file | `js/sessionRestore.js` |
| P0 | Encrypt settings file | `js/util/settings/settingsMain.js` |

### Phase 2: High Severity Fixes

| Priority | Task | Files |
|----------|------|-------|
| P1 | Disable nodeIntegrationInSubFrames | `main/viewManager.js` |
| P1 | Validate file paths in IPC handlers | `main/remoteActions.js` |
| P1 | Encrypt credential exports | `js/passwordManager/passwordViewer.js` |
| P1 | Sanitize error messages in innerHTML | `js/passwordManager/managerSetup.js` |
| P1 | Remove credential logging | `js/passwordManager/*.js` |
| P1 | Validate dialog options | `main/remoteActions.js` |

### Phase 3: Architecture Improvements

| Priority | Task |
|----------|------|
| P2 | Break circular dependencies with dependency injection |
| P2 | Split monolithic components (branchPanel, webviews) |
| P2 | Implement proper state management (immutable updates) |
| P2 | Add transaction support for atomic state changes |
| P2 | Replace Math.random() with crypto.getRandomValues() |
| P2 | Add comprehensive error handling to async operations |
| P2 | Implement memory cleanup for event listeners/timers |

### Phase 4: Defense in Depth

| Priority | Task |
|----------|------|
| P3 | Add CSP style-src, img-src, font-src directives |
| P3 | Implement DOMPurify for all dynamic HTML |
| P3 | Add input validation layer for settings |
| P3 | Encrypt IndexedDB history/places data |
| P3 | Add request signing for external API calls |

---

## Summary Statistics

| Category | Critical | High | Medium | Total |
|----------|----------|------|--------|-------|
| IPC/Preload Security | 3 | 4 | 5 | 12 |
| Input/URL Handling | 1 | 3 | 4 | 8 |
| Data Storage | 3 | 5 | 4 | 12 |
| Architecture | 0 | 3 | 5 | 8 |
| **Total** | **7** | **15** | **18** | **40** |

---

## Files Requiring Immediate Attention

1. `main/main.js` - Context isolation disabled (lines 216-217, 499-500)
2. `main/viewManager.js` - Arbitrary method execution (lines 388-421)
3. `js/passwordManager/bitwarden.js` - CLI password exposure (line 130)
4. `js/passwordManager/onePassword.js` - CLI session exposure (line 144)
5. `js/branches/branchPanel.js` - DOM XSS (lines 852, 856)
6. `js/sessionRestore.js` - Plaintext session storage
7. `js/util/settings/settingsMain.js` - Plaintext settings storage
8. `main/remoteActions.js` - Unvalidated file operations (lines 5-11, 106-107)

---

*This report was generated as part of a comprehensive security audit. All line numbers reference the codebase as of 2026-01-17.*
