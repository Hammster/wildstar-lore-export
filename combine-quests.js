const fs = require('node:fs');

const questFile = process.argv[2] || 'Quest2.json';
const translationFile = process.argv[3] || 'en-us.json';
const creatureFile = process.argv[4] || 'Creature2.json';
const itemFile = process.argv[5] || 'Item2.json';
const outputFile = process.argv[6] || 'combined.json';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const quests = readJson(questFile);
const translations = readJson(translationFile);
const translationsById = new Map(
  translations.map(({ id, LocalizedText }) => [String(id), LocalizedText])
);
const creatures = readJson(creatureFile);
const creatureNamesById = new Map(
  creatures.map(({ ID, localizedTextIdName, description }) => {
    const translatedName = translationsById.get(String(localizedTextIdName));
    const untranslated = translatedName === undefined;

    return [String(ID), {
      name: untranslated ? `${description} [NOT TRANSLATED]` : translatedName,
      untranslated,
    }];
  })
);
const items = readJson(itemFile);
const itemNamesById = new Map(
  items.map(({ ID, localizedTextIdName, description }) => {
    const translatedName = translationsById.get(String(localizedTextIdName));
    const untranslated = translatedName === undefined;
    const fallbackName = description ? `${description} [NOT TRANSLATED]` : undefined;

    return [String(ID), {
      name: untranslated ? fallbackName : translatedName,
      untranslated,
    }];
  })
);

let unresolvedCount = 0;
let unresolvedCreatureCount = 0;
let unresolvedItemCount = 0;

function resolveCreatureReferences(text) {
  const resolveCreature = (reference, creatureId) => {
    const creature = creatureNamesById.get(creatureId);
    if (creature === undefined || !creature.name) {
      unresolvedCreatureCount += 1;
      return reference;
    }

    const className = creature.untranslated ? 'creature untranslated' : 'creature';
    return `<span class="${className}">${creature.name}</span>`;
  };

  const withCreatures = text
    .replace(/\$[mp]?\(\s*creature\s*=\s*(\d+)\s*\)/gi, resolveCreature)
    .replace(/\$creature\s*=\s*(\d+)/gi, resolveCreature);

  return withCreatures.replace(
    /<text\s+Link=["']Location:\d+["']>([\s\S]*?)<\/text>/gi,
    '<span class="location">$1</span>'
  );
}

function resolveItemReferences(text) {
  const resolveItem = (reference, itemId) => {
    const item = itemNamesById.get(itemId);
    if (item === undefined || !item.name) {
      unresolvedItemCount += 1;
      return reference;
    }

    const className = item.untranslated ? 'item untranslated' : 'item';
    return `<span class="${className}">${item.name}</span>`;
  };

  return text
    .replace(/\$m?\(\s*(?:item|vitem)\s*=\s*(\d+)\s*\)/gi, resolveItem)
    .replace(/\$(?:item|vitem)\s*=\s*(\d+)/gi, resolveItem);
}

const combined = quests.map((quest) => {
  if (String(quest.ID) === '58') {
    return null;
  }

  const result = { ID: quest.ID };

  for (const [property, value] of Object.entries(quest)) {
    if (!property.startsWith('localized') || !value) {
      continue;
    }

    const text = translationsById.get(String(value));
    if (text === undefined) {
      unresolvedCount += 1;
      continue;
    }

    result[property] = resolveItemReferences(resolveCreatureReferences(text));
  }

  return Object.keys(result).length > 1 ? result : null;
}).filter(Boolean);

fs.writeFileSync(outputFile, `${JSON.stringify(combined)}\n`);

if (unresolvedCount > 0) {
  console.warn(`Skipped ${unresolvedCount} localized references without a translation.`);
}

if (unresolvedCreatureCount > 0) {
  console.warn(`Kept ${unresolvedCreatureCount} creature references without a name.`);
}

if (unresolvedItemCount > 0) {
  console.warn(`Kept ${unresolvedItemCount} item references without a name.`);
}

console.log(`Wrote ${combined.length} quests to ${outputFile}`);