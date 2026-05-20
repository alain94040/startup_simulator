const { Engine, CHARACTER_DEFS, SITUATIONS } = require('./engine.js');
const e = new Engine();

[1, 3, 6].forEach(week => {
  e.s.week = week;
  const all = [];
  for (const [id, char] of e.chars) {
    if (char.active) {
      for (const card of CHARACTER_DEFS[id].cards) {
        try { if (card.available(e.s, char, e)) all.push({ id: card.id, cat: card.cat, from: card.from || id, p: !!card.priority }); } catch(x) {}
      }
    }
  }
  for (const card of SITUATIONS) {
    try { if (card.available(e.s, null, e)) all.push({ id: card.id, cat: card.cat, from: card.from || 'SITUATIONS', p: !!card.priority }); } catch(x) {}
  }
  console.log('\n=== Week ' + week + ' ===');
  all.forEach(c => console.log((c.p ? '[P]' : '   ') + ' ' + c.cat + '  ' + c.id + '  (' + c.from + ')'));
});
