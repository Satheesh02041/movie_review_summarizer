import { runSystem3Pipeline } from './pipeline.js';

// DOM Elements
const tabBtns = document.querySelectorAll('.nav-btn');
const tabViews = document.querySelectorAll('.tab-view');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');

// Dropdown State and Elements
let selectedValue = '';
let selectedText = 'Load Preset Dataset...';
let allDropdownOptions = [
  { value: 'custom', text: 'Clear & Custom Input', group: null },
  { value: '', text: 'Loading movie list from Google Drive...', group: 'Google Drive Movies (Loading...)', disabled: true }
];

const dropdownTrigger = document.querySelector('.dropdown-trigger');
const selectedValueEl = dropdownTrigger.querySelector('.selected-value');
const dropdownPanel = document.querySelector('.dropdown-panel');
const searchInput = document.querySelector('.dropdown-search-input');
const optionsListEl = document.querySelector('.dropdown-options-list');

const reviewsInput = document.getElementById('reviews-input');
const clearInputBtn = document.getElementById('clear-input-btn');
const runPipelineBtn = document.getElementById('run-pipeline-btn');
const censorToggle = document.getElementById('censor-toggle');

// Cinema Loader Overlay elements
const cinemaLoader = document.getElementById('cinema-loader');
const loaderStatusText = document.getElementById('loader-status-text');
const loaderProgress = document.getElementById('loader-progress');

// Dashboard metrics
const statAvgRating = document.getElementById('stat-avg-rating');
const statStarsRender = document.getElementById('stat-stars-render');
const statSentimentScore = document.getElementById('stat-sentiment-score');
const statSentimentProgress = document.getElementById('stat-sentiment-progress');
const statTotalReviews = document.getElementById('stat-total-reviews');
const statLanguagesCount = document.getElementById('stat-languages-count');
const statProfanitiesCount = document.getElementById('stat-profanities-count');
const statProfanitiesRatio = document.getElementById('stat-profanities-ratio');

// Dashboard summary area
const dashboardEmptyState = document.getElementById('dashboard-empty-state');
const summaryDataWrapper = document.getElementById('summary-data-wrapper');
const summaryVerdictVal = document.getElementById('summary-verdict-val');
const summaryLangBadge = document.getElementById('summary-lang-badge');
const aspectSectionsContainer = document.getElementById('aspect-sections-container');

// Charts & Insights
const chartNetSentiment = document.getElementById('chart-net-sentiment');
const doughnutGood = document.getElementById('doughnut-segment-good');
const doughnutNeutral = document.getElementById('doughnut-segment-neutral');
const doughnutBad = document.getElementById('doughnut-segment-bad');

const legendGoodVal = document.getElementById('legend-good-val');
const legendNeutralVal = document.getElementById('legend-neutral-val');
const legendBadVal = document.getElementById('legend-bad-val');

const barScoreQuality = document.getElementById('bar-score-quality');
const barFillQuality = document.getElementById('bar-fill-quality');
const barScorePerformance = document.getElementById('bar-score-performance');
const barFillPerformance = document.getElementById('bar-fill-performance');
const barScorePrice = document.getElementById('bar-score-price');
const barFillPrice = document.getElementById('bar-fill-price');
const barScoreSupport = document.getElementById('bar-score-support');
const barFillSupport = document.getElementById('bar-fill-support');

const preservedNumbersList = document.getElementById('preserved-numbers-list');
const emojiSignalsContainer = document.getElementById('emoji-signals-container');

// State Variables
let pipelineResults = null;
let currentTab = 'pipeline';

// ----------------------------------------------------
// Slide Drawer
// ----------------------------------------------------
const hamburgerBtn   = document.getElementById('hamburger-btn');
const slideDrawer    = document.getElementById('slide-drawer');
const drawerOverlay  = document.getElementById('drawer-overlay');
const drawerCloseBtn = document.getElementById('drawer-close-btn');

function openDrawer() {
  slideDrawer.classList.add('open');
  drawerOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  slideDrawer.classList.remove('open');
  drawerOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

hamburgerBtn.addEventListener('click', () => {
  slideDrawer.classList.contains('open') ? closeDrawer() : openDrawer();
});
drawerOverlay.addEventListener('click', closeDrawer);
drawerCloseBtn.addEventListener('click', closeDrawer);

// ----------------------------------------------------
// Tab Switching
// ----------------------------------------------------
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.getAttribute('data-tab');
    switchTab(tabName);
    closeDrawer();
  });
});

function switchTab(tabName) {
  currentTab = tabName;
  tabBtns.forEach(b => b.classList.remove('active'));
  tabViews.forEach(v => v.classList.remove('active'));
  
  const targetBtn = document.querySelector(`.nav-btn[data-tab="${tabName}"]`);
  const targetView = document.getElementById(`view-${tabName}`);
  
  if (targetBtn && targetView) {
    targetBtn.classList.add('active');
    targetView.classList.add('active');
  }

  // Update Page Title
  if (tabName === 'pipeline') {
    pageTitle.textContent = 'Critic Ingestion';
    pageSubtitle.textContent = 'Ingest reviews · detect profanity · synthesize opinions';
  } else if (tabName === 'dashboard') {
    pageTitle.textContent = 'Movie Analytics 🎬';
    pageSubtitle.textContent = 'Consensus · sentiment charts · aspect scores · extracted facts';
  }
}

// ----------------------------------------------------
// Data Loading & Presets
// ----------------------------------------------------
// Toggle dropdown panel
dropdownTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = !dropdownPanel.classList.contains('hidden');
  if (isOpen) {
    closeDropdown();
  } else {
    openDropdown();
  }
});

function openDropdown() {
  dropdownPanel.classList.remove('hidden');
  dropdownTrigger.classList.add('active');
  searchInput.focus();
  searchInput.value = '';
  filterOptions('');
}

function closeDropdown() {
  dropdownPanel.classList.add('hidden');
  dropdownTrigger.classList.remove('active');
}

// Close when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.searchable-dropdown')) {
    closeDropdown();
  }
});

// Search input filtering
searchInput.addEventListener('input', (e) => {
  filterOptions(e.target.value);
});

// Prevent dropdown closing when interacting with search input
searchInput.addEventListener('click', (e) => {
  e.stopPropagation();
});

function filterOptions(query) {
  const cleanQuery = query.toLowerCase().trim();
  const filtered = allDropdownOptions.filter(opt => {
    if (opt.disabled && opt.value === '') return true; // keep loading/error indicators
    return opt.text.toLowerCase().includes(cleanQuery);
  });
  renderOptions(filtered, cleanQuery);
}

function renderOptions(options, query = '') {
  optionsListEl.innerHTML = '';
  
  if (options.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'dropdown-no-results';
    noResults.textContent = 'No matching datasets found';
    optionsListEl.appendChild(noResults);
    return;
  }
  
  // Group options
  const groups = {};
  const ungrouped = [];
  
  options.forEach(opt => {
    if (opt.group) {
      if (!groups[opt.group]) {
        groups[opt.group] = [];
      }
      groups[opt.group].push(opt);
    } else {
      ungrouped.push(opt);
    }
  });
  
  // Render ungrouped
  ungrouped.forEach(opt => {
    createOptionElement(opt);
  });
  
  // Render grouped
  for (const [groupName, groupOpts] of Object.entries(groups)) {
    const header = document.createElement('div');
    header.className = 'dropdown-group-header';
    header.textContent = groupName;
    optionsListEl.appendChild(header);
    
    groupOpts.forEach(opt => {
      createOptionElement(opt);
    });
  }
}

function createOptionElement(opt) {
  const item = document.createElement('div');
  item.className = 'dropdown-option';
  if (opt.disabled) {
    item.classList.add('disabled');
  }
  if (opt.value === selectedValue && opt.value !== '') {
    item.classList.add('selected');
  }
  
  // Text content of the option
  const textSpan = document.createElement('span');
  textSpan.textContent = opt.text;
  item.appendChild(textSpan);

  // Add checkmark/indicator if selected
  if (opt.value === selectedValue && opt.value !== '') {
    const checkIcon = document.createElement('i');
    checkIcon.className = 'bx bx-check';
    checkIcon.style.color = 'var(--accent-purple)';
    checkIcon.style.fontSize = '16px';
    item.appendChild(checkIcon);
  }
  
  if (!opt.disabled) {
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      await selectOption(opt.value, opt.text);
      closeDropdown();
    });
  }
  
  optionsListEl.appendChild(item);
}

async function selectOption(val, text) {
  selectedValue = val;
  selectedText = text;
  selectedValueEl.textContent = text;
  
  if (val === 'custom') {
    reviewsInput.value = '';
    reviewsInput.placeholder = 'Enter your custom reviews here...';
  } else if (val.startsWith('gdrive_')) {
    const fileId = val.replace('gdrive_', '');
    const movieName = text.replace('Movie: ', '');
    await loadGDriveDataset(fileId, movieName);
  }
}

// Initial render
renderOptions(allDropdownOptions);

clearInputBtn.addEventListener('click', () => {
  reviewsInput.value = '';
  selectOption('', 'Load Preset Dataset...');
});

// ----------------------------------------------------
// Pipeline Execution Simulation
// ----------------------------------------------------
runPipelineBtn.addEventListener('click', () => {
  const rawText = reviewsInput.value.trim();
  if (!rawText) {
    alert('Please load a preset or enter custom reviews first.');
    return;
  }

  // Disable run button and reveal overlay
  runPipelineBtn.disabled = true;
  cinemaLoader.classList.remove('hidden');
  loaderProgress.style.width = '0%';
  loaderStatusText.textContent = 'Setting up critic reels...';

  // Execute Pipeline with callbacks simulating real-time step progressions
  const outputLang = 'en';
  const censorMode = censorToggle.checked;

  runSystem3Pipeline(rawText, censorMode, outputLang, (step, stepData) => {
    updateLoaderUI(step, stepData);
    
    if (step === 5) {
      pipelineResults = stepData.data;
      runPipelineBtn.disabled = false;

      // Automatically populate Dashboard and redirect to Dashboard tab
      populateDashboard(pipelineResults);
      
      // Auto switch to dashboard view to wow the user after showing 100% progress
      setTimeout(() => {
        cinemaLoader.classList.add('hidden');
        switchTab('dashboard');
      }, 1200);
    }
  });
});

// ----------------------------------------------------
// Cinema Loader UI Update (Real-time Pipeline Progress)
// ----------------------------------------------------
function updateLoaderUI(step, data) {
  let progress = 0;
  let status = '';

  if (step === 1) {
    progress = 20;
    status = 'Scanning review rolls and identifying source dialects...';
  } else if (step === 2) {
    progress = 40;
    status = 'Censoring audio track & bleeping vulgar terms...';
  } else if (step === 3) {
    progress = 60;
    status = 'Developing clean, normalized review prints...';
  } else if (step === 4) {
    progress = 80;
    status = 'Activating spoiler shields & logging rating reels...';
  } else if (step === 5) {
    progress = 100;
    status = 'Synthesizing consensus & rolling analytics...';
  }

  loaderProgress.style.width = `${progress}%`;
  loaderStatusText.textContent = status;
}

// ----------------------------------------------------
// Dashboard Population
// ----------------------------------------------------
function populateDashboard(results) {
  // Reveal UI
  dashboardEmptyState.classList.add('hidden');
  summaryDataWrapper.classList.remove('hidden');

  // ─── HERO VERDICT BANNER ───
  const heroEl        = document.getElementById('verdict-hero');
  const heroVal       = document.getElementById('verdict-hero-val');
  const heroSub       = document.getElementById('verdict-hero-sub');
  const vhRating      = document.getElementById('vh-rating');
  const vhSentiment   = document.getElementById('vh-sentiment');
  const vhReviews     = document.getElementById('vh-reviews');

  heroEl.classList.remove('hidden');
  heroVal.textContent = results.overallVerdict || results.finalSummary.verdictText;
  heroSub.textContent = getSentimentQuip(results.netSentiment, results.averageRating);
  vhRating.textContent = `${results.averageRating.toFixed(1)} ★`;
  vhSentiment.textContent = `${results.netSentiment}%`;
  vhReviews.textContent = results.totalReviews;

  // Color the hero based on verdict
  heroEl.style.background = getHeroBg(results.overallVerdict);

  // 1. Core metrics cards
  statAvgRating.textContent = `${results.averageRating.toFixed(1)} / 5.0`;
  renderStars(results.averageRating);

  // Rating interpretation label
  const ratingInterpEl = document.getElementById('stat-rating-interp');
  if (ratingInterpEl) {
    const { cls, label } = getRatingInterp(results.averageRating);
    ratingInterpEl.className = `stat-interpretation ${cls}`;
    ratingInterpEl.textContent = label;
  }

  statSentimentScore.textContent = `${results.netSentiment}%`;
  statSentimentProgress.style.width = `${results.netSentiment}%`;

  // Sentiment interpretation label
  const sentimentInterpEl = document.getElementById('stat-sentiment-interp');
  if (sentimentInterpEl) {
    const { cls, label } = getSentimentInterp(results.netSentiment);
    sentimentInterpEl.className = `stat-interpretation ${cls}`;
    sentimentInterpEl.textContent = label;
  }

  statTotalReviews.textContent = results.totalReviews;
  const langNames = Object.keys(results.languages).map(l => l.toUpperCase()).join(', ');
  statLanguagesCount.textContent = `Source Languages: ${langNames}`;

  statProfanitiesCount.textContent = results.profanitiesSuppressed;
  statProfanitiesRatio.textContent = `${results.profanityRatio}% of reviews censored`;

  // 2. Synthesized Summary Card
  const activeLang = 'en';
  summaryLangBadge.textContent = getLangName(activeLang);

  // Recommendation Badge
  summaryVerdictVal.textContent = results.finalSummary.verdictText;
  summaryVerdictVal.className = 'verdict-val';
  if (results.overallVerdict === 'Strong Buy') summaryVerdictVal.classList.add('text-good');
  else if (results.overallVerdict === 'Buy') summaryVerdictVal.classList.add('text-info');
  else if (results.overallVerdict === 'Pass') summaryVerdictVal.classList.add('text-danger');

  // Verdict stars (big)
  const verdictStarsBig = document.getElementById('verdict-stars-big');
  if (verdictStarsBig) renderStarsToEl(verdictStarsBig, results.averageRating, '20px');

  // Key Takeaways
  const keyTakeaways = document.getElementById('key-takeaways');
  if (keyTakeaways) {
    keyTakeaways.innerHTML = '';
    const takeaways = buildTakeaways(results);
    takeaways.forEach(t => {
      const div = document.createElement('div');
      div.className = `takeaway-item ${t.type}`;
      div.innerHTML = `
        <i class="bx ${t.icon} takeaway-icon"></i>
        <div class="takeaway-text"><strong>${t.title}</strong>${t.body}</div>
      `;
      keyTakeaways.appendChild(div);
    });
  }

  // Dynamic Aspect compilation
  aspectSectionsContainer.innerHTML = '';
  for (const [key, aspect] of Object.entries(results.finalSummary.aspects)) {
    const isAvailable = aspect.score !== null;
    const scoreColor = isAvailable ? getAspectScoreColor(aspect.score) : 'var(--text-dark)';
    
    const block = document.createElement('div');
    block.className = 'aspect-item-block';
    block.innerHTML = `
      <div class="aspect-title-row">
        <h4><i class="bx ${getAspectIcon(key)} text-gradient"></i> ${aspect.name}</h4>
        ${isAvailable ? `<span class="aspect-badge" style="background-color: ${scoreColor}22; color: ${scoreColor}">${aspect.score}% Positive</span>` : `<span class="aspect-badge" style="background: rgba(255,255,255,0.03); color: var(--text-dark)">N/A</span>`}
      </div>
      <p class="aspect-text">${aspect.summary}</p>
    `;
    aspectSectionsContainer.appendChild(block);
  }

  // 3. Analytics Charts
  // Feature Aspect Bars
  updateAspectBar('quality', results.summaryAspects.quality.score);
  updateAspectBar('performance', results.summaryAspects.performance.score);
  updateAspectBar('price', results.summaryAspects.price.score);
  updateAspectBar('support', results.summaryAspects.support.score);

  // SVG Doughnut Chart for Opinion Tiers
  let goodPct = results.netSentiment;
  let badPct = Math.round((5.0 - results.averageRating) * 20);
  let neutralPct = 100 - goodPct - badPct;
  if (neutralPct < 0) {
    neutralPct = 0;
    badPct = 100 - goodPct;
  }

  legendGoodVal.textContent = `${goodPct}%`;
  legendNeutralVal.textContent = `${neutralPct}%`;
  legendBadVal.textContent = `${badPct}%`;
  chartNetSentiment.textContent = `${goodPct}%`;

  // Sentiment verdict chip
  const chip = document.getElementById('sentiment-verdict-chip');
  if (chip) {
    const { chipText, chipClass } = getSentimentChip(goodPct);
    chip.textContent = chipText;
    chip.style.background = '';
    chip.style.color = '';
    chip.style.borderColor = '';
    if (chipClass === 'good') {
      chip.style.background = 'var(--color-good-bg)';
      chip.style.color = 'var(--color-good)';
      chip.style.borderColor = 'rgba(26,127,60,0.3)';
      chip.style.borderStyle = 'solid';
    } else if (chipClass === 'mid') {
      chip.style.background = 'var(--color-neutral-bg)';
      chip.style.color = 'var(--color-neutral)';
      chip.style.borderColor = 'rgba(212,96,10,0.3)';
      chip.style.borderStyle = 'solid';
    } else if (chipClass === 'bad') {
      chip.style.background = 'var(--color-bad-bg)';
      chip.style.color = 'var(--color-bad)';
      chip.style.borderColor = 'rgba(192,57,43,0.3)';
      chip.style.borderStyle = 'solid';
    }
  }

  // Draw SVG sectors
  const circ = 251.327;
  const goodDash = (goodPct / 100) * circ;
  doughnutGood.style.strokeDasharray = `${goodDash} ${circ}`;
  doughnutGood.style.strokeDashoffset = '0';

  const neutralDash = (neutralPct / 100) * circ;
  doughnutNeutral.style.strokeDasharray = `${neutralDash} ${circ}`;
  doughnutNeutral.style.strokeDashoffset = `-${goodDash}`;

  const badDash = (badPct / 100) * circ;
  doughnutBad.style.strokeDasharray = `${badDash} ${circ}`;
  doughnutBad.style.strokeDashoffset = `-${goodDash + neutralDash}`;

  // 4. Extracted facts / numbers list
  preservedNumbersList.innerHTML = '';
  if (results.preservedNumbers.length === 0) {
    preservedNumbersList.innerHTML = '<li class="empty-list-placeholder">No numeric limits found.</li>';
  } else {
    results.preservedNumbers.forEach(num => {
      const li = document.createElement('li');
      li.textContent = num;
      preservedNumbersList.appendChild(li);
    });
  }

  // Emojis list
  emojiSignalsContainer.innerHTML = '';
  if (results.detectedEmojis.length === 0) {
    emojiSignalsContainer.innerHTML = '<span class="empty-list-placeholder">No emoji signals found.</span>';
  } else {
    results.detectedEmojis.forEach(em => {
      const span = document.createElement('span');
      span.className = 'emoji-badge';
      span.textContent = em;
      emojiSignalsContainer.appendChild(span);
    });
  }
}

// ----------------------------------------------------
// UI Helpers
// ----------------------------------------------------
function renderStars(rating) {
  statStarsRender.innerHTML = '';
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.4;
  
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('i');
    if (i <= fullStars) {
      star.className = 'bx bxs-star';
    } else if (i === fullStars + 1 && hasHalf) {
      star.className = 'bx bxs-star-half';
    } else {
      star.className = 'bx bx-star';
    }
    statStarsRender.appendChild(star);
  }
}

function renderStarsToEl(el, rating, size = '12px') {
  el.innerHTML = '';
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.4;
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('i');
    star.style.fontSize = size;
    star.style.color = 'var(--gold)';
    if (i <= fullStars) star.className = 'bx bxs-star';
    else if (i === fullStars + 1 && hasHalf) star.className = 'bx bxs-star-half';
    else star.className = 'bx bx-star';
    el.appendChild(star);
  }
}

function getAspectIcon(aspect) {
  if (aspect === 'quality') return 'bx-shield-quarter';
  if (aspect === 'performance') return 'bx-bolt-circle';
  if (aspect === 'price') return 'bx-dollar-circle';
  return 'bx-package';
}

function getAspectScoreColor(score) {
  if (score >= 75) return 'var(--color-good)';
  if (score >= 40) return 'var(--color-neutral)';
  return 'var(--color-bad)';
}

function getAspectTag(score) {
  if (score === null) return { cls: 'tag-na', label: 'N/A' };
  if (score >= 80) return { cls: 'tag-great', label: '🔥 Excellent' };
  if (score >= 60) return { cls: 'tag-good',  label: '✓ Good' };
  if (score >= 40) return { cls: 'tag-mid',   label: '~ Mixed' };
  return { cls: 'tag-low', label: '✗ Weak' };
}

function getRatingInterp(rating) {
  if (rating >= 4.5) return { cls: 'interp-great', label: '🏆 Exceptional' };
  if (rating >= 3.5) return { cls: 'interp-good',  label: '👍 Well-received' };
  if (rating >= 2.5) return { cls: 'interp-mid',   label: '😐 Divisive' };
  return { cls: 'interp-low', label: '👎 Poorly-rated' };
}

function getSentimentInterp(pct) {
  if (pct >= 75) return { cls: 'interp-great', label: '💚 Audience loved it' };
  if (pct >= 55) return { cls: 'interp-good',  label: '👍 Mostly positive' };
  if (pct >= 40) return { cls: 'interp-mid',   label: '⚡ Mixed reception' };
  return { cls: 'interp-low', label: '⚠️ Audience disliked it' };
}

function getSentimentChip(goodPct) {
  if (goodPct >= 75) return { chipText: '✅ Predominantly Positive — Most critics enjoyed this', chipClass: 'good' };
  if (goodPct >= 55) return { chipText: '👍 Mostly Positive — More fans than critics', chipClass: 'good' };
  if (goodPct >= 40) return { chipText: '⚡ Mixed Reviews — Very divided audience', chipClass: 'mid' };
  return { chipText: '⚠️ Mostly Negative — Critics were disappointed', chipClass: 'bad' };
}

function getHeroBg(verdict) {
  if (verdict === 'Strong Buy') return 'linear-gradient(135deg, #0D2B1A 0%, #1A3D28 60%, #0D2B1A 100%)';
  if (verdict === 'Buy') return 'linear-gradient(135deg, #0D1A2B 0%, #1A2E3D 60%, #0D1A2B 100%)';
  return 'linear-gradient(135deg, #1A1A2E 0%, #2C1A3E 60%, #1A1A2E 100%)';
}

function getSentimentQuip(sentiment, rating) {
  if (sentiment >= 75 && rating >= 4) return 'Critics are raving — this movie is a crowd-pleaser! 🎉';
  if (sentiment >= 55) return 'More thumbs up than down from critics overall.';
  if (sentiment >= 40) return 'A polarizing film — opinions are split down the middle.';
  return 'Critics were largely unimpressed with this one.';
}

function buildTakeaways(results) {
  const takeaways = [];
  const { netSentiment, averageRating, summaryAspects, profanityRatio } = results;

  // Strongest aspect
  const aspectEntries = Object.entries(summaryAspects).filter(([, v]) => v.score !== null);
  if (aspectEntries.length > 0) {
    const best = aspectEntries.reduce((a, b) => b[1].score > a[1].score ? b : a);
    const worst = aspectEntries.reduce((a, b) => b[1].score < a[1].score ? b : a);
    if (best[1].score >= 60) {
      takeaways.push({ type: 'good', icon: 'bx-trophy', title: `Strongest Point: ${best[1].name || best[0]}`, body: `${best[1].score}% of critics praised this aspect` });
    }
    if (worst[1].score !== null && worst[1].score < 45 && worst !== best) {
      takeaways.push({ type: 'bad', icon: 'bx-error-circle', title: `Weakest Point: ${worst[1].name || worst[0]}`, body: `Only ${worst[1].score}% had positive things to say` });
    }
  }

  // Overall sentiment
  if (netSentiment >= 70) {
    takeaways.push({ type: 'good', icon: 'bx-like', title: 'High Positive Sentiment', body: `${netSentiment}% of critics responded positively` });
  } else if (netSentiment < 40) {
    takeaways.push({ type: 'bad', icon: 'bx-dislike', title: 'Low Audience Approval', body: `Only ${netSentiment}% had a positive experience` });
  }

  // Profanity flag
  if (profanityRatio > 30) {
    takeaways.push({ type: 'info', icon: 'bx-info-circle', title: 'High Emotional Language', body: `${profanityRatio}% of reviews contained strong language — indicates passionate reactions` });
  }

  return takeaways.slice(0, 3); // max 3 callouts
}

function updateAspectBar(aspect, score) {
  const scoreEl = document.getElementById(`bar-score-${aspect}`);
  const fillEl = document.getElementById(`bar-fill-${aspect}`);
  const tagEl = document.getElementById(`bar-tag-${aspect}`);
  
  if (score !== null) {
    scoreEl.textContent = `${score}%`;
    // Color the score text
    scoreEl.style.color = getAspectScoreColor(score);
    fillEl.style.width = `${score}%`;
    if (tagEl) {
      const { cls, label } = getAspectTag(score);
      tagEl.className = `aspect-tag ${cls}`;
      tagEl.textContent = label;
    }
  } else {
    scoreEl.textContent = 'N/A';
    scoreEl.style.color = 'var(--text-dark)';
    fillEl.style.width = '0%';
    if (tagEl) {
      tagEl.className = 'aspect-tag tag-na';
      tagEl.textContent = 'N/A';
    }
  }
}

function getLangName(code) {
  if (code === 'es') return 'Spanish';
  if (code === 'fr') return 'French';
  if (code === 'de') return 'German';
  return 'English';
}

// ----------------------------------------------------
// Google Drive Integration Logic (CORS-Proxy scraper)
// ----------------------------------------------------

// State-machine CSV Parser to handle quotes and newlines inside fields
function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentValue = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i+1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        i++; // Skip the next escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentValue);
      currentValue = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip \n
      }
      row.push(currentValue);
      if (row.length > 1 || row[0] !== '') {
        lines.push(row);
      }
      row = [];
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  if (row.length > 0 || currentValue !== '') {
    row.push(currentValue);
    lines.push(row);
  }
  return lines;
}

// Helper to fetch resource using a fallback chain of public CORS proxies
async function fetchWithProxyFallback(targetUrl) {
  const proxies = [
    {
      name: 'CodeTabs',
      buildUrl: (url) => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url)
    },
    {
      name: 'AllOrigins',
      buildUrl: (url) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url)
    }
  ];

  let lastError = null;
  for (const proxy of proxies) {
    try {
      console.log(`Attempting to fetch via ${proxy.name} proxy: ${targetUrl}`);
      const response = await fetch(proxy.buildUrl(targetUrl));
      if (response.ok) {
        return response;
      }
      throw new Error(`Status ${response.status} from ${proxy.name} proxy`);
    } catch (err) {
      console.warn(`${proxy.name} proxy failed:`, err);
      lastError = err;
    }
  }
  throw new Error(`All CORS proxies failed. Last error: ${lastError ? lastError.message : 'Unknown error'}`);
}

// Load movies list from Google Drive Folder HTML via CORS proxy
async function loadGDriveMoviesList() {
  try {
    const response = await fetchWithProxyFallback('https://drive.google.com/embeddedfolderview?id=1J03IpWFvlvucg_CJQAP9Zce6ba9tw2r_');
    const htmlText = await response.text();
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const entries = doc.querySelectorAll('.flip-entry');
    
    if (entries.length === 0) {
      throw new Error('No files found in folder HTML.');
    }
    
    const movies = [];
    entries.forEach(entry => {
      const titleEl = entry.querySelector('.flip-entry-title');
      const linkEl = entry.querySelector('.flip-entry-info a');
      if (titleEl && linkEl) {
        const name = titleEl.textContent.trim().replace('.csv', '');
        const href = linkEl.getAttribute('href');
        const match = href.match(/\/file\/d\/([^\/]+)/);
        if (match) {
          movies.push({ name, id: match[1] });
        }
      }
    });
    
    // Sort movies alphabetically
    movies.sort((a, b) => a.name.localeCompare(b.name));
    
    const groupName = `Google Drive Movie Datasets (${entries.length} files)`;
    allDropdownOptions = [
      { value: 'custom', text: 'Clear & Custom Input', group: null },
      ...movies.map(movie => ({
        value: `gdrive_${movie.id}`,
        text: `Movie: ${movie.name}`,
        group: groupName
      }))
    ];
    
    filterOptions(searchInput.value || '');
  } catch (error) {
    console.error('Failed to load Google Drive movie list:', error);
    allDropdownOptions = [
      { value: 'custom', text: 'Clear & Custom Input', group: null },
      { value: '', text: 'Error: could not fetch movie list.', group: 'Google Drive Movies (Load Failed)', disabled: true }
    ];
    filterOptions(searchInput.value || '');
  }
}

// Load movie reviews from selected file in Google Drive
async function loadGDriveDataset(fileId, movieName) {
  reviewsInput.value = `// Fetching reviews for "${movieName}" from Google Drive...\n// Please wait...`;
  reviewsInput.disabled = true;
  runPipelineBtn.disabled = true;
  
  try {
    const directUrl = `https://docs.google.com/uc?export=download&id=${fileId}`;
    const response = await fetchWithProxyFallback(directUrl);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const csvText = await response.text();
    
    if (csvText.startsWith('Error:')) {
      throw new Error(csvText);
    }
    
    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      throw new Error('CSV file contains no review data.');
    }
    
    // Determine headers
    const headers = rows[0].map(h => h.toLowerCase().trim().replace(/['"]/g, ''));
    const ratingIdx = headers.indexOf('rating');
    const titleIdx = headers.indexOf('title');
    const reviewIdx = headers.indexOf('review');
    
    if (reviewIdx === -1) {
      throw new Error('Could not find "review" column in CSV.');
    }
    
    const formattedReviews = [];
    
    // Parse review data
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length <= reviewIdx) continue;
      
      const ratingVal = ratingIdx !== -1 ? parseInt(row[ratingIdx]) : NaN;
      const ratingStr = isNaN(ratingVal) ? "" : `[${Math.ceil(ratingVal / 2)}★] `;
      
      const title = titleIdx !== -1 && row[titleIdx] ? row[titleIdx].trim() : "";
      const reviewText = row[reviewIdx] ? row[reviewIdx].trim() : "";
      
      if (reviewText) {
        // Format review block: [Rating★] Title \n Review text
        const formatted = `${ratingStr}${title}\n${reviewText}`;
        formattedReviews.push(formatted);
      }
    }
    
    reviewsInput.value = formattedReviews.join('\n\n');
  } catch (error) {
    console.error('Error loading movie dataset:', error);
    reviewsInput.value = `// Error loading dataset: ${error.message}`;
    alert('Failed to load dataset: ' + error.message);
  } finally {
    reviewsInput.disabled = false;
    runPipelineBtn.disabled = false;
  }
}

// Automatically load the movie list on script startup
loadGDriveMoviesList();


