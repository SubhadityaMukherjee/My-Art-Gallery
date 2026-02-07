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
  if(id === "all") {
    document.querySelectorAll(".category").forEach(s => s.style.display = "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }
}

// Lightbox + arrows + disable right click
document.addEventListener("contextmenu", e => {
  if(e.target.tagName === "IMG") e.preventDefault();
});

const lightbox = document.getElementById("lightbox");
const lbImg = document.getElementById("lightbox-img");
const lbTitle = document.getElementById("lightbox-title");
const lbShare = document.getElementById("lightbox-share");
let currentIndex = 0;

function open(index){
  currentIndex = index;
  const img = images[index];

  lbImg.src = img.src;
  lbTitle.textContent = img.dataset.title || ""; // show title if available

  // Update URL hash
  const catId = getCategoryFromImage(img);
  const imgIndex = getImageIndexInCategory(img, catId);
  const hash = `#category=${encodeURIComponent(catId)}&index=${imgIndex}`;
  history.replaceState(null, "", hash);

  lightbox.hidden = false;
  document.body.classList.add("lightbox-open");
}

function close(){
  lightbox.hidden = true;
  document.body.classList.remove("lightbox-open");
  // Clear hash on close
  history.replaceState(null, "", location.pathname + location.search);
}

function next(){
  open((currentIndex + 1) % images.length);
}

function prev(){
  open((currentIndex - 1 + images.length) % images.length);
}

function getCategoryFromImage(img) {
  // Find the parent section (category)
  let parent = img.closest("section.category");
  return parent ? parent.id : "all";
}

function getImageIndexInCategory(img, catId) {
  if (catId === "all") return currentIndex;

  const section = document.getElementById(catId);
  if (!section) return 0;

  const categoryImages = Array.from(section.querySelectorAll("img"));
  return categoryImages.indexOf(img);
}

function getGlobalIndexFromCategory(catId, localIndex) {
  if (catId === "all") return localIndex;

  let globalIndex = 0;
  const sections = document.querySelectorAll("section.category");
  for (const s of sections) {
    if (s.id === catId) {
      const imgs = Array.from(s.querySelectorAll("img"));
      if (localIndex < imgs.length) {
        return globalIndex + localIndex;
      }
    } else {
      globalIndex += s.querySelectorAll("img").length;
    }
  }
  return 0;
}

function handleHashChange() {
  const hash = location.hash;
  if (!hash) return;

  const params = new URLSearchParams(hash.slice(1));
  const catId = params.get("category");
  const index = parseInt(params.get("index") || "0", 10);

  if (catId) {
    // Scroll to category
    const section = document.getElementById(catId);
    if (section) {
      // Use a small delay for mobile to ensure DOM is ready
      const isMobile = window.innerWidth <= 600;
      const delay = isMobile ? 300 : 100;
      
      setTimeout(() => {
        section.scrollIntoView({ 
          behavior: "smooth", 
          block: "start" 
        });
        
        // Open lightbox if index is provided
        if (!isNaN(index)) {
          const globalIdx = getGlobalIndexFromCategory(catId, index);
          if (globalIdx >= 0 && globalIdx < images.length) {
            // Ensure images array is populated before opening
            if (images.length > 0) {
              open(globalIdx);
            } else {
              // If images not yet loaded, wait a bit and try again
              setTimeout(() => {
                if (images.length > 0) {
                  open(globalIdx);
                }
              }, 200);
            }
          }
        }
      }, delay);
    }
  }
}

// New function to generate shareable URL for current image
function generateShareableUrl() {
  if (lightbox.hidden) return location.href;
  
  const img = images[currentIndex];
  if (!img) return location.href;

  const catId = getCategoryFromImage(img);
  const imgIndex = getImageIndexInCategory(img, catId);
  const url = new URL(location.href);
  url.hash = `category=${encodeURIComponent(catId)}&index=${imgIndex}`;
  return url.toString();
}

// Enhanced share button functionality
lbShare.onclick = () => {
  const shareUrl = generateShareableUrl();
  if (navigator.share) {
    navigator.share({ url: shareUrl });
  } else {
    navigator.clipboard.writeText(shareUrl).then(() => alert("Link copied to clipboard"));
  }
};


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

// Handle initial hash on load
window.addEventListener("load", handleHashChange);
window.addEventListener("hashchange", handleHashChange);

const mobileToggle = document.createElement("button");
mobileToggle.className = "mobile-filter-toggle";
mobileToggle.textContent = "Filter Categories ▼";
mobileToggle.onclick = () => {
  const nav = document.querySelector(".category-nav");
  nav.style.display = nav.style.display === "flex" ? "none" : "flex";
};
filterNav.parentElement.insertBefore(mobileToggle, filterNav);

