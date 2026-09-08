const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const lore = {}
const localizedStrings = {}
const localizedWorldZones = {}

execFileSync(process.execPath, [
  path.join(__dirname, 'combine-quests.js'),
  path.join(__dirname, 'Quest2.json'),
  path.join(__dirname, 'en-us.json'),
  path.join(__dirname, 'Creature2.json'),
  path.join(__dirname, 'Item2.json'),
  path.join(__dirname, 'combined.json')
], { cwd: __dirname, stdio: 'inherit' })

const localizedStringsRaw = require('./en-us.json')
const worldZonesRaw = require('./worldzone.tbl.json')
const loreDataRaw = require('./datacube.tbl.json')
const questsAreResolved = true
const questsRaw = require('./combined.json')
  .map(quest => Object.fromEntries(
    Object.entries(quest).filter(([key, value]) => key === 'ID' || value !== '')
  ))
  .filter(quest => Object.keys(quest).length > 1)

const questTextFields = [
  ['localizedTextIdText', 'Text'],
  ['localizedTextIdCompletionOverride', 'Completion override'],
  ['localizedTextIdGiverTextUnknown', 'Giver text unknown'],
  ['localizedTextIdGiverTextAccepted', 'Giver text accepted'],
  ['localizedTextIdReceiverTextAccepted', 'Receiver text accepted'],
  ['localizedTextIdReceiverTextAchieved', 'Receiver text achieved'],
  ['localizedTextIdGiverSayAccepted', 'Giver says accepted'],
  ['localizedTextIdReceiverSayCompleted', 'Receiver says completed'],
  ['localizedTextIdAcceptResponse', 'Accept response'],
  ['localizedTextIdCompleteResponse', 'Complete response'],
  ['localizedTextIdCompletedSummary', 'Completed summary'],
  ['localizedTextIdGiverIncompleteResponse', 'Giver incomplete response'],
  ['localizedTextIdReceiverIncompleteResponse', 'Receiver incomplete response'],
  ['localizedTextIdCompletedObjectiveShort', 'Completed objective'],
  ['localizedTextIdGiverSayDecline', 'Giver says decline']
]

function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderText(value) {
  return escapeHTML(value).replace(/\\n|\r?\n/g, '<br />')
}

function page(title, content) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHTML(title)}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
  </head>
  <body>
    <nav>
      <a href="index.html">Home</a> |
      <a href="lore.html">Lore</a> |
      <a href="quests.html">Quests</a>
    </nav>
    ${content}
  </body>
</html>
`
}

function renderLandingPage() {
  return page('WildStar Export', `
    <header>
      <h1>WildStar Export</h1>
      <p>Generated: ${new Date().toUTCString()}</p>
    </header>
    <main>
      <h2>Archives</h2>
      <ul>
        <li><a href="lore.html">Lore</a></li>
        <li><a href="quests.html">Quests</a></li>
      </ul>
    </main>`)
}

function renderLorePage() {
  return page('WildStar Lore', `
    <header>
      <h1>WildStar Lore Export</h1>
      <p>Generated: ${new Date().toUTCString()}</p>
    </header>
    <main>
      <h2>Table of contents</h2>
      <ul>
        ${Object.values(lore).map(renderHTMLTOC).join('\n        ')}
      </ul>
      <h2>Content</h2>
      ${Object.values(lore).map(renderHTMLSegment).join('')}
    </main>`)
}

function renderQuestsPage() {
  const quests = questsRaw.map(hydrateQuest)

  return page('WildStar Quests', `
    <header>
      <h1>WildStar Quest Export</h1>
      <p>Generated: ${new Date().toUTCString()}</p>
    </header>
    <main>
      <h2>Table of contents</h2>
      <ul>
        ${quests.map(renderQuestTOC).join('\n        ')}
      </ul>
      <h2>Content</h2>
      ${quests.map(renderQuestSegment).join('')}
    </main>`)
}

function renderHTMLSegment(entry) {
  return `
      <section id="${slugify(entry.title)}">
        <h3><a href="#${slugify(entry.title)}">#${String(entry.ID).padStart(3, '0')}</a> - ${escapeHTML(entry.title)}</h3>
        <p>${renderText(entry.content)}</p>
      </section>
  `
}

function renderHTMLTOC(entry) {
  return `<li><a href="#${slugify(entry.title)}">#${String(entry.ID).padStart(3, '0')} - ${escapeHTML(entry.title)}</a></li>`
}

function hydrateQuest(quest) {
  return {
    ID: quest.ID,
    title: questsAreResolved
      ? quest.localizedTextIdTitle || `Quest ${quest.ID}`
      : localizedStrings[quest.localizedTextIdTitle] || `Quest ${quest.ID}`,
    resolved: questsAreResolved,
    fields: questTextFields
      .filter(([key]) => quest[key] && (questsAreResolved || localizedStrings[quest[key]]))
      .map(([key, label]) => ({
        label,
        value: questsAreResolved ? quest[key] : localizedStrings[quest[key]]
      }))
  }
}

function questAnchor(quest) {
  return `quest-${quest.ID}`
}

function renderQuestTOC(quest) {
  return `<li><a href="#${questAnchor(quest)}">#${String(quest.ID).padStart(3, '0')} - ${escapeHTML(quest.title)}</a></li>`
}

function renderQuestSegment(quest) {
  return `
      <section id="${questAnchor(quest)}">
        <h3><a href="#${questAnchor(quest)}">#${String(quest.ID).padStart(3, '0')}</a> - ${escapeHTML(quest.title)}</h3>
        ${quest.fields.map(field => `<p><strong>${escapeHTML(field.label)}</strong> ${quest.resolved ? field.value : renderText(field.value)}</p>`).join('\n        ')}
      </section>
  `
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
fs.writeFileSync('./out/lore.json', `${JSON.stringify(lore)}\n`)
fs.writeFileSync('./out/quest.json', `${JSON.stringify(questsRaw)}\n`)
fs.writeFileSync('./out/index.html', renderLandingPage())
fs.writeFileSync('./out/lore.html', renderLorePage())
fs.writeFileSync('./out/quests.html', renderQuestsPage())

