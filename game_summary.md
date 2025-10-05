# Startup Founder Game - Project Summary

## Project Overview
An educational browser-based game that simulates the early journey of a startup founder from idea to seed round ($1M+ raise). Target play time: 5-10 minutes per playthrough.

## Current Status: ✅ v1.0 Complete & Playable

### What's Been Built
- Full game engine with action-based time system
- Complete HTML/CSS/JS single-page application
- Onboarding quiz that determines starting conditions
- 11 different player actions
- Co-founder recruitment and team dynamics
- Incubator system (YC and Techstars)
- Multiple fundraising paths (F&F, Angels, Seed)
- Win/lose conditions with game over screen

## Core Game Mechanics

### Resources Tracked
1. **Cash** - Money in bank, depletes via monthly burn rate
2. **Weeks Elapsed** - Time tracker for action-based system
3. **Product Progress** - 0-100% meter, must reach 60% to launch
4. **Customers** - Integer count, can only acquire after launch
5. **Team** - Array of founder + co-founders with individual skills

### Key Formulas

**Product Development Rate (per 2 weeks):**
```
progress_gain = total_technical_skill * 2
```

**Customer Acquisition (per 2 weeks):**
```
new_customers = total_sales_skill * 20
```

**Monthly Burn Rate:**
```
burn = $3,000 + (team_size * $5,000)
```

**Fundraising Score (0-100):**
```
score = (customers / 50) +           // 0-20 points
        (product_progress / 5) +     // 0-20 points  
        (team_size * 10) +           // 0-30 points
        incubator_bonus +            // 0-30 points (YC=30, TS=20)
        pivot_bonus                  // 0-5 points
```

**Fundraising Success Rates:**
- Friends & Family: 50% chance, $10-50k
- Angels: score/150 success rate, $100-300k
- Seed: score/100 AND score≥60, $1-2M (WIN!)

### Character Attributes

**Founder:**
- technical_skill (1-10)
- sales_skill (1-10)
- equity (starts at 100%, decreases with investments/co-founders)

**Co-founders:**
- technical_skill (3-10, random)
- sales_skill (3-10, random)
- equity (10-25%, random ask)
- months_on_team (tracked for quit mechanic)
- will_quit (30% chance, quits after 6 months)

### Time System
- Action-based: each action costs 1-8 weeks
- Monthly checkpoints every 4 weeks:
  - Deduct burn rate
  - Calculate organic customer growth (5% monthly)
  - Check co-founder quits (every 3 months/12 weeks)

### Available Actions

| Action | Time Cost | Requirements |
|--------|-----------|--------------|
| Build Product | 2 weeks | Always available |
| Launch Product | 1 week | Product ≥ 60% |
| Get Customers | 2 weeks | Product launched |
| Find Co-founder | 4 weeks | Always available |
| Pivot | 4 weeks | customers > 0 |
| Apply YC | 5 weeks | Not in incubator |
| Apply Techstars | 5 weeks | Not in incubator |
| Ask Friends & Family | 1 week | Always available |
| Prepare Pitch Deck | 1 week | Not yet prepared |
| Pitch Angels | 4 weeks | Pitch deck ready |
| Pitch VCs (Seed) | 8 weeks | Pitch deck ready |

### Incubator System

**Y Combinator:**
- Investment: $500k
- Equity: 7%
- Duration: 12 weeks
- Fundraising boost: +30 points
- Acceptance: 2% base (max 15% with bonuses)
- Bonuses: +3% if product≥80%, +5% if customers≥100, +2% if team≥2

**Techstars:**
- Investment: $120k
- Equity: 6%
- Duration: 12 weeks
- Fundraising boost: +20 points
- Acceptance: 5% base (max 20% with bonuses)
- Bonuses: +3% if product≥60%, +3% if customers≥50, +2% if team≥1

**Design Philosophy:** Only YC and Techstars modeled as "worth it" - educational message that most incubators waste time.

### Win/Lose Conditions

**Win:**
- Raise seed round ≥ $1M
- Display: weeks taken, equity retained, team size, customers

**Lose:**
- Cash reaches $0 (ran out of money)
- Option to restart

## Onboarding Quiz

**Q1: Current Situation**
1. University student → $0, tech=7, sales=3
2. Employed professional → $30k, tech=6, sales=5
3. Previously founded → $80k, tech=7, sales=7, product=10%

**Q2: Strongest Skill**
1. Technical → tech+2
2. Sales → sales+2
3. Balanced → tech+1, sales+1

**Q3: Have Co-founder?**
1. Yes → Start with random co-founder
2. No → Start solo

## Technical Implementation

### File Structure
Single HTML file containing:
- CSS for styling (modern gradient UI, responsive grid)
- JavaScript class-based game engine
- All game logic self-contained

### Key Classes/Objects
```javascript
class StartupGame {
  game: {
    cash, weeks_elapsed, product_progress, customers,
    founder: { technical_skill, sales_skill, equity },
    team: [ {co-founder objects} ],
    pending_cofounder_offer, pending_incubator_offer,
    game_over, game_won
  }
}
```

### UI Components
1. **Onboarding Screen** - Button-based quiz
2. **Game Screen:**
   - Status panel (9 stat boxes in grid)
   - Message box (color-coded feedback)
   - Decision panel (accept/decline for offers)
   - Action buttons grid
3. **Game Over Screen** - Final stats + restart

### No External Dependencies
- Pure vanilla JavaScript
- No frameworks or libraries
- No localStorage (as per requirements)
- No server needed

## Design Decisions Made

### Simplifications (v1.0)
- **No burnout mechanic** - kept simple
- **No product quality** - just progress %
- **Simple co-founder quit** - binary 30% chance, quits at 6 months
- **No random events** (yet) - except co-founder quits
- **No multiple customer types** - single B2C model
- **No save/load** - single session play
- **Generic co-founder names** - "Co-founder 1, 2, 3..."

### Extensibility Built In
The simple design allows future additions:
- More incubators (add to list)
- Product quality slider (add parameter)
- Stress/burnout (add founder attribute)
- Random events (event system at checkpoints)
- Multiple customer segments (make customers object)
- Meta-progression (unlock system)

## Known Issues / Future Improvements

### Balance Tuning Needed
- Haven't playtested extensively
- May be too easy/hard to raise money
- Incubator acceptance rates untested
- Organic growth rate (5%/month) may be too high/low

### Potential Features for v2.0
1. **More granular time** - 1 week increments instead of action-based?
2. **Competitor events** - random competitor launches
3. **Advisor system** - hire advisors for bonuses
4. **Product quality vs speed** - trade-off mechanic
5. **Hiring employees** - not just co-founders
6. **Multiple funding paths** - grants, competitions, bootstrapping
7. **Leaderboards** - track fastest wins
8. **Named co-founders** - real name generator
9. **More incubators** - Tier 2 and Tier 3 options
10. **Visual improvements** - animations, charts for growth

### Educational Messages to Add
- Tips about when to fundraise vs build
- Warnings about bad incubators
- Advice on co-founder selection
- Pivot timing guidance

## How to Resume Work

### To Test/Play
1. Open the HTML file in any browser
2. Complete onboarding quiz
3. Play through to seed round or bankruptcy

### To Modify Game
All code is in single HTML artifact. Key sections:
- **Styles:** `<style>` tag (lines 1-300~)
- **Game Logic:** `class StartupGame` (lines 400-900~)
- **Action Handlers:** Individual methods like `buildProduct()`, `pitchSeed()`
- **UI Updates:** `updateUI()`, `renderActions()` methods
- **Formulas:** Calculator methods like `calculateFundraisingScore()`

### Common Modifications
- **Adjust balance:** Change formulas in calculator methods
- **Add actions:** Add to `getAvailableActions()` and action switch
- **Change UI:** Modify CSS in `<style>` tag
- **Add features:** Extend `this.game` state object

## Files Delivered
1. Complete HTML file with embedded CSS/JS
2. This markdown summary

## Next Session Starting Points

If continuing work, good next tasks:
1. **Playtest** - iterate on balance/difficulty
2. **Add tooltips** - explain what each action does
3. **Visual polish** - add animations, better feedback
4. **More events** - random occurrences during gameplay
5. **Analytics** - track player decisions for balancing
6. **Mobile optimization** - improve touch/small screen UX
7. **Tutorial mode** - guided first playthrough
8. **Achievements** - unlock badges for special wins

---

## Quick Reference: Key Numbers

- **Starting cash range:** $0 - $80k
- **Monthly burn:** $3k + $5k per team member
- **Product launch threshold:** 60%
- **Seed fundraising threshold:** Score ≥60
- **Co-founder quit chance:** 30% after 6 months
- **YC acceptance:** 2-15%
- **Techstars acceptance:** 5-20%
- **Win condition:** Raise ≥$1M

Game is educational, fast-paced, and replayable. Each playthrough teaches trade-offs between building, selling, and fundraising.