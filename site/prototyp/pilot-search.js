/* Delad söklogik för prototypen och regressionstester. */
(function (root) {
  "use strict";
  const fold = value => String(value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const synonyms = { matte: "matematik", engelskundervisning: "engelska", mellanstadiet: "4–6", hogstadiet: "7–9" };
  const words = text => fold(text).split(/[^a-z0-9åäö–]+/).filter(Boolean).map(w => synonyms[w] || w);
  const fields = ["anvandning", "amne", "stadium", "materialtyp", "verktyg"];
  function matches(record, filters) {
    return fields.every(field => !filters[field] || (Array.isArray(record[field]) ? record[field].includes(filters[field]) : record[field] === filters[field]));
  }
  function score(record, query, taxonomy) {
    const tokens = words(query);
    if (!tokens.length) return 1;
    const title = fold(record.titel);
    const context = fold(record.parent_titel || "");
    const labels = fields.flatMap(f => (Array.isArray(record[f]) ? record[f] : [record[f]]).map(v => taxonomy[f][v] || ""));
    const haystack = fold([record.titel, record.parent_titel, record.beskrivning, ...labels].join(" "));
    if (!tokens.every(t => haystack.includes(t))) return 0;
    return tokens.reduce((s, t) => s + (title.includes(t) ? 10 : context.includes(t) ? 5 : 2), 0);
  }
  function search(records, filters, taxonomy, includeExcluded = false) {
    const eligible = records.filter(r => includeExcluded || ((r.urval === "foreslagen" || r.granskning === "godkand") && r.granskning !== "avvisad"));
    const rows = eligible.filter(r => matches(r, filters)).map(r => ({ record: r, score: score(r, filters.q || "", taxonomy) }))
      .filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.record.titel.localeCompare(b.record.titel, "sv"));
    const groups = new Map();
    for (const row of rows) {
      const key = row.record.parent_id || row.record.id;
      if (!groups.has(key)) groups.set(key, { id: key, parent: records.find(r => r.id === key), rows: [], score: row.score });
      groups.get(key).rows.push(row.record);
    }
    return { rows: rows.map(r => r.record), groups: [...groups.values()] };
  }
  function facetCount(records, filters, field, value, taxonomy) {
    return search(records, { ...filters, [field]: value }, taxonomy).groups.length;
  }
  const api = { fold, matches, search, facetCount };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AINAT_PILOT_SEARCH = api;
})(globalThis);
