document.addEventListener('DOMContentLoaded', () => {
  refreshPanelUI();

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.currentLookup || changes.currentContext) {
      refreshPanelUI();
    }
  });

  document.getElementById('clear-notes').addEventListener('click', () => {
    chrome.storage.local.set({ noteHistory: "" }, () => {
      document.getElementById('view-note').value = "";
    });
  });

  document.getElementById('research-btn').addEventListener('click', () => {
    chrome.storage.local.get(['currentLookup', 'currentContext'], (data) => {
      executeDeepResearch(data.currentLookup || "", data.currentContext || "");
    });
  });
});
chrome.tabs.onActivated.addListener(() => {
  document.getElementById('card-convert').style.display = 'none';
  document.getElementById('card-map').style.display = 'none';
  console.log("Dashboard reset due to tab switch.");
});
let isCooldown = false;

document.getElementById('btn-append').addEventListener('click', () => {
  if (isCooldown) return;

  const highlightEl = document.getElementById('user-highlight');
  const selectedText = highlightEl.innerText.replace(/[“”]/g, "").trim();

  if (!selectedText) return;

  chrome.storage.local.get(['noteHistory'], (data) => {
    let history = data.noteHistory || "";
    if (!history.includes(selectedText)) {
      history = history ? `${history}\n• ${selectedText}` : `• ${selectedText}`;
      chrome.storage.local.set({ noteHistory: history }, () => {
        document.getElementById('view-note').value = history;
      });
    }
  });

  triggerCooldown();
});

function triggerCooldown() {
  const btn = document.getElementById('btn-append');
  isCooldown = true;
  btn.disabled = true;
  let count = 3;
  
  btn.innerText = `Wait ${count}s`;
  
  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      btn.innerText = `Wait ${count}s`;
    } else {
      clearInterval(interval);
      btn.innerText = "Append Selection";
      btn.disabled = false;
      isCooldown = false;
    }
  }, 1000);
}
async function refreshPanelUI() {
  chrome.storage.local.get(['currentLookup', 'currentContext'], async (data) => {
    const text = (data.currentLookup || "").trim();
    const context = data.currentContext || "";

    if (!text) return;

    document.getElementById('user-highlight').innerText = `“${text}”`;

    await runDefinitionModule(text, context);
    
    runConversionModule(text, context);
    runMapModule(text);
  });
}

async function runDefinitionModule(text, context) {
  const card = document.getElementById('card-define');
  const output = document.getElementById('view-define');
  const words = text.trim().split(/\s+/);

  if (words.length > 1) {
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';
  output.innerHTML = "<em>Fetching definitions...</em>";

  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${text.trim()}`);
    if (!response.ok) throw new Error("Not found");
    const data = await response.json();

    let definitions = [];
    data[0].meanings.forEach(meaning => {
      meaning.definitions.forEach(def => {
        definitions.push(def.definition);
      });
    });

    const topTwo = definitions.slice(0, 2);
    
    output.innerHTML = `<strong>${text.trim()}</strong>:<br>
      <ol style="margin: 0; padding-left: 20px;">
        ${topTwo.map(d => `<li>${d}</li>`).join('')}
      </ol>`;

  } catch (e) {
    output.innerHTML = `<em>Definition unavailable for "${text}".</em>`;
  }
}

async function runConversionModule(text, context) {
  const card = document.getElementById('card-convert');
  const output = document.getElementById('view-convert');

  const unitRegex = /(\d+(?:\.\d+)?)\s*(cubic\s+|sq\s+)?(kg|kilograms?|g|grams?|mg|milligrams?|lbs|pounds?|oz|ounces?|m|meters?|cm|centimeters?|mm|millimeters?|km|kilometers?|ft|feet|in|inches?|mi|miles?|yd|yards?|l|liters?|ml|milliliters?|gal|gallons?|qt|quarts?|cups?|tbsp|tablespoons?|tsp|teaspoons?|fl\s*ozs?)\b/i;
  const match = text.match(unitRegex);

  if (!match) {
    card.style.display = 'none';
    return;
  }

  const number = parseFloat(match[1]);
  let unit = match[3].toLowerCase();
  if (unit.endsWith('s') && unit !== 'lbs' && unit !== 'oz' && unit !== 'tablespoons') {
      unit = unit.slice(0, -1); 
  }
  if (unit === 'feet') unit = 'ft';

  const conversions = {
    'm': ['ft', number * 3.28], 'meter': ['ft', number * 3.28],
    'ft': ['m', number * 0.30], 'feet': ['m', number * 0.30],
    'cm': ['in', number * 0.39], 'centimeter': ['in', number * 0.39],
    'in': ['cm', number * 2.54], 'inch': ['cm', number * 2.54],
    'km': ['mi', number * 0.62], 'kilometer': ['mi', number * 0.62],
    'mi': ['km', number * 1.61], 'mile': ['km', number * 1.61],
    'yd': ['m', number * 0.91], 'yard': ['m', number * 0.91],
    'mm': ['in', number * 0.039], 'millimeter': ['in', number * 0.039],
    'kg': ['lbs', number * 2.20], 'kilogram': ['lbs', number * 2.20],
    'lbs': ['kg', number / 2.20], 'pound': ['kg', number / 2.20],
    'g': ['oz', number * 0.035], 'gram': ['oz', number * 0.035],
    'oz': ['g', number * 28.35], 'ounce': ['g', number * 28.35],
    'mg': ['g', number / 1000], 'milligram': ['g', number / 1000],
    'l': ['gal', number * 0.26], 'liter': ['gal', number * 0.26],
    'ml': ['fl oz', number * 0.033], 'milliliter': ['fl oz', number * 0.033],
    'gal': ['l', number * 3.78], 'gallon': ['l', number * 3.78],
    'qt': ['l', number * 0.94], 'quart': ['l', number * 0.94],
    'cup': ['ml', number * 236.59], 'cups': ['ml', number * 236.59],
    'tbsp': ['ml', number * 14.79], 'tablespoon': ['ml', number * 14.79], 'tablespoons': ['ml', number * 14.79],
    'tsp': ['ml', number * 4.93], 'teaspoon': ['ml', number * 4.93], 'teaspoons': ['ml', number * 4.93],
    'fl oz': ['ml', number * 29.57]
  };

  const session = await self.LanguageModel.create({ outputLanguage: "en" });
  const classification = await session.prompt(
    `Is "${match[0]}" a measurement? Reply ONLY "TRUE" or "FALSE".`
  );
  session.destroy();

  if (classification.trim().toUpperCase() !== "TRUE" || !conversions[unit]) {
    card.style.display = 'none';
    return;
  }

  const [targetUnit, result] = conversions[unit];
  card.style.display = 'block';
  output.innerHTML = `${number} ${match[3]} ≈ <strong>${result.toFixed(2)} ${targetUnit}</strong>`;
}

async function runMapModule(text) {
  const card = document.getElementById('card-map');
  const output = document.getElementById('view-map');

  const session = await self.LanguageModel.create({ outputLanguage: "en" });

const isLocation = await session.prompt(
    `Is "${text}" a specific geographic location (city, street address, building, or landmark)? Reply ONLY "YES" or "NO".`
  );
  session.destroy();

  if (isLocation.trim().toUpperCase() !== "YES") {
    card.style.display = "none";
    return;
  }

  card.style.display = "block";
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
  
  output.innerHTML = `
    <a href="${mapUrl}" target="_blank" style="
      display: block; 
      padding: 12px; 
      text-align: center; 
      background: #4285f4; 
      color: white; 
      text-decoration: none; 
      border-radius: 6px; 
      font-weight: bold;">
      View "${text}" on Google Maps
    </a>
  `;
}

async function executeDeepResearch(text, context) {
  let query = text.trim();
  const lowerContext = context.toLowerCase();
  const lowerText = text.toLowerCase().trim();

  if (!query.includes(" ")) {
    const businessClues = ["stock", "shares", "company", "ceo", "earnings", "revenue", "inc", "corp", "nasdaq"];
    const natureClues   = ["animal", "species", "habitat", "fruit", "recipe", "wildlife", "forest", "tree", "cooking"];
    const techClues     = ["software", "app", "download", "device", "iphone", "android", "update", "code", "pc"];

    let businessScore = businessClues.filter(clue => lowerContext.includes(clue)).length;
    let natureScore   = natureClues.filter(clue => lowerContext.includes(clue)).length;
    let techScore     = techClues.filter(clue => lowerContext.includes(clue)).length;

    if (businessScore > natureScore && businessScore > techScore) {
      query = `${query} company`;
    } else if (techScore > businessScore && techScore > natureScore) {
      query = `${query} tech`;
    } else if (natureScore > businessScore && natureScore > techScore) {
      query = `${query} nature`;
    }
  }

  window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
}
