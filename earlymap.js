const { Engine, CHARACTER_DEFS } = require('./engine.js');
const e = new Engine();

[1, 3, 6].forEach(week => {
  e.s.week = week;
  const all = [];
  for (const [id, char] of e.chars) {
    const def = CHARACTER_DEFS[id];
    const eligible = char.active || (def.unlockCondition && def.unlockCondition(e.s, e));
    if (eligible) {
      for (const card of def.cards) {
        try { if (card.available(e.s, char, e)) all.push({ id: card.id, cat: card.cat, from: card.from || id, p: !!card.priority }); } catch(x) {}
      }
    }
  }
  console.log('\n=== Week ' + week + ' ===');
  all.forEach(c => console.log((c.p ? '[P]' : '   ') + ' ' + c.cat + '  ' + c.id + '  (' + c.from + ')'));
});
