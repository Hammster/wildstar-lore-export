const fs = require('fs')

const lore = {}
const localizedStrings = {}
const localizedWorldZones = {}
const toc = []

const localizedStringsRaw = require('./en-us.json')
const worldZonesRaw = require('./worldzone.tbl.json')
const loreDataRaw = require('./datacube.tbl.json')

function renderHTML () {
  const html = `
    <html>
      <head>
        <title>Wildstar Lore</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
      </head>
      <body style="width: 100rm; margin: auto;">
        <h1>Wildstar Lore Export</h1>
        <sub>Generated: ${new Date().toUTCString()}</sub>
        <hr/>
        <h2>TOC</h2>
        <ul>
        ${Object.values(lore).map(renderHTMLTOC).join('\n        ')}
        </ul>
        <hr/>
        <h2>Content</h2>
        ${Object.values(lore).map(renderHTMLSegment).join('')}
      </body>
    </html>`

  fs.writeFileSync('./out/index.html', html)
}

function renderHTMLSegment(entry) {
  const parseParagraphs = () => {
    return entry.content.split('\n').map(part => `<p>${part}</p>`).join('').replace(/\\n/g, '<br />')
  }
  
  return `
        <div>
          <h3 id="${slugify(entry.title)}"><a href="#${slugify(entry.title)}">#${entry.ID.padStart(3, '0')}</a> - ${entry.title}</h3>
          ${parseParagraphs()}
        </div>
  `
}

function renderHTMLTOC(entry) {
  return `<li><a href="#${slugify(entry.title)}">#${entry.ID.padStart(3, '0')}</a> - ${entry.title}</li>`
}

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

// Hydrate Localization Dictonary
localizedStringsRaw.forEach(el => localizedStrings[el.id] = el.LocalizedText )

// Hydrate WorldZone Dictonary
worldZonesRaw.forEach(el => {
  localizedWorldZones[el.ID] = localizedStrings[el.localizedTextIdName]
})

// Hydrate Lore Dictonary
loreDataRaw.forEach(el => {
  let entry = lore[el.ID] = {}
  entry.ID = el.ID
  entry.title  = localizedStrings[el.localizedTextIdTitle]
  entry.content   = [
    el.localizedTextIdText00, 
    el.localizedTextIdText01, 
    el.localizedTextIdText02, 
    el.localizedTextIdText03, 
    el.localizedTextIdText04, 
    el.localizedTextIdText05]
    .map(x => localizedStrings[x])
    .filter(x => x)
    .join(' ')
  
  entry.content = entry.content
  entry.zone = localizedWorldZones[el.worldZoneId]
})

// export
if(!fs.existsSync('./out')) fs.mkdirSync('out')
fs.writeFileSync('./out/data.json', JSON.stringify(lore, null, 2))
renderHTML()

