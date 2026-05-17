const fs = require('fs')
const path = require('path')

const dir = path.join(__dirname, 'src/views')
const file = path.join(dir, 'Dashboardview.vue')

// Read current file (UTF-8 preserved)
let content = fs.readFileSync(file, 'utf8')

// Find template start and style end
const tmplStart = content.indexOf('<template>')
if (tmplStart === -1) { console.error('No <template> found'); process.exit(1) }

const scriptPart = content.substring(0, tmplStart).trimEnd()

// Read parts
const tmpl = fs.readFileSync(path.join(dir, '_tmpl.txt'), 'utf8').trim()
const modals = fs.readFileSync(path.join(dir, '_modals.txt'), 'utf8').trim()
const css = fs.readFileSync(path.join(dir, '_css.txt'), 'utf8').trim()

// Extract the outer <template> tags from _tmpl.txt and _modals.txt to merge them
// _tmpl.txt starts with <template> and ends with </template>
let innerTmpl = tmpl.replace(/^\s*<template>\s*/i, '').replace(/\s*<\/template>\s*$/i, '')
let innerModals = modals

const final = scriptPart + '\n\n<template>\n' + innerTmpl + '\n\n' + innerModals + '\n</template>\n\n' + css + '\n'

fs.writeFileSync(file, final, 'utf8')
console.log('Done! File size:', final.length, 'chars')
