const CATEGORIES = {
  plastic: { label: "Plastic", icon: "🧴", tip: "Rinse it and place it in the dry recyclables bin.", keywords: ["water bottle", "pop bottle", "plastic bag", "water jug", "bucket", "jug", "milk can", "soap dispenser", "lotion", "sunscreen", "hair spray", "bib", "shower cap", "diaper", "toilet tissue", "pill bottle", "measuring cup", "tub", "container", "syringe"] },
  paper: { label: "Paper / Cardboard", icon: "📦", tip: "Keep it dry, flatten boxes, then recycle.", keywords: ["carton", "envelope", "paper towel", "packet", "book jacket", "comic book", "notebook", "binder", "menu", "crate", "cardboard", "newspaper", "web site", "pizza", "tissue", "mailbag", "paper"] },
  glass: { label: "Glass", icon: "🍾", tip: "Rinse and put in the glass recycling container.", keywords: ["beer bottle", "wine bottle", "beer glass", "goblet", "wine", "vase", "cocktail shaker", "perfume", "red wine", "whiskey jug", "glass"] },
  metal: { label: "Metal", icon: "🥫", tip: "Empty and rinse cans before recycling.", keywords: ["can opener", "tin", "beaker", "pot", "frying pan", "wok", "caldron", "ladle", "spatula", "strainer", "saucepan", "teapot", "nail", "screw", "padlock", "chain", "hook", "cleaver", "water tower", "barrel", "keg", "cup"] },
  organic: { label: "Organic / Food waste", icon: "🍌", tip: "Compost it or use the wet-waste bin.", keywords: ["banana", "orange", "lemon", "apple", "granny smith", "strawberry", "pineapple", "fig", "pomegranate", "jackfruit", "custard apple", "broccoli", "cauliflower", "cabbage", "cucumber", "zucchini", "bell pepper", "mushroom", "corn", "artichoke", "acorn squash", "butternut", "spaghetti squash", "head cabbage", "bagel", "pretzel", "bread", "loaf", "hotdog", "burrito", "carbonara", "guacamole", "ice cream", "potato", "leaf", "daisy", "hay"] },
  ewaste: { label: "E-waste", icon: "🔋", tip: "Hand it over to a certified electronics collection point.", keywords: ["cellular telephone", "phone", "laptop", "notebook computer", "mouse", "remote control", "keyboard", "ipod", "hand-held computer", "monitor", "screen", "television", "desktop computer", "modem", "router", "joystick", "radio", "cassette", "speaker", "printer", "hard disc", "battery", "power drill", "electric fan", "iron", "microwave", "toaster", "hair dryer", "projector", "camera", "reflex camera", "digital clock", "digital watch", "plug", "adapter", "cd player"] }
};

const els = {
  status: document.getElementById("status"),
  dropzone: document.getElementById("dropzone"),
  dropText: document.getElementById("dropText"),
  fileInput: document.getElementById("fileInput"),
  preview: document.getElementById("preview"),
  video: document.getElementById("video"),
  camBtn: document.getElementById("camBtn"),
  snapBtn: document.getElementById("snapBtn"),
  clearBtn: document.getElementById("clearBtn"),
  result: document.getElementById("result"),
  predictions: document.getElementById("predictions")
};

let model = null;
let stream = null;

// ---- Load model ----
(async function init() {
  try {
    model = await mobilenet.load({ version: 2, alpha: 1.0 });
    els.status.textContent = "✅ AI model ready — upload an image to begin.";
  } catch (err) {
    console.error(err);
    els.status.textContent = "❌ Could not load the AI model. Check your internet connection and refresh.";
  }
})();

// ---- Map ImageNet label -> waste category ----
function mapToCategory(className) {
  const name = className.toLowerCase();
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    if (cat.keywords.some(k => name.includes(k))) return key;
  }
  return "general";
}

// ---- Classification ----
async function classify(imgEl) {
  if (!model) { els.status.textContent = "Model is still loading, please wait…"; return; }
  els.result.className = "result empty";
  els.result.textContent = "Analyzing…";

  const preds = await model.classify(imgEl, 5);

  // Choose first prediction that maps to a known category, else the top one
  let chosen = preds[0];
  let key = mapToCategory(chosen.className);
  if (key === "general") {
    for (const p of preds) {
      const k = mapToCategory(p.className);
      if (k !== "general") { chosen = p; key = k; break; }
    }
  }

  showResult(key, chosen);
  showPredictions(preds);
}

function showResult(key, pred) {
  const conf = (pred.probability * 100).toFixed(1);
  const object = pred.className.split(",")[0];
  if (key === "general") {
    els.result.className = "result general";
    els.result.innerHTML = <strong>🗑️ General / Non-recyclable</strong>Detected: ${object} (${conf}%)<small>Could not match a recyclable category. Dispose in the general waste bin or check local guidelines.</small>;
    return;
  }
  const cat = CATEGORIES[key];
  els.result.className = "result " + key;
  els.result.innerHTML = <strong>${cat.icon} ${cat.label}</strong>Detected: ${object} (${conf}%)<small>${cat.tip}</small>;
}

function showPredictions(preds) {
  els.predictions.innerHTML = "";
  preds.forEach(p => {
    const pct = (p.probability * 100).toFixed(1);
    const li = document.createElement("li");
    li.innerHTML = ${p.className.split(",")[0]} — ${pct}%<div class="bar"><div></div></div>;
    els.predictions.appendChild(li);
    requestAnimationFrame(() => (li.querySelector(".bar div").style.width = pct + "%"));
  });
}

// ---- Image input ----
function loadFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  stopCamera();
  const reader = new FileReader();
  reader.onload = e => {
    els.preview.src = e.target.result;
    els.preview.hidden = false;
    els.dropText.hidden = true;
    els.preview.onload = () => classify(els.preview);
  };
  reader.readAsDataURL(file);
}

els.dropzone.addEventListener("click", () => { if (!stream) els.fileInput.click(); });
els.fileInput.addEventListener("change", e => loadFile(e.target.files[0]));
["dragover", "dragenter"].forEach(ev => els.dropzone.addEventListener(ev, e => { e.preventDefault(); els.dropzone.classList.add("drag"); }));
["dragleave", "drop"].forEach(ev => els.dropzone.addEventListener(ev, e => { e.preventDefault(); els.dropzone.classList.remove("drag"); }));
els.dropzone.addEventListener("drop", e => loadFile(e.dataTransfer.files[0]));

// ---- Camera ----
els.camBtn.addEventListener("click", async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    els.video.srcObject = stream;
    els.video.hidden = false;
    els.preview.hidden = true;
    els.dropText.hidden = true;
    els.snapBtn.hidden = false;
  } catch (err) {
    alert("Camera access was denied or is unavailable.");
  }
});

els.snapBtn.addEventListener("click", () => {
  const canvas = document.createElement("canvas");
  canvas.width = els.video.videoWidth;
  canvas.height = els.video.videoHeight;
  canvas.getContext("2d").drawImage(els.video, 0, 0);
  els.preview.src = canvas.toDataURL("image/png");
  els.preview.hidden = false;
  els.preview.onload = () => classify(els.preview);
  stopCamera();
});

function stopCamera() {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  els.video.hidden = true;
  els.snapBtn.hidden = true;
}

// ---- Reset ----
els.clearBtn.addEventListener("click", () => {
  stopCamera();
  els.preview.hidden = true;
  els.preview.removeAttribute("src");
  els.dropText.hidden = false;
  els.fileInput.value = "";
  els.result.className = "result empty";
  els.result.textContent = "No image analyzed yet.";
  els.predictions.innerHTML = "";
});