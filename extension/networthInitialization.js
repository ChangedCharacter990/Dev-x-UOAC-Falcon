function fmt(n) {
  return '$' + Math.round(n).toLocaleString();
}

// ---- Step 1: character creator ----
// Mirrors extension/avatar-app/src/lib/identityOptions.ts — keep in sync.
const BODY_CHOICES = [
  { value: 'male', label: 'Masc' },
  { value: 'female', label: 'Femme' },
];
const HAIR_STYLE_CHOICES = [
  { value: 'plain', label: 'Plain' },
  { value: 'buzzcut', label: 'Buzzcut' },
  { value: 'afro', label: 'Afro' },
  { value: 'curly_short', label: 'Curly' },
  { value: 'dreadlocks_short', label: 'Dreads' },
  { value: 'long_straight', label: 'Long' },
  { value: 'spiked', label: 'Spiked' },
  { value: 'cornrows', label: 'Cornrows' },
  { value: 'bald', label: 'Bald' },
];
const HAIR_COLOR_CHOICES = [
  { value: 'raven', swatch: '#26232c' },
  { value: 'dark_brown', swatch: '#4f3824' },
  { value: 'blonde', swatch: '#e2bc60' },
  { value: 'ginger', swatch: '#b5541c' },
];
const SKIN_TONE_CHOICES = [
  { value: 'light', swatch: '#f9d5ba' },
  { value: 'amber', swatch: '#fdd082' },
  { value: 'olive', swatch: '#d38b59' },
  { value: 'bronze', swatch: '#ae6b3f' },
  { value: 'brown', swatch: '#9c663e' },
  { value: 'black', swatch: '#603429' },
];

const identity = {
  body: 'male',
  skin: 'olive',
  hairStyle: 'plain',
  hairColor: 'dark_brown',
};

// Mirrors extension/avatar-app/src/lib/wealthTiers.ts layerPaths() for the
// "average" tier preview shown during character creation.
function previewLayerPaths() {
  const layers = [`popup/sprites/identity/base_${identity.body}_${identity.skin}.png`];
  layers.push(`popup/sprites/wealth/average/pants_${identity.body}.png`);
  layers.push(`popup/sprites/wealth/average/shoes_${identity.body}.png`);
  layers.push(`popup/sprites/wealth/average/shirt_${identity.body}.png`);
  if (identity.hairStyle !== 'bald') {
    layers.push(`popup/sprites/identity/hair_${identity.hairStyle}_${identity.hairColor}.png`);
  }
  return layers;
}

function renderAvatarPreview() {
  const preview = document.getElementById('avatar-preview');
  preview.innerHTML = '';
  previewLayerPaths().forEach((src) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    preview.appendChild(img);
  });
}

function renderOptionButtons(containerId, choices, key) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  choices.forEach(({ value, label }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-btn' + (identity[key] === value ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => {
      identity[key] = value;
      renderOptionButtons(containerId, choices, key);
      renderAvatarPreview();
    });
    container.appendChild(btn);
  });
}

function renderSwatchButtons(containerId, choices, key) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  choices.forEach(({ value, swatch }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch-btn' + (identity[key] === value ? ' active' : '');
    btn.style.background = swatch;
    btn.setAttribute('aria-label', `${key} ${value}`);
    btn.addEventListener('click', () => {
      identity[key] = value;
      renderSwatchButtons(containerId, choices, key);
      renderAvatarPreview();
    });
    container.appendChild(btn);
  });
}

function initCharacterCreator() {
  renderOptionButtons('body-options', BODY_CHOICES, 'body');
  renderOptionButtons('hair-style-options', HAIR_STYLE_CHOICES, 'hairStyle');
  renderSwatchButtons('hair-color-options', HAIR_COLOR_CHOICES, 'hairColor');
  renderSwatchButtons('skin-options', SKIN_TONE_CHOICES, 'skin');
  renderAvatarPreview();
}

document.getElementById('continue-button').addEventListener('click', () => {
  document.getElementById('step-character').style.display = 'none';
  document.getElementById('step-estimator').style.display = 'block';
  document.getElementById('step-indicator-1').classList.remove('active');
  document.getElementById('step-indicator-2').classList.add('active');
  project();
});

initCharacterCreator();

const ids = ['start','salary','savings-rate','annual-raise','promo-bump','promo-freq','rate','years'];
const el = {};
ids.forEach(id => el[id] = document.getElementById(id));
const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');
let projectedNetWorth = 0;

function drawChart(labels, data) {
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const padL = 60, padR = 15, padT = 15, padB = 30;
  const w = cssWidth - padL - padR;
  const h = cssHeight - padT - padB;

  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const maxVal = Math.max(...data) * 1.1;

  const gridColor = '#e1e0d9';
  const axisColor = '#898781';
  const lineColor = '#2a78d6';
  const fillColor = 'rgba(42,120,214,0.12)';

  const ySteps = 4;
  ctx.strokeStyle = gridColor;
  ctx.fillStyle = axisColor;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= ySteps; i++) {
    const val = (maxVal / ySteps) * i;
    const y = padT + h - (val / maxVal) * h;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + w, y);
    ctx.stroke();
    ctx.fillText('$' + Math.round(val / 1000) + 'k', padL - 8, y);
  }

  const stepX = w / (labels.length - 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const xTickEvery = Math.ceil(labels.length / 8);
  labels.forEach((yr, i) => {
    if (i % xTickEvery === 0 || i === labels.length - 1) {
      const x = padL + i * stepX;
      ctx.fillText(yr, x, padT + h + 8);
    }
  });

  ctx.beginPath();
  data.forEach((val, i) => {
    const x = padL + i * stepX;
    const y = padT + h - (val / maxVal) * h;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.lineTo(padL + (data.length - 1) * stepX, padT + h);
  ctx.lineTo(padL, padT + h);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();

  ctx.beginPath();
  data.forEach((val, i) => {
    const x = padL + i * stepX;
    const y = padT + h - (val / maxVal) * h;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function project() {
  const start = parseFloat(el['start'].value) || 0;
  let salary = parseFloat(el['salary'].value) || 0;
  const savingsRate = parseFloat(el['savings-rate'].value) / 100;
  const annualRaise = parseFloat(el['annual-raise'].value) / 100;
  const promoBump = parseFloat(el['promo-bump'].value) / 100;
  const promoFreq = parseInt(el['promo-freq'].value);
  const returnRate = parseFloat(el['rate'].value) / 100;
  const years = parseInt(el['years'].value);

  document.getElementById('savings-rate-out').textContent = (savingsRate * 100).toFixed(0) + '%';
  document.getElementById('annual-raise-out').textContent = (annualRaise * 100).toFixed(1).replace(/\.0$/, '') + '%';
  document.getElementById('promo-bump-out').textContent = (promoBump * 100).toFixed(0) + '%';
  document.getElementById('promo-freq-out').textContent = promoFreq;
  document.getElementById('rate-out').textContent = (returnRate * 100).toFixed(1).replace(/\.0$/, '') + '%';
  document.getElementById('years-out').textContent = years;
  document.getElementById('years-label-a').textContent = years;
  document.getElementById('years-label-b').textContent = years;

  const labels = [0];
  const nwData = [Math.round(start)];
  let nw = start;

  for (let y = 1; y <= years; y++) {
    salary = salary * (1 + annualRaise);
    if (promoFreq > 0 && y % promoFreq === 0) {
      salary = salary * (1 + promoBump);
    }
    const contribution = salary * savingsRate;
    nw = nw * (1 + returnRate) + contribution;
    labels.push(y);
    nwData.push(Math.round(nw));
  }

  document.getElementById('salary-result').textContent = fmt(salary);
  document.getElementById('nw-result').textContent = fmt(nw);
  projectedNetWorth = Math.round(nw);

  drawChart(labels, nwData);
}

ids.forEach(id => el[id].addEventListener('input', project));
window.addEventListener('resize', project);

document.getElementById('start-button').addEventListener('click', async () => {
  const confirmed = window.confirm(
    `Start with ${fmt(projectedNetWorth)} as your net worth?`
  );
  if (!confirmed) return;

  await chrome.storage.local.set({
    netWorth: projectedNetWorth,
    startingNetWorth: projectedNetWorth,
    shortsWatched: 0,
    isInitialized: true,
    identity,
  });
  await chrome.action.setPopup({ popup: 'popup/index.html' });

  const currentTab = await chrome.tabs.getCurrent();
  if (currentTab?.id) {
    await chrome.tabs.remove(currentTab.id);
  }
});
