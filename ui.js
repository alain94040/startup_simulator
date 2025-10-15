// STARTUP FOUNDER GAME - UI Controller

let game;
let currentCheckpointMessage = null;

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', () => {
  setupOnboarding();
});

function setupOnboarding() {
  const choices = {};
  
  // Handle choice button clicks
  document.querySelectorAll('.choice-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const question = e.currentTarget.dataset.question;
      const value = e.currentTarget.dataset.value;
      
      // Deselect all buttons in this question
      document.querySelectorAll(`[data-question="${question}"]`).forEach(b => {
        b.classList.remove('selected');
      });
      
      // Select this button
      e.currentTarget.classList.add('selected');
      choices[question] = value;
      
      // Show/hide cofounder fulltime question based on Q4
      if (question === 'cofounder') {
        const cofounderFTQuestion = document.getElementById('cofounder-fulltime-question');
        console.log('Cofounder question element:', cofounderFTQuestion);
        console.log('Current display style:', cofounderFTQuestion ? cofounderFTQuestion.style.display : 'NULL');
        if (cofounderFTQuestion) {
          if (value === '1') {
            console.log('Setting display to block');
            cofounderFTQuestion.style.display = 'block';
            console.log('After setting, display is:', cofounderFTQuestion.style.display);
          } else {
            console.log('Setting display to none');
            cofounderFTQuestion.style.display = 'none';
            delete choices.cofounder_fulltime;
          }
        }
      }
      
      // Enable start button when ready
      const startBtn = document.getElementById('start-game-btn');
      if (choices.situation && choices.skill && choices.fulltime && choices.cofounder) {
        // If no cofounder, we're done
        if (choices.cofounder === '2') {
          startBtn.disabled = false;
        }
        // If has cofounder, need their fulltime answer too
        else if (choices.cofounder === '1' && choices.cofounder_fulltime) {
          startBtn.disabled = false;
        }
      }
    });
  });
  
  // Handle start game button
  document.getElementById('start-game-btn').addEventListener('click', () => {
    startGame(choices);
  });
}

function startGame(choices) {
  game = new StartupGame();
  const message = game.applyOnboarding(
    choices.situation, 
    choices.skill, 
    choices.fulltime,
    choices.cofounder,
    choices.cofounder_fulltime || '2'  // Default to part-time if no cofounder
  );
  game.updateDerivedValues();
  
  // Show game screen
  document.getElementById('onboarding-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  
  // Show initial message if any
  if (message) {
    showMessage(message, 'success');
  }
  
  updateUI();
}

// ===== UI UPDATE =====

function updateUI() {
  const state = game.getState();
  
  // Update stats
  document.getElementById('stat-date').textContent = state.date;
  document.getElementById('stat-week').textContent = state.weeks;
  document.getElementById('stat-cash').textContent = `$${state.cash.toLocaleString()}`;
  
  const runway = state.cash > 0 ? `${state.runway.toFixed(1)} months runway` : 'OUT OF MONEY';
  document.getElementById('stat-runway').textContent = runway;
  
  const productText = Math.floor(state.product) + '%';
  document.getElementById('stat-product').textContent = state.product_launched ? `${productText} (LAUNCHED)` : productText;
  document.getElementById('product-bar').style.width = state.product + '%';
  
  // Update market fit (dev display)
  document.getElementById('stat-market-fit').textContent = state.product_market_fit + '%';
  document.getElementById('market-fit-bar').style.width = state.product_market_fit + '%';
  
  // Update efficiency metrics (dev display)
  document.getElementById('stat-build-efficiency').textContent = state.build_efficiency + '%';
  document.getElementById('stat-learning-rate').textContent = state.learning_rate + '%';
  
  document.getElementById('stat-customers').textContent = state.customers.toLocaleString();
  document.getElementById('stat-team').textContent = state.team_size;
  document.getElementById('stat-equity').textContent = state.equity + '%';
  document.getElementById('stat-tech').textContent = state.technical;
  document.getElementById('stat-sales').textContent = state.sales;
  document.getElementById('stat-fundraising').textContent = state.fundraising_score + '/100';
  
  renderActions();
  
  // Check if game is over
  if (game.isGameOver()) {
    showGameOver();
  }
}

// ===== ACTION HANDLING =====

function renderActions() {
  // Clear all category containers
  const containers = {
    product: document.getElementById('action-buttons-product'),
    sales: document.getElementById('action-buttons-sales'),
    fundraising: document.getElementById('action-buttons-fundraising'),
    team: document.getElementById('action-buttons-team')
  };
  
  Object.values(containers).forEach(container => {
    if (container) container.innerHTML = '';
  });
  
  const actions = game.getAvailableActions();
  
  actions.forEach(action => {
    const info = game.getActionInfo(action);
    const button = document.createElement('button');
    button.className = 'action-btn';
    // Override title for YC when applications are closed
    let title = info.name;
    if (action === 'APPLY_YC' && !game.isYCApplicationOpen()) {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const openDate = game.game.yc_application_open_date;
      title = `Applications to Ycombinator open in ${months[openDate.getMonth()]} ${openDate.getFullYear()}`;
    }
    button.innerHTML = `
      <div class="action-btn-title">${title}</div>
      <div class="action-btn-time">${info.time} weeks</div>
    `;
    button.onclick = () => executeAction(action);
    
    // Add to appropriate category
    const container = containers[info.category];
    if (container) {
      container.appendChild(button);
    }
  });
  
  // Hide empty categories
  Object.entries(containers).forEach(([category, container]) => {
    const categoryDiv = container.closest('.action-category');
    if (categoryDiv) {
      categoryDiv.style.display = container.children.length > 0 ? 'block' : 'none';
    }
  });
}

function executeAction(action) {
  const result = game.executeAction(action);
  
  // Handle result
  if (result.type === 'decision') {
    if (result.message === 'cofounder_offer') {
      showCofounderDecision(result.data);
    } else if (result.message === 'incubator_offer') {
      showIncubatorDecision(result.data);
    }
  } else {
    showMessage(result.message, result.type);
  }
  
  // Show checkpoint message if any
  if (currentCheckpointMessage) {
    showMessage(currentCheckpointMessage.message, currentCheckpointMessage.type);
    currentCheckpointMessage = null;
  }
  
  updateUI();
}

// ===== MESSAGE DISPLAY =====

function showMessage(message, type = 'info') {
  const messageBox = document.getElementById('message-box');
  messageBox.textContent = message;
  messageBox.className = 'message-box';
  if (type) messageBox.classList.add(type);
  messageBox.classList.remove('hidden');
}

// ===== DECISION PANELS =====

function showCofounderDecision(candidate) {
  const panel = document.getElementById('decision-panel');
  
  panel.innerHTML = `
    <h3>Co-founder Candidate</h3>
    <p><strong>Name:</strong> ${candidate.name}</p>
    <p><strong>Technical Skill:</strong> ${candidate.technical_skill}/10</p>
    <p><strong>Sales Skill:</strong> ${candidate.sales_skill}/10</p>
    <p><strong>Equity Ask:</strong> ${candidate.equity}%</p>
    <div class="decision-buttons">
      <button class="decision-btn accept" onclick="acceptCofounder()">Accept</button>
      <button class="decision-btn decline" onclick="declineCofounder()">Decline</button>
    </div>
  `;
  
  panel.classList.remove('hidden');
}

function showIncubatorDecision(offer) {
  const panel = document.getElementById('decision-panel');
  
  panel.innerHTML = `
    <h3>🎉 Accepted to ${offer.name}!</h3>
    <p><strong>Investment:</strong> $${offer.investment.toLocaleString()}</p>
    <p><strong>Equity:</strong> ${offer.equity}%</p>
    <p><strong>Program Duration:</strong> ${offer.weeks} weeks</p>
    <p><strong>Fundraising Boost:</strong> +${offer.bonus} points</p>
    <div class="decision-buttons">
      <button class="decision-btn accept" onclick="acceptIncubator()">Join Program</button>
      <button class="decision-btn decline" onclick="declineIncubator()">Decline</button>
    </div>
  `;
  
  panel.classList.remove('hidden');
}

function acceptCofounder() {
  const result = game.acceptCofounder();
  showMessage(result.message, result.type);
  document.getElementById('decision-panel').classList.add('hidden');
  updateUI();
}

function declineCofounder() {
  const result = game.declineCofounder();
  showMessage(result.message, result.type);
  document.getElementById('decision-panel').classList.add('hidden');
  updateUI();
}

function acceptIncubator() {
  const result = game.acceptIncubator();
  showMessage(result.message, result.type);
  document.getElementById('decision-panel').classList.add('hidden');
  updateUI();
}

function declineIncubator() {
  const result = game.declineIncubator();
  showMessage(result.message, result.type);
  document.getElementById('decision-panel').classList.add('hidden');
  updateUI();
}

// ===== GAME OVER =====

function showGameOver() {
  document.getElementById('game-screen').classList.add('hidden');
  const gameOverScreen = document.getElementById('game-over-screen');
  gameOverScreen.classList.remove('hidden');
  
  const title = document.getElementById('game-over-title');
  const stats = document.getElementById('game-over-stats');
  const gameOver = document.querySelector('.game-over');
  
  const gameStats = game.getGameOverStats();
  
  if (gameStats.won) {
    gameOver.classList.add('won');
    title.textContent = '🏆 YOU WON! 🏆';
    stats.innerHTML = `
      <p style="font-size: 1.2em; margin: 20px 0;">
        You raised a seed round in ${gameStats.weeks} weeks!
      </p>
      <p><strong>Equity retained:</strong> ${gameStats.equity}%</p>
      <p><strong>Final team size:</strong> ${gameStats.team_size} people</p>
      <p><strong>Customers:</strong> ${gameStats.customers}</p>
    `;
  } else {
    gameOver.classList.add('lost');
    title.textContent = '💀 GAME OVER';
    stats.innerHTML = `
      <p style="font-size: 1.2em; margin: 20px 0;">
        You ran out of money after ${gameStats.weeks} weeks
      </p>
      <p><strong>Product:</strong> ${gameStats.product}%</p>
      <p><strong>Customers:</strong> ${gameStats.customers}</p>
      <p><strong>Team:</strong> ${gameStats.team_size} people</p>
    `;
  }
}
