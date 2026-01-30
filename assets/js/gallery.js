const gallery = document.getElementById("gallery");
const filterNav = document.getElementById("filter-nav");
const images = [];

fetch("data/gallery.json")
  .then(r => r.json())
  .then(data => render(data));

function render(data) {
  // Map categories for easy lookup
  const categoryMap = {};
  data.categories.forEach(c => categoryMap[c.id] = c);

  // Ordered categories
  const orderedCategories = [
    categoryMap["fanart"],
    categoryMap["concept_art"],
    categoryMap["character_design"],
    categoryMap["animals"],
    categoryMap["food"],
    categoryMap["random"]
  ].filter(Boolean);

  // Render filter buttons (including "All")
  const FILTER_ORDER = ["all", "fanart", "concept_art", "character_design", "animals", "food", "random"];
  FILTER_ORDER.forEach(catId => {
    const btn = document.createElement("button");
    btn.textContent = catId === "all" ? "All" : catId.replace("_", " ").toUpperCase();
    btn.onclick = () => filter(catId);
    filterNav.appendChild(btn);
  });

  // Render category sections
  orderedCategories.forEach(cat => {
    const section = document.createElement("section");
    section.id = cat.id;
    section.className = "category";

    const h2 = document.createElement("h2");
    h2.textContent = cat.title.toUpperCase();
    section.appendChild(h2);

    const grid = document.createElement("div");
    grid.className = "grid";

    // Sort images descending by filename
    cat.images.sort((a,b) => b.file.localeCompare(a.file));

    cat.images.forEach(img => {
      const fig = document.createElement("figure");
      const el = document.createElement("img");

      el.src = `images/${cat.id}/${img.file}`;
      el.alt = img.title || "";
      el.dataset.title = img.title || "";

      el.onclick = () => open(images.indexOf(el));

      images.push(el);
      fig.appendChild(el);
      grid.appendChild(fig);
    });

    section.appendChild(grid);
    gallery.appendChild(section);
  });
}

// Filter function
function filter(id) {
  document.querySelectorAll(".category").forEach(section => {
    section.style.display = (id === "all" || section.id === id) ? "" : "none";
  });

  document.querySelectorAll("#filter-nav button").forEach(btn => {
    btn.classList.toggle("active", btn.textContent.toLowerCase() === id);
  });
}

// Lightbox + arrows + disable right click
document.addEventListener("contextmenu", e => {
  if(e.target.tagName === "IMG") e.preventDefault();
});

const lightbox = document.getElementById("lightbox");
const lbImg = document.getElementById("lightbox-img");
const lbTitle = document.getElementById("lightbox-title");
let currentIndex = 0;

function open(index){
  currentIndex = index;
  const img = images[index];

  lbImg.src = img.src;
  lbTitle.textContent = img.dataset.title || ""; // show title if available

  lightbox.hidden = false;
  document.body.classList.add("lightbox-open");
}

function close(){
  lightbox.hidden = true;
  document.body.classList.remove("lightbox-open");
}

function next(){
  open((currentIndex + 1) % images.length);
}

function prev(){
  open((currentIndex - 1 + images.length) % images.length);
}

document.querySelector("#lightbox .next").onclick = next;
document.querySelector("#lightbox .prev").onclick = prev;
document.querySelector("#lightbox .overlay").onclick = close;

document.addEventListener("keydown", (e) => {
  if (lightbox.hidden) return; // only handle keys when lightbox is open

  switch (e.key) {
    case "ArrowRight":
      next();
      break;
    case "ArrowLeft":
      prev();
      break;
    case "Escape":
      close();
      break;
  }
});

