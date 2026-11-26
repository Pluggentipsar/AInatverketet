import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const engine = require('../site/prototyp/pilot-search.js');
const data = JSON.parse(readFileSync(new URL('../data/pilot/kandidater.json', import.meta.url), 'utf8'));
const tax = JSON.parse(readFileSync(new URL('../data/pilot/taxonomi.json', import.meta.url), 'utf8'));
const search = filters => engine.search(data.resurser, filters, tax);

// Developer-defined regression cases, not an independent editorial relevance study.
const cases = [
  ['Om AI utan skärm i mellanstadiet', { anvandning: 'om', stadium: '46', verktyg: 'utan' }, 'Övning 1. Vem skulle du fråga?'],
  ['AI i matematiken', { anvandning: 'med', amne: 'matematik' }, 'Problemlösningscoach - steg för steg'],
  ['Matte som sökord', { q: 'matte' }, 'Matematik'],
  ['Muntlig engelska', { amne: 'engelska', materialtyp: 'lektion' }, 'Speaking Partner - öva konversation'],
  ['Tankemodell för planering', { materialtyp: 'metod', anvandning: 'planera' }, 'ECPA - Enskilt, Chatbot, Par, Alla'],
  ['ECPA direkt', { q: 'ECPA' }, 'ECPA - Enskilt, Chatbot, Par, Alla'],
  ['Förstå AI själv', { anvandning: 'forsta', q: 'Lära om AI' }, 'Lära om AI'],
  ['AI med eller utan verktyg i högstadiet', { stadium: '79', verktyg: 'alternativ' }, 'Övning 2. Relationskritik i tre steg'],
  ['Biologi med AI', { amne: 'biologi', anvandning: 'med' }, 'Ekosystem-simulatorn'],
  ['AI och källkritik', { q: 'källkritik' }, 'AI och källkritik'],
];
for (const [name, filters, expected] of cases) test(name, () => {
  const result = search(filters);
  assert(result.groups.slice(0, 5).some(g => g.rows.some(r => r.titel === expected)), `Expected ${expected} in first 5 groups`);
});
test('Unknown stage never matches an explicit stage', () => {
  const result = search({ amne: 'matematik', stadium: '46' });
  assert.equal(result.rows.length, 0);
});
test('Sibling requirements do not contaminate a match', () => {
  const result = search({ anvandning: 'om', stadium: '46', verktyg: 'utan' });
  assert.deepEqual(result.rows.map(r => r.titel), ['Övning 1. Vem skulle du fråga?']);
});
test('One package produces one group with separately inspectable sections', () => {
  const result = search({ q: 'AI-vänner' });
  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].rows.length, 8);
});
test('Listing pages are discovery inputs and excluded from search', () => {
  assert(!search({}).rows.some(r => r.titel === 'Nyhetsarkiv'));
});
test('Rejecting a record removes it from search', () => {
  const records = data.resurser.map(r => ({ ...r, granskning: 'avvisad' }));
  assert.equal(engine.search(records, {}, tax).rows.length, 0);
});
test('Facet counts respect the other chosen filters', () => {
  assert.equal(engine.facetCount(data.resurser, { stadium: '46', anvandning: 'om' }, 'verktyg', 'utan', tax), 1);
  assert.equal(engine.facetCount(data.resurser, { stadium: '46', anvandning: 'om' }, 'verktyg', 'elever', tax), 0);
});
