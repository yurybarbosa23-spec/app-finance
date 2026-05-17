const fs = require('fs')
const path = require('path')

const dir = path.join(__dirname, 'src/views')
const file = path.join(dir, 'Dashboardview.vue')

// Read current file (UTF-8 preserved)
let content = fs.readFileSync(file, 'utf8')

// Find template start and style end
const tmplStart = content.indexOf('<template>')
const styleEnd = content.lastIndexOf('</style>') + '</style>'.length

if (tmplStart === -1) { console.error('No <template> found'); process.exit(1) }

const scriptPart = content.substring(0, tmplStart)

// Read parts
const p1 = fs.readFileSync(path.join(dir, '_part1.txt'), 'utf8')
const p2 = fs.readFileSync(path.join(dir, '_part2.txt'), 'utf8')
const p3a = fs.readFileSync(path.join(dir, '_part3a.txt'), 'utf8')
const p3b = fs.readFileSync(path.join(dir, '_part3b.txt'), 'utf8')
const p3c = fs.readFileSync(path.join(dir, '_part3c.txt'), 'utf8')

// Clean p3a - remove outer style tags
let css3a = p3a.replace(/^\s*<style scoped>\s*/s, '').replace(/\s*<\/style>\s*$/s, '')
// Fix: replace :root with .ios-app for scoped CSS
css3a = css3a.replace(':root {', '.ios-app {')

const finalCSS = `<style scoped>\n${css3a}\n${p3b}\n${p3c}\n</style>\n`

const final = scriptPart + '\n' + p1 + '\n' + p2 + '\n\n' + finalCSS

fs.writeFileSync(file, final, 'utf8')
console.log('Done! File size:', final.length, 'chars')
console.log('Has emojis:', /[🏠🏦📋📊📦⚡🔄🔔]/.test(final) ? 'YES' : 'NO')
