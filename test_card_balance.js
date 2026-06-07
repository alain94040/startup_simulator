// Card balance tests — verify characters have meaningful early-game presence.
// Run with: node test_card_balance.js
const { Engine } = require('./engine.js');

let pass = 0, fail = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    pass++;
  } catch (e) {
    console.log(`✗ ${name} — ${e.message}`);
    fail++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Run one game through week 8 and return the number of turns where Jordan
// had at least one card in the offer pool. Uses a neutral picking strategy
// (first 2 cards, first option) so results aren't biased toward or away from Jordan.
function jordanEarlyTurns() {
  const e = new Engine();
  let jordanTurns = 0;

  for (let turn = 0; turn < 20; turn++) {
    if (e.s.game_won || e.s.game_over) break;
    if (e.s.week > 8) break;

    e.generateDemands();
    if (e.current.length === 0) break;

    if (e.current.some(c => c._charId === 'jordan')) jordanTurns++;

    const ids = e.current.slice(0, 2).map(c => c.id);
    const opts = {};
    for (const card of e.current) {
      if (ids.includes(card.id) && card.options && card.options.length > 0) {
        opts[card.id] = card.options[0].key;
      }
    }
    e.resolveTurn(ids, opts);
  }

  return jordanTurns;
}

test('Jordan appears in ≥4 of the first 8 turns on average (200 games)', () => {
  const N = 200;
  let total = 0;
  for (let i = 0; i < N; i++) total += jordanEarlyTurns();
  const avg = total / N;
  assert(avg >= 4, `Jordan averaged ${avg.toFixed(2)} early turns, expected ≥ 4`);
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
