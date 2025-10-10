# Startup Founder Game - Architecture & Development Guide

## Project Overview

An educational browser-based game that simulates the early journey of a startup founder from idea to seed round ($1M+ raise). Players learn about trade-offs between building, selling, and fundraising through interactive gameplay.

**Target Play Time:** 5-10 minutes per playthrough
**Current Status:** v1.0 with core mechanics implemented

---

## File Structure

### Core Files

1. **index.html** - Main HTML file with all UI structure
   - Onboarding questionnaire (Q1-Q5)
   - Game screen (status panel, message box, action buttons)
   - Game over screen

2. **styles.css** - All styling
   - Modern gradient design
   - Responsive grid layouts
   - Color-coded message types (success/warning/error)
   - Mobile-friendly

3. **game.js** - Pure game logic (no UI code)
   - `StartupGame` class
   - Game state management
   - All mechanics and formulas
   - Returns structured data objects

4. **ui.js** - UI controller
   - DOM manipulation
   - Event handlers
   - Bridges between user actions and game logic

5. **game-tests.html** - Unit tests
   - Behavioral tests (not implementation-specific)
   - Can be opened in browser, runs automatically

---

## Game Architecture

### Core Game State (game.js - StartupGame.game object)

```javascript
{
  // Resources
  cash: number,
  weeks_elapsed: number,
  start_date: Date,
  
  // Product
  product_progress: 0-100,
  product_market_fit: 0-100 (hidden metric),
  product_launched: boolean,
  
  // Customers
  customers: number,
  monthly_revenue: number,
  
  // Team
  founder: {
    technical_skill: 1-10,
    sales_skill: 1-10,
    equity: 0-100%,
    full_time: boolean,
    productivity: 0.5-1.0
  },
  team: [ { co-founder objects } ],
  
  // Fundraising
  pitch_deck_ready: boolean,
  in_incubator: boolean,
  incubator_name: string,
  incubator_bonus: 0-30,
  pivot_bonus: 0-5,
  
  // State
  game_over: boolean,
  game_won: boolean,
  pending_cofounder_offer: object,
  pending_incubator_offer: object
}
```

### Co-founder Object Structure

```javascript
{
  name: string,
  technical_skill: 3-10,
  sales_skill: 3-10,
  equity: 10-25%,
  months_on_team: number,
  will_quit: boolean (30% chance at creation),
  salary: 0 | 2500 | 5000 (actual payment),
  productivity: 0.5 | 0.65 | 0.80 | 1.0 (based on salary)
}
```

---

## Key Game Mechanics

### 1. Time System (Action-Based)

- Each action costs 1-8 weeks
- Weekly advancement triggers monthly checkpoints every 4 weeks
- Date displays as "Month Year" (e.g., "Jan 2024")

**Action Time Costs:**
- Build Product: 2 weeks
- Talk to Users: 1 week
- Launch Product: 1 week
- Get Customers: 2 weeks
- Find Co-founder: 4 weeks
- Pivot: 4 weeks
- Apply to YC/Techstars: 5 weeks (+ 4 week wait)
- Ask Friends & Family: 1 week
- Prepare Pitch: 1 week
- Pitch Angels: 4 weeks
- Pitch VCs for Seed: 8 weeks

### 2. Product Development with Exponential Slowdown

**Formula:** `efficiency = 0.95^(gap - 10)` where gap = product_progress - market_fit

- If product ≤ market_fit + 10: 100% efficiency
- Each point gap beyond 10: multiply by 0.95
- Minimum efficiency: 5%
- Result: Building ahead of market validation gets exponentially slower

**Example:**
- Gap = 20: 36% efficiency
- Gap = 30: 21% efficiency
- Gap = 40: 13% efficiency

### 3. Product-Market Fit (Hidden Metric: 0-100%)

**Initial Values Based on Founder Profile:**
- Pure technical: 30%
- Sales/marketing focused: 50%
- Balanced: 40%
- Previously founded: +20% bonus

**Improves Through:**
- Talk to Users action (with diminishing returns)
- Getting customers (organic feedback)
- Incubator participation (+25% for YC, +15% for Techstars)

**Diminishing Returns for "Talk to Users":**
- Market fit 0-30%: 100% effectiveness
- Market fit 30-50%: 70% effectiveness
- Market fit 50-70%: 40% effectiveness
- Market fit 70%+: 15% effectiveness (must build/test with real customers)

### 4. Customer Acquisition

**Formula:** 
```
newCustomers = baseSalesSkill * 20 * (market_fit / 100) * productMultiplier
```

Where:
- baseSalesSkill = total_sales_skill * productivity (with all team)
- market_fit multiplier: 0-100%
- productMultiplier: based on product_progress
  - < 40%: 0.3-0.67x (hard to sell incomplete product)
  - 40-60%: 0.67-1.0x
  - 60%+: 1.0x

**Learning from Customers:**
- Improves market fit based on product completeness (learning rate)
- Product < 30%: 40% learning effectiveness
- Product 30-50%: 70% learning effectiveness
- Product 50%+: 100% learning effectiveness

### 5. Burn Rate & Runway

**Formula:**
```
founderBurn = full_time ? 3000 : 0
cofoundBurn = sum of (cofounder.salary for each team member)
totalBurn = founderBurn + cofoundBurn
runway = cash / totalBurn (in months)
```

**Auto-Salary System (Monthly Checkpoint):**
1. Try to pay co-founders $5000 each
2. Fall back to $2500 each if limited cash
3. Revert to $0 if no cash available

**Productivity by Salary:**
- $0: 50% (equity only, part-time)
- $2500: 65% (partial commitment)
- $5000: 100% (full-time focused)

### 6. Incubators (YC & Techstars Only)

**Y Combinator:**
- Investment: $500k
- Equity: -7%
- Duration: 12 weeks
- Fundraising bonus: +30
- Market fit bonus: +25
- Acceptance: 2-15% (based on product/customers/team)

**Techstars:**
- Investment: $120k
- Equity: -6%
- Duration: 12 weeks
- Fundraising bonus: +20
- Market fit bonus: +15
- Acceptance: 5-20% (based on product/customers/team)

### 7. Fundraising Score (0-100%)

**Formula:**
```
score = 
  min(20, customers / 50) +
  (product_progress / 5) +
  (team_size * 10) +
  incubator_bonus +
  pivot_bonus
```

**Fundraising Success Rates:**
- Friends & Family: 50% chance, $10-50k
- Angels: score/150, $100-300k (requires pitch deck)
- Seed: (score/100 AND score ≥ 60), $1-2M (WIN!)

### 8. Team & Co-founders

**Adding Co-founders:**
- Found via "Find Co-founder" action (4 weeks)
- Random skills (technical & sales: 3-10)
- Random equity ask (10-25%)
- 30% chance they will quit after 6+ months

**Starting with Co-founder (Onboarding Q4-Q5):**
- Q4: Do you have a co-founder?
- Q5 (if Yes): Is co-founder full-time or part-time?
- Co-founder productivity determined at startup

**Quit Mechanic:**
- Checked every 3 months (12 weeks)
- If will_quit flag = true AND months_on_team ≥ 6: they leave
- Costs 4 weeks dealing with transition
- Can't prevent yet (morale system planned for future)

---

## Onboarding Questions

**Q1: Current Situation**
1. University student → $0, tech=7, sales=3
2. Employed professional → $30k, tech=6, sales=5
3. Previously founded → $80k, tech=7, sales=7, product=10%

**Q2: Strongest Skill**
1. Technical → +2 tech
2. Sales/Marketing → +2 sales
3. Balanced → +1 tech, +1 sales

**Q3: Working Full-Time?**
1. Yes → full_time=true, productivity=1.0, $3k/month burn
2. No → full_time=false, productivity=0.5, $0 burn

**Q4: Have Co-founder?**
1. Yes → Show Q5
2. No → Skip Q5, start solo

**Q5: Co-founder Full-Time? (only if Q4 = Yes)**
1. Yes → productivity=1.0, included in burn rate
2. No → productivity=0.5, no salary

---

## Current Tests (game-tests.html)

### Working Tests ✓

1. **Can't reach 100% product by just building repeatedly**
   - Pure technical founder builds 20 times
   - Should be blocked before 100% (due to market fit penalty)

2. **Can't get customers without launching product**
   - Product not launched → GET_CUSTOMERS not in available actions

3. **Can't launch without building product first**
   - 0% product → LAUNCH_PRODUCT not in available actions

4. **Part-time solo founder doesn't lose with $0**
   - Part-time, $0, builds for 12 weeks
   - Should not game over

5. **Full-time founder with $0 eventually runs out**
   - Full-time, $0, builds for 20 iterations
   - Should eventually game over

6. **Talking to users improves market fit**
   - Execute TALK_TO_USERS
   - Market fit should increase

7. **Can't reach 100% market fit by just talking**
   - Sales-focused founder talks 30 times
   - Should hit diminishing returns before 100%

8. **Building with balanced product and market fit is efficient**
   - Experienced, balanced founder
   - Alternates building and talking 5 times
   - Should make good progress (>40%) while staying balanced

9. **Getting customers improves market fit**
   - Build to launch, get customers
   - Market fit should maintain or improve

10. **Incubator improves market fit significantly**
    - Build to 80% product, get into YC (if accepted)
    - Market fit should jump by 25+ points

11. **Raising seed round with high fundraising score triggers win**
    - Set up winning conditions (100% product, 100% market fit, 2000 customers)
    - Pitch seed multiple times (due to randomness)
    - Should eventually win

12. **Actions consume time correctly**
    - Build (2 weeks) + Talk (1 week)
    - Verify week counts are correct

13. **Monthly checkpoint deducts burn rate**
    - Advance 4 weeks, verify cash decreased by burn amount

14. **Can't pitch without preparing deck first**
    - No deck → PITCH_ANGELS and PITCH_SEED not available
    - PREPARE_PITCH should be available

### Failing/Incomplete Tests ❌

1. **Full-time university student with $0 survives at least 3 months**
   - Test exists in code but not rendering in game-tests.html
   - This is the test to debug the monthly checkpoint bug

---

## Known Issues

### Bug: Monthly Checkpoint Auto-Payment Issue

**Description:** Full-time founder with $0 should survive indefinitely (or at least 3 months), but they're gaming over too quickly.

**Suspected Cause:** The `autoPayCofoundersSalaries()` function in `monthlyCheckpoint()` is deducting cash from the founder BEFORE calculating burn, creating incorrect math.

**Location:** game.js, `monthlyCheckpoint()` and `autoPayCofoundersSalaries()` methods

**How to Reproduce:**
1. Create full-time university student (start with $0)
2. Do actions for 12+ weeks (3+ months)
3. Should NOT game over, but does

**Needed Fix:**
- Review the order of operations in monthly checkpoint
- Ensure co-founder salaries are calculated as part of burn, not separate
- Verify: founder salary ($3k if full-time) + co-founder salaries = total burn

---

## Future Features (Not Yet Implemented)

1. **Formal Pivot Mechanic** - Currently resets product but could be expanded
2. **Co-founder Morale** - Track satisfaction, risk of leaving if underpaid
3. **More Incubators** - Tier 2 and Tier 3 options (mostly not worth it)
4. **Random Events** - Competitor launches, PR opportunities, team crises
5. **Advisor System** - Hire advisors for specific bonuses
6. **Multiple Revenue Models** - Freemium, paid, ad-supported
7. **Hiring Employees** - Beyond co-founders, hire staff
8. **Pivot Mechanics** - Currently exists but could be more sophisticated
9. **Multiple Ending Conditions** - Not just seed, but profitability paths
10. **Meta-Progression** - Unlocks between playthroughs

---

## How to Continue Development

### To Test:
1. Open `game-tests.html` in browser
2. Tests run automatically
3. Check console for pass/fail

### To Debug the Monthly Checkpoint Bug:
1. Look at `monthlyCheckpoint()` in game.js
2. Check `autoPayCofoundersSalaries()` logic
3. Ensure burn = founder_salary + co_founder_salaries, not founder_salary + co_founder_salaries as separate deductions
4. Test with the "Full-time university student with $0 survives 3 months" test

### To Add New Tests:
1. Edit game-tests.html
2. Add new `test("name", () => { ... })` function
3. Run in browser

### Code Organization Principles:
- game.js: Pure logic, no DOM manipulation
- ui.js: Only UI/DOM code, calls game methods
- Keep calculations simple and readable
- All formulas documented in comments

---

## Quick Reference

**Win Condition:** Raise $1M+ seed round

**Lose Condition:** Cash reaches $0 (unless part-time/no co-founders)

**Key Trade-offs:**
1. Building vs Validating (market fit)
2. Bootstrapping vs Fundraising
3. Team Quality vs Burn Rate
4. Speed vs Focus

**Educational Value:**
- Teaches realistic startup constraints
- Market validation is critical
- Team affects velocity
- Cash burn is existential
- Trade-offs between growth levers