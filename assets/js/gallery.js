const gallery = document.getElementById("gallery");
const filterNav = document.getElementById("filter-nav");
const searchInput = document.getElementById("search");
const toast = document.getElementById("toast");

// Flat list of all <img> elements in visual order
const images = [];

// Flat metadata list aligned with `images`
const imageMeta = []; // { category, catTitle, file, title, indexInCategory, path, story, year }

// Per-figure refs for search filtering
const figures = [];

// Track all category IDs for filter functionality
const allCategoryIds = new Set();

let galleryLoaded = false;
let pendingHash = null;

fetch("data/gallery.json")
  .then(r => r.json())
  .then(data => render(data));

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove("visible"), 2000);
}

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

  if (data.featured && data.featured.length > 0) {
    renderFeatured(data.featured);
  }

  updateArtworkCount();

  // Mark gallery as loaded and process any pending hash
  galleryLoaded = true;
  processPendingHash();
}

function updateArtworkCount(visibleCount) {
  const artworkCount = document.getElementById("artwork-count");
  const shown = visibleCount !== undefined ? visibleCount : images.length;
  artworkCount.textContent = `(${shown} artworks shown here)/(I have lost count)`;
}

function renderFeatured(featured) {
  const section = document.createElement("section");
  section.id = "featured";
  section.className = "featured-section";

  const h2 = document.createElement("h2");
  h2.textContent = "FEATURED";
  section.appendChild(h2);

  const strip = document.createElement("div");
  strip.className = "featured-strip";

  featured.forEach((item) => {
    const catPath = item.category.replace(/::/g, "/");
    const globalIndex = imageMeta.findIndex(
      (m) => m.category === item.category && m.file === item.file
    );
    if (globalIndex === -1) return;

    const fig = document.createElement("figure");
    fig.className = "featured-item";

    const el = document.createElement("img");
    el.src = `images/${catPath}/${item.file}`;
    el.alt = item.title || "";
    el.loading = "lazy";
    if (item.w && item.h) {
      el.width = item.w;
      el.height = item.h;
    }
    el.onclick = () => open(globalIndex);
    fig.appendChild(el);

    const caption = document.createElement("figcaption");
    caption.textContent = item.title || "";
    fig.appendChild(caption);

    strip.appendChild(fig);
  });

  section.appendChild(strip);
  gallery.parentElement.insertBefore(section, gallery);
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

    // Images are already sorted by creation date (newest first) from the Python script
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

      // Intrinsic dimensions prevent layout shift while images load
      if (img.w && img.h) {
        el.width = img.w;
        el.height = img.h;
      }

      // Store metadata aligned with `images` index
      const meta = {
        category: cat.id,
        catTitle: cat.title,
        file: img.file,
        title: img.title || "",
        indexInCategory: idxInCat,
        path: catPath,
        story: img.has_story ? img.story : null,
        year: img.year || null,
      };

      const globalIndex = images.length;
      el.onclick = () => open(globalIndex);

      images.push(el);
      imageMeta.push(meta);
      figures.push({ fig, meta, section });

      fig.appendChild(el);

      // Title + year caption
      const caption = document.createElement("figcaption");
      caption.textContent = meta.year ? `${meta.title} · ${meta.year}` : meta.title;
      fig.appendChild(caption);

      // Story controls (only when a real story exists)
      if (meta.story) {
        const textContainer = document.createElement("div");
        textContainer.className = "image-text-container";

        const textButton = document.createElement("button");
        textButton.className = "text-toggle-btn";
        textButton.textContent = "Show Story";
        textButton.onclick = (e) => {
          e.stopPropagation();
          toggleImageText(textContainer, textButton, meta.story);
        };

        const shareButton = document.createElement("button");
        shareButton.className = "share-btn share-story-btn";
        shareButton.textContent = "Share";
        shareButton.title = "Copy story link to clipboard";
        shareButton.onclick = async (e) => {
          e.stopPropagation();
          const shareUrl = new URL(location.href);
          shareUrl.hash = `#category=${encodeURIComponent(cat.id)}&index=${idxInCat}`;
          navigator.clipboard.writeText(shareUrl.toString()).then(() => {
            showToast("Link copied!");
          });
        };

        const textContent = document.createElement("div");
        textContent.className = "image-text-content";
        textContent.style.display = "none";

        textContainer.appendChild(textButton);
        textContainer.appendChild(shareButton);
        textContainer.appendChild(textContent);
        fig.appendChild(textContainer);
      }

      grid.appendChild(fig);
    });

    section.appendChild(grid);
  }

  container.appendChild(section);
}

// Filter function
function filter(id) {
  // Auto-hide filter nav on mobile when selecting a category
  if (window.innerWidth <= 600) {
    const nav = document.querySelector(".category-nav");
    nav.style.display = "none";
    mobileToggle.textContent = "Filter Categories ▼";
  }

  if (id === "all") {
    document
      .querySelectorAll(".category")
      .forEach((s) => (s.style.display = ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }
}

// Search filter
function handleSearch() {
  const query = searchInput.value.trim().toLowerCase();
  const featuredSection = document.getElementById("featured");
  featuredSection?.toggleAttribute("hidden", !!query);

  let visible = 0;
  const sectionsWithMatches = new Set();

  figures.forEach(({ fig, meta, section }) => {
    const haystack = `${meta.title} ${meta.catTitle} ${meta.story || ""}`.toLowerCase();
    const match = !query || haystack.includes(query);
    fig.style.display = match ? "" : "none";
    if (match) {
      visible++;
      sectionsWithMatches.add(section);
    }
  });

  document.querySelectorAll("section.category").forEach((s) => {
    s.style.display = sectionsWithMatches.has(s) ? "" : "none";
  });

  updateArtworkCount(visible);
}

searchInput?.addEventListener("input", handleSearch);

const lightbox = document.getElementById("lightbox");
const lbImg = document.getElementById("lightbox-img");
const lbTitle = document.getElementById("lightbox-title");
const lbShare = document.getElementById("lightbox-share");
let currentIndex = 0;

// Lightbox story elements
let lbStoryButton = null;
let lbStoryContent = null;
let currentStoryShowing = false;

function preloadNeighbor(delta) {
  const idx = (currentIndex + delta + images.length) % images.length;
  if (images[idx]) {
    const preloader = new Image();
    preloader.src = images[idx].src;
  }
}

function open(index) {
  currentIndex = index;
  const img = images[index];
  const meta = imageMeta[index];

  lbImg.src = img.src;
  lbTitle.textContent = meta.title || "";

  // Stable, readable hash for sharing. pushState so Back closes the
  // lightbox instead of leaving the site (popstate handler below).
  const hash = `#category=${encodeURIComponent(
    meta.category
  )}&index=${meta.indexInCategory}`;
  if (lightbox.hidden) {
    history.pushState({ lightbox: true }, "", hash);
  } else {
    history.replaceState({ lightbox: true }, "", hash);
  }

  // Preload next/prev for seamless arrow-key browsing
  preloadNeighbor(1);
  preloadNeighbor(-1);

  // Reset story state when opening new image
  currentStoryShowing = false;

  // Remove existing story elements
  const caption = document.querySelector("#lightbox .caption");
  caption.querySelector(".lb-story-btn")?.remove();
  caption.querySelector(".lb-story-content")?.remove();
  lbStoryButton = null;
  lbStoryContent = null;

  if (meta.story) {
    lbStoryButton = document.createElement("button");
    lbStoryButton.className = "lb-story-btn";
    lbStoryButton.textContent = "Show Story";
    lbStoryButton.onclick = () => toggleLightboxStory(meta.story);

    lbStoryContent = document.createElement("div");
    lbStoryContent.className = "lb-story-content";
    lbStoryContent.style.display = "none";

    // Insert after share button
    caption.insertBefore(lbStoryButton, lbShare.nextSibling);
    caption.appendChild(lbStoryContent);
  }

  lightbox.hidden = false;
  document.body.classList.add("lightbox-open");
}

function close(fromPop = false) {
  if (lightbox.hidden) return;
  lightbox.hidden = true;
  document.body.classList.remove("lightbox-open");
  if (!fromPop && history.state?.lightbox) {
    history.back();
  }
}

// Back button closes an open lightbox
window.addEventListener("popstate", () => {
  close(true);
});

function next() {
  open((currentIndex + 1) % images.length);
}

function prev() {
  open((currentIndex - 1 + images.length) % images.length);
}

// Map (category, localIndex) → global index using imageMeta
function getGlobalIndexFromCategory(catId, localIndex) {
  if (catId === "all") return localIndex;

  // Find the first image in this category to get the starting global index
  for (let i = 0; i < imageMeta.length; i++) {
    if (imageMeta[i].category === catId) {
      // Found the category - add local index to get global index
      return i + localIndex;
    }
  }
  return 0;
}

// Handle deep links like #category=fanart&index=3
function handleHashChange() {
  const hash = location.hash;
  if (!hash || !lightbox.hidden) return;

  const params = new URLSearchParams(hash.slice(1));
  const catId = params.get("category");
  const index = parseInt(params.get("index") || "0", 10);

  if (!catId || Number.isNaN(index)) return;

  // Store pending hash for processing after gallery loads
  pendingHash = { catId, index };

  if (!galleryLoaded) {
    // Will be processed after gallery loads
    return;
  }

  processPendingHash();
}

function processPendingHash() {
  if (!pendingHash) return;

  const { catId, index } = pendingHash;
  const section = document.getElementById(catId);

  if (!section) {
    pendingHash = null;
    return;
  }

  // Scroll to section first
  section.scrollIntoView({ behavior: "smooth", block: "start" });

  // Open the image after a short delay to allow scroll to complete
  const globalIdx = getGlobalIndexFromCategory(catId, index);
  if (globalIdx >= 0 && globalIdx < images.length) {
    setTimeout(() => {
      open(globalIdx);
      pendingHash = null;
    }, 300);
  } else {
    pendingHash = null;
  }
}

// Generate shareable URL for current image
function generateShareableUrl() {
  if (lightbox.hidden) return location.href;

  const meta = imageMeta[currentIndex];
  if (!meta) return location.href;

  const url = new URL(location.href);
  url.hash = `#category=${encodeURIComponent(
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
      .then(() => showToast("Link copied!"));
  }
};

document.querySelector("#lightbox .next").onclick = next;
document.querySelector("#lightbox .prev").onclick = prev;
document.querySelector("#lightbox .overlay").onclick = close;
document.querySelector("#lightbox .lightbox-close").onclick = close;

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

// Show/toggle the story text (baked into gallery.json)
function toggleImageText(container, button, story) {
  const textContent = container.querySelector(".image-text-content");

  if (textContent.style.display === "block") {
    textContent.style.display = "none";
    button.textContent = "Show Story";
    return;
  }

  const p = document.createElement("p");
  p.textContent = story.trim();
  textContent.replaceChildren(p);
  textContent.style.display = "block";
  button.textContent = "Hide Story";
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
function toggleLightboxStory(story) {
  if (!lbStoryButton || !lbStoryContent) return;

  if (lbStoryContent.style.display === "block") {
    lbStoryContent.style.display = "none";
    lbStoryButton.textContent = "Show Story";
    currentStoryShowing = false;
    return;
  }

  const closeBtn = document.createElement("button");
  closeBtn.className = "lb-story-close";
  closeBtn.title = "Close";
  closeBtn.textContent = "×";
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    lbStoryContent.style.display = "none";
    lbStoryButton.textContent = "Show Story";
    currentStoryShowing = false;
  };

  const p = document.createElement("p");
  p.textContent = story.trim();

  lbStoryContent.replaceChildren(closeBtn, p);
  lbStoryContent.style.display = "block";
  lbStoryButton.textContent = "Hide Story";
  currentStoryShowing = true;
}

// Click on story content (outside the close button) closes it
document.addEventListener("click", (e) => {
  if (!lbStoryContent || lbStoryContent.style.display !== "block") return;

  // Check if click is on or inside the story content
  if (lbStoryContent.contains(e.target) && e.target !== lbStoryContent) {
    lbStoryContent.style.display = "none";
    if (lbStoryButton) lbStoryButton.textContent = "Show Story";
    currentStoryShowing = false;
  }
});

// Scroll to top button functionality
document.addEventListener("DOMContentLoaded", () => {
  const scrollToTopBtn = document.getElementById("scroll-to-top");

  if (scrollToTopBtn) {
    function handleScroll() {
      if (window.scrollY > 300) {
        scrollToTopBtn.classList.add("visible");
      } else {
        scrollToTopBtn.classList.remove("visible");
      }
    }

    scrollToTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Initial check
    handleScroll();
  }
});
