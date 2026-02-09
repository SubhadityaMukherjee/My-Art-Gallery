const gallery = document.getElementById("gallery");
const filterNav = document.getElementById("filter-nav");

// Flat list of all <img> elements in visual order
const images = [];

// Flat metadata list aligned with `images`
const imageMeta = []; // { category, file, title, indexInCategory, path }

// Track all category IDs for filter functionality
const allCategoryIds = new Set();

fetch("data/gallery.json")
  .then(r => r.json())
  .then(data => render(data));

function render(data) {
  // Build filter order from TOP-LEVEL categories only (no subcategories in filters)
  const filterOrder = ["all"];
  data.categories.forEach(cat => {
    filterOrder.push(cat.id);
    allCategoryIds.add(cat.id);
  });

  // Render filter buttons
  filterOrder.forEach((catId) => {
    const btn = document.createElement("button");
    btn.textContent =
      catId === "all" ? "All" : catId.replace(/_/g, " ").toUpperCase();
    btn.onclick = () => filter(catId);
    filterNav.appendChild(btn);
  });

  // Build gallery recursively
  data.categories.forEach((cat) => {
    renderCategory(cat, gallery);
  });

  // Render artwork count after all images are loaded
  const artworkCount = document.getElementById("artwork-count");
  artworkCount.textContent = `(${images.length} artworks shown here)/(I have lost count)`;
}

function renderCategory(cat, container, isSubcategory = false) {
  const section = document.createElement("section");
  section.id = cat.id;
  section.className = isSubcategory ? "category subcategory" : "category";

  const h2 = document.createElement("h2");
  h2.textContent = cat.title.toUpperCase();
  if (isSubcategory) {
    h2.style.fontSize = "1.2em";
    h2.style.marginLeft = "20px";
    h2.style.color = "#666";
  }
  section.appendChild(h2);

  // Add indentation for subcategory grids
  if (isSubcategory) {
    section.style.marginLeft = "20px";
  }

  // Render subcategories FIRST (at the top if they exist)
  if (cat.subcategories && cat.subcategories.length > 0) {
    cat.subcategories.forEach((subcat) => {
      renderCategory(subcat, section, true);
    });
  }

  // Render images if present
  if (cat.images && cat.images.length > 0) {
    const grid = document.createElement("div");
    grid.className = "grid";

    // Sort images descending by filename
    cat.images.sort((a, b) => b.file.localeCompare(a.file));

    cat.images.forEach((img, idxInCat) => {
      const fig = document.createElement("figure");
      const el = document.createElement("img");

      const catPath = cat.id.replace(/::/g, "/");
      const src = `images/${catPath}/${img.file}`;
      el.src = src;
      el.alt = img.title || "";
      el.dataset.title = img.title || "";
      el.dataset.category = cat.id;
      el.dataset.filename = img.file;
      el.loading = "lazy"; // Lazy load for performance

      // Store metadata aligned with `images` index
      const meta = {
        category: cat.id,
        file: img.file,
        title: img.title || "",
        indexInCategory: idxInCat,
        path: catPath,
      };

      const globalIndex = images.length;
      el.onclick = () => open(globalIndex);

      images.push(el);
      imageMeta.push(meta);
      fig.appendChild(el);

      // Optional story text - defer loading until clicked
      const textFileName = img.file.replace(/\.[^/.]+$/, "") + ".txt";
      const textFileUrl = `images/${catPath}/${textFileName}`;

      // Create container but only fetch text when requested
      const textContainer = document.createElement("div");
      textContainer.className = "image-text-container";

      const textButton = document.createElement("button");
      textButton.className = "text-toggle-btn";
      textButton.textContent = "Show Story";
      textButton.onclick = (e) => {
        e.stopPropagation();
        toggleImageText(textContainer, textButton, catPath, img.file);
      };

      const textContent = document.createElement("div");
      textContent.className = "image-text-content";
      textContent.style.display = "none";

      textContainer.appendChild(textButton);
      textContainer.appendChild(textContent);
      fig.appendChild(textContainer);

      grid.appendChild(fig);
    });

    section.appendChild(grid);
  }

  container.appendChild(section);
}

// Filter function
function filter(id) {
  if (id === "all") {
    document
      .querySelectorAll(".category")
      .forEach((s) => (s.style.display = ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }
}

// Disable right click on images
document.addEventListener("contextmenu", (e) => {
  if (e.target.tagName === "IMG") e.preventDefault();
});

const lightbox = document.getElementById("lightbox");
const lbImg = document.getElementById("lightbox-img");
const lbTitle = document.getElementById("lightbox-title");
const lbShare = document.getElementById("lightbox-share");
let currentIndex = 0;

// Lightbox story elements
let lbStoryButton = null;
let lbStoryContent = null;
let currentStoryShowing = false;

function open(index) {
  currentIndex = index;
  const img = images[index];
  const meta = imageMeta[index];

  lbImg.src = img.src;
  lbTitle.textContent = meta.title || "";

  // Stable, readable hash for sharing
  const hash = `#category=${encodeURIComponent(
    meta.category
  )}&index=${meta.indexInCategory}`;
  history.replaceState(null, "", hash);

  // Reset story state when opening new image
  currentStoryShowing = false;

  // Check if story button already exists, if so, just update it
  const caption = document.querySelector("#lightbox .caption");
  
  // Remove existing story elements
  const existingBtn = caption.querySelector(".lb-story-btn");
  const existingContent = caption.querySelector(".lb-story-content");
  if (existingBtn) existingBtn.remove();
  if (existingContent) existingContent.remove();

  // Add story button (check if txt file exists)
  const textFileName = meta.file.replace(/\.[^/.]+$/, "") + ".txt";
  const catPath = meta.path || meta.category;
  const textFileUrl = `images/${catPath}/${textFileName}`;

  fetch(textFileUrl, { method: "HEAD" })
    .then((response) => {
      if (response.ok) {
        lbStoryButton = document.createElement("button");
        lbStoryButton.className = "lb-story-btn";
        lbStoryButton.textContent = "Show Story";
        lbStoryButton.onclick = () => toggleLightboxStory(catPath, meta.file);

        lbStoryContent = document.createElement("div");
        lbStoryContent.className = "lb-story-content";
        lbStoryContent.style.display = "none";
        
        // Click on story content to close it
        lbStoryContent.onclick = (e) => {
          e.stopPropagation();
          lbStoryContent.style.display = "none";
          lbStoryButton.textContent = "Show Story";
          currentStoryShowing = false;
        };

        // Insert after share button
        caption.insertBefore(lbStoryButton, lbShare.nextSibling);
        caption.appendChild(lbStoryContent);
      }
    })
    .catch(() => {
      // No story file, do nothing
    });

  lightbox.hidden = false;
  document.body.classList.add("lightbox-open");
}

function close() {
  lightbox.hidden = true;
  document.body.classList.remove("lightbox-open");
  // Clear hash on close
  history.replaceState(null, "", location.pathname + location.search);
}

function next() {
  open((currentIndex + 1) % images.length);
}

function prev() {
  open((currentIndex - 1 + images.length) % images.length);
}

// Resolve category from <img> if needed
function getCategoryFromImage(img) {
  let parent = img.closest("section.category");
  return parent ? parent.id : "all";
}

// Local index of image within its category (for hash)
function getImageIndexInCategory(img, catId) {
  if (catId === "all") return currentIndex;
  const section = document.getElementById(catId);
  if (!section) return 0;
  const categoryImages = Array.from(section.querySelectorAll("img"));
  return categoryImages.indexOf(img);
}

// Map (category, localIndex) → global index
function getGlobalIndexFromCategory(catId, localIndex) {
  if (catId === "all") return localIndex;

  let globalIndex = 0;
  const sections = document.querySelectorAll("section.category");
  for (const s of sections) {
    const imgsInSection = s.querySelectorAll("img").length;
    if (s.id === catId) {
      if (localIndex < imgsInSection) {
        return globalIndex + localIndex;
      } else {
        return globalIndex; // fallback
      }
    } else {
      globalIndex += imgsInSection;
    }
  }
  return 0;
}

// Handle deep links like #category=fanart&index=3
function handleHashChange() {
  const hash = location.hash;
  if (!hash) return;

  const params = new URLSearchParams(hash.slice(1));
  const catId = params.get("category");
  const index = parseInt(params.get("index") || "0", 10);

  if (!catId || Number.isNaN(index)) return;

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

      const globalIdx = getGlobalIndexFromCategory(catId, index);
      if (globalIdx >= 0 && globalIdx < images.length) {
        open(globalIdx);
      }
    }, delay);
  };

  waitForImages();
}

// Enhanced link opening experience
function enhanceLinkOpening() {
  const imgs = document.querySelectorAll("img");
  imgs.forEach((img) => {
    img.style.transition =
      "transform 0.3s ease, opacity 0.3s ease, box-shadow 0.3s ease";
  });

  document.querySelectorAll(".grid figure").forEach((figure) => {
    figure.style.transition = "transform 0.3s ease";

    figure.addEventListener("mouseenter", () => {
      figure.style.transform = "translateY(-4px)";
    });

    figure.addEventListener("mouseleave", () => {
      figure.style.transform = "translateY(0)";
    });
  });

  document.querySelectorAll("img").forEach((img) => {
    img.addEventListener("load", () => {
      img.style.opacity = "1";
    });

    img.addEventListener("error", () => {
      img.style.opacity = "0.5";
      img.style.filter = "grayscale(100%)";
    });
  });
}

document.addEventListener("DOMContentLoaded", enhanceLinkOpening);

// Generate shareable URL for current image
function generateShareableUrl() {
  if (lightbox.hidden) return location.href;

  const meta = imageMeta[currentIndex];
  if (!meta) return location.href;

  const url = new URL(location.href);
  url.hash = `category=${encodeURIComponent(
    meta.category
  )}&index=${meta.indexInCategory}`;
  return url.toString();
}

// Share button
lbShare.onclick = () => {
  const shareUrl = generateShareableUrl();
  if (navigator.share) {
    navigator.share({ url: shareUrl });
  } else {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => alert("Link copied to clipboard"));
  }
};

document.querySelector("#lightbox .next").onclick = next;
document.querySelector("#lightbox .prev").onclick = prev;
document.querySelector("#lightbox .overlay").onclick = close;

document.addEventListener("keydown", (e) => {
  if (lightbox.hidden) return;

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

// Load and toggle image text
async function toggleImageText(container, button, categoryId, filename) {
  const textContent = container.querySelector(".image-text-content");

  if (textContent.style.display === "block") {
    textContent.style.display = "none";
    button.textContent = "Show Story";
    return;
  }

  button.textContent = "Loading...";

  try {
    const textFileUrl = `images/${categoryId}/${filename.replace(
      /\.[^/.]+$/,
      ""
    )}.txt`;
    const response = await fetch(textFileUrl);

    if (response.ok) {
      const text = await response.text();
      textContent.innerHTML = `<p>${text.trim()}</p>`;
      textContent.style.display = "block";
      button.textContent = "Hide Story";
    } else {
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

// Mobile filter toggle
const mobileToggle = document.createElement("button");
mobileToggle.className = "mobile-filter-toggle";
mobileToggle.textContent = "Filter Categories ▼";
mobileToggle.onclick = () => {
  const nav = document.querySelector(".category-nav");
  nav.style.display = nav.style.display === "flex" ? "none" : "flex";
};
filterNav.parentElement.insertBefore(mobileToggle, filterNav);

// Toggle story in lightbox view
async function toggleLightboxStory(categoryId, filename) {
  if (!lbStoryButton || !lbStoryContent) return;

  if (lbStoryContent.style.display === "block") {
    lbStoryContent.style.display = "none";
    lbStoryButton.textContent = "Show Story";
    currentStoryShowing = false;
    return;
  }

  lbStoryButton.textContent = "Loading...";

  try {
    const textFileUrl = `images/${categoryId}/${filename.replace(
      /\.[^/.]+$/,
      ""
    )}.txt`;
    const response = await fetch(textFileUrl);

    if (response.ok) {
      const text = await response.text();
      lbStoryContent.innerHTML = `
        <button class="lb-story-close" title="Close">×</button>
        <p>${text.trim()}</p>
      `;
      
      // Add close handler to the X button
      lbStoryContent.querySelector(".lb-story-close").onclick = (e) => {
        e.stopPropagation();
        lbStoryContent.style.display = "none";
        lbStoryButton.textContent = "Show Story";
        currentStoryShowing = false;
      };
      
      lbStoryContent.style.display = "block";
      lbStoryButton.textContent = "Hide Story";
      currentStoryShowing = true;
    } else {
      lbStoryContent.innerHTML = `
        <button class="lb-story-close" title="Close">×</button>
        <p class="no-text">No Story available</p>
      `;
      lbStoryContent.style.display = "block";
      lbStoryButton.textContent = "Hide Story";
    }
  } catch (error) {
    console.error("Error loading story:", error);
    lbStoryContent.innerHTML = `
      <button class="lb-story-close" title="Close">×</button>
      <p class="error-text">Error loading Story</p>
    `;
    lbStoryContent.style.display = "block";
    lbStoryButton.textContent = "Hide Story";
  }
}

// Make story content clickable to close
document.addEventListener("click", (e) => {
  if (!lbStoryContent || lbStoryContent.style.display !== "block") return;
  
  // Check if click is on or inside the story content
  if (lbStoryContent.contains(e.target) && e.target !== lbStoryContent) {
    lbStoryContent.style.display = "none";
    if (lbStoryButton) lbStoryButton.textContent = "Show Story";
    currentStoryShowing = false;
  }
});
