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
      el.dataset.category = cat.id;
      el.dataset.filename = img.file;

      el.onclick = () => open(images.indexOf(el));

      images.push(el);
      fig.appendChild(el);
      
      // Check if text file exists before adding text section
      const textFileName = img.file.replace(/\.[^/.]+$/, "") + ".txt";
      const textFileUrl = `images/${cat.id}/${textFileName}`;
      
      fetch(textFileUrl, { method: 'HEAD' })
        .then(response => {
          if (response.ok) {
            // Text file exists, add text section
            const textContainer = document.createElement("div");
            textContainer.className = "image-text-container";
            
            const textButton = document.createElement("button");
            textButton.className = "text-toggle-btn";
            textButton.textContent = "Show Story";
            textButton.onclick = (e) => {
              e.stopPropagation(); // Prevent opening lightbox when clicking text button
              toggleImageText(textContainer, textButton, cat.id, img.file);
            };
            
            const textContent = document.createElement("div");
            textContent.className = "image-text-content";
            textContent.style.display = "none";
            
            textContainer.appendChild(textButton);
            textContainer.appendChild(textContent);
            fig.appendChild(textContainer);
          }
        })
        .catch(() => {
          // Text file doesn't exist, don't add text section
        });
      
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
  lbTitle.textContent = img.dataset.title || "";

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

  if (!catId) return;

  // Wait until images are fully loaded
  const waitForImages = () => {
    if (images.length === 0) {
      setTimeout(waitForImages, 100);
      return;
    }

    const section = document.getElementById(catId);
    if (!section) return;

    const isMobile = window.innerWidth <= 600;
    const delay = isMobile ? 300 : 100;

    setTimeout(() => {
      section.scrollIntoView({ behavior: "smooth", block: "start" });

      if (!isNaN(index)) {
        const globalIdx = getGlobalIndexFromCategory(catId, index);
        if (globalIdx >= 0 && globalIdx < images.length) {
          open(globalIdx);
        }
      }
    }, delay);
  };

  waitForImages();
}


// Enhanced link opening experience
function enhanceLinkOpening() {
  // Add smooth transitions to images
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    img.style.transition = 'transform 0.3s ease, opacity 0.3s ease, box-shadow 0.3s ease';
  });
  
  // Add subtle hover effects
  document.querySelectorAll('.grid figure').forEach(figure => {
    figure.style.transition = 'transform 0.3s ease';
    
    figure.addEventListener('mouseenter', () => {
      figure.style.transform = 'translateY(-4px)';
    });
    
    figure.addEventListener('mouseleave', () => {
      figure.style.transform = 'translateY(0)';
    });
  });
  
  // Add loading states for better UX
  document.querySelectorAll('img').forEach(img => {
    img.addEventListener('load', () => {
      img.style.opacity = '1';
    });
    
    img.addEventListener('error', () => {
      img.style.opacity = '0.5';
      img.style.filter = 'grayscale(100%)';
    });
  });
}

// Call enhancement function after DOM is loaded
document.addEventListener('DOMContentLoaded', enhanceLinkOpening);

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

// Function to load and toggle image text
async function toggleImageText(container, button, categoryId, filename) {
  const textContent = container.querySelector(".image-text-content");
  
  if (textContent.style.display === "block") {
    // Hide text
    textContent.style.display = "none";
    button.textContent = "Show Story";
    return;
  }
  
  // Show loading state
  button.textContent = "Loading...";
  
  try {
    // Try to load text file with same name as image
    const textFileUrl = `images/${categoryId}/${filename.replace(/\.[^/.]+$/, "")}.txt`;
    const response = await fetch(textFileUrl);
    
    if (response.ok) {
      const text = await response.text();
      textContent.innerHTML = `<p>${text.trim()}</p>`;
      textContent.style.display = "block";
      button.textContent = "Hide Story";
    } else {
      // No text file found
      textContent.innerHTML = `<p class="no-text">No Story available</p>`;
      textContent.style.display = "block";
      button.textContent = "Hide Story";
    }
  } catch (error) {
    console.error("Error loading text:", error);
    textContent.innerHTML = `<p class="error-text">Error loading Story</p>`;
    textContent.style.display = "block";
    button.textContent = "Hide Story";
  }
}

const mobileToggle = document.createElement("button");
mobileToggle.className = "mobile-filter-toggle";
mobileToggle.textContent = "Filter Categories ▼";
mobileToggle.onclick = () => {
  const nav = document.querySelector(".category-nav");
  nav.style.display = nav.style.display === "flex" ? "none" : "flex";
};
filterNav.parentElement.insertBefore(mobileToggle, filterNav);

