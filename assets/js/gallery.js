const nav = document.getElementById("nav");
const gallery = document.getElementById("gallery");

const lightbox = document.getElementById("lightbox");
const lbImg = document.getElementById("lightbox-img");
const lbTitle = document.getElementById("lightbox-title");
const lbMeta = document.getElementById("lightbox-meta");

let images = [];
let current = -1;

fetch("data/gallery.json")
  .then(r => r.json())
  .then(data => render(data));

function render(data) {
  data.categories.forEach(cat => {
    // nav
    const btn = document.createElement("button");
    btn.textContent = cat.title;
    btn.onclick = () => show(cat.id);
    nav.appendChild(btn);

    // section
    const section = document.createElement("section");
    section.id = cat.id;
    section.className = "category";

    const h2 = document.createElement("h2");
    h2.textContent = cat.title;
    section.appendChild(h2);

    const grid = document.createElement("div");
    grid.className = "grid";

    cat.images.forEach(img => {
      const fig = document.createElement("figure");
      const el = document.createElement("img");

      el.src = `images/${cat.id}/${img.file}`;
      el.alt = img.title || "";
      el.dataset.title = img.title || "";
      el.dataset.meta = [img.year, img.medium].filter(Boolean).join(" • ");

      el.onclick = () => open(images.indexOf(el));

      fig.appendChild(el);
      grid.appendChild(fig);

      images.push(el);
    });

    section.appendChild(grid);
    gallery.appendChild(section);
  });
}

function show(id) {
  document.querySelectorAll(".category").forEach(s =>
    s.style.display = s.id === id ? "block" : "none"
  );
}

function open(i) {
  current = i;
  const img = images[i];
  lbImg.src = img.src;
  lbTitle.textContent = img.dataset.title;
  lbMeta.textContent = img.dataset.meta;
  lightbox.hidden = false;
}

function close() {
  lightbox.hidden = true;
}

function next() {
  open((current + 1) % images.length);
}

function prev() {
  open((current - 1 + images.length) % images.length);
}

document.addEventListener("keydown", e => {
  if (lightbox.hidden) return;
  if (e.key === "Escape") close();
  if (e.key === "ArrowRight") next();
  if (e.key === "ArrowLeft") prev();
});

lightbox.querySelector(".overlay").onclick = close;

