// Window Elements
const windows       = document.querySelectorAll(".window");
const windowEl      = windows[0];
const topbar        = windowEl.querySelector("#topbar");
const content       = windowEl.querySelector(".content");
const resizer       = windowEl.querySelector(".resizer");

// Control Buttons
const btnClose      = document.querySelector(".close");
const btnMax        = document.querySelector(".max");
const btnMini       = document.querySelector(".mini");

// Taskbar & Start Menu
const footerIcon    = document.querySelector("#icon");
const iconImg       = document.querySelector("#icon");
const startMenu     = document.querySelector("#start_menu");
const vistaStart    = document.querySelector("#vista_start");

// Desktop Icons
const desktopIcons  = document.querySelectorAll(".desktop-icon");

// Constants
const GRID_WIDTH    = 100;
const GRID_HEIGHT   = 100;
const PADDING       = 20;
const TASKBAR_HEIGHT = 40;

// Track Occupied Grid Positions
const occupiedGridPositions = new Set();

function initMenu() {
  vistaStart.addEventListener("click", () => {
    startMenu.classList.toggle("closed");
    startMenu.style.display = startMenu.classList.contains("closed") ? "none" : "flex";
  });
}

function makeDraggable(el) {
  el.onmousedown = (e) => {
    if (e.button !== 0) return;

    let startX = Math.round((el.offsetLeft - PADDING) / GRID_WIDTH);
    let startY = Math.round((el.offsetTop - PADDING) / GRID_HEIGHT);
    occupiedGridPositions.delete(`${startX},${startY}`);

    const offsetX = e.clientX - el.getBoundingClientRect().left;
    const offsetY = e.clientY - el.getBoundingClientRect().top;

    const moveAt = (x, y) => {
      let left = x - offsetX;
      let top = y - offsetY;

      const maxLeft = window.innerWidth - el.offsetWidth - PADDING;
      const maxTop = window.innerHeight - el.offsetHeight - TASKBAR_HEIGHT - PADDING;

      el.style.left = Math.max(PADDING, Math.min(left, maxLeft)) + "px";
      el.style.top = Math.max(PADDING, Math.min(top, maxTop)) + "px";
    };

    const onMouseMove = (e) => moveAt(e.pageX, e.pageY);

    document.addEventListener("mousemove", onMouseMove);

    el.onmouseup = () => {
      document.removeEventListener("mousemove", onMouseMove);
      el.onmouseup = null;

      let x = el.offsetLeft;
      let y = el.offsetTop;

      let gridX = Math.round((x - PADDING) / GRID_WIDTH);
      let gridY = Math.round((y - PADDING) / GRID_HEIGHT);

      let radius = 0;
      let found = false;

      while (!found && radius < 10) {
        if (!occupiedGridPositions.has(`${gridX},${gridY}`)) {
          found = true;
          break;
        }
        radius++;
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dy = -radius; dy <= radius; dy++) {
            if (Math.abs(dx) < radius && Math.abs(dy) < radius) continue;
            let nx = gridX + dx;
            let ny = gridY + dy;
            if (nx < 0 || ny < 0) continue;
            if (!occupiedGridPositions.has(`${nx},${ny}`)) {
              gridX = nx;
              gridY = ny;
              found = true;
              break;
            }
          }
        }
      }

      const finalX = gridX * GRID_WIDTH + PADDING;
      const finalY = gridY * GRID_HEIGHT + PADDING;

      const maxX = window.innerWidth - el.offsetWidth - PADDING;
      const maxY = window.innerHeight - el.offsetHeight - TASKBAR_HEIGHT - PADDING;

      el.style.left = Math.min(finalX, maxX) + "px";
      el.style.top = Math.min(finalY, maxY) + "px";

      occupiedGridPositions.add(`${gridX},${gridY}`);
    };
  };

  el.ondragstart = () => false;
}

function loadWindowContent(win, url) {
  const content = win.querySelector(".content");
  if (!content) return;

  fetch(url)
    .then((res) => res.text())
    .then((html) => {
      content.innerHTML = html;
    })
    .catch((err) => {
      console.error("Error loading window content:", err);
      content.innerHTML = `<div class="error">Error loading content: ${err.message}</div>`;
    });
}

function addToTaskbar(win) {
  const id = win.id;
  const baseId = id.replace("-window", "");
  const icon = document.getElementById(baseId);

  if (document.querySelector(`#t_programs .taskbar-item[data-window="${id}"]`)) return;

  const taskbarItem = document.createElement("div");
  taskbarItem.className = "taskbar-item";
  taskbarItem.setAttribute("data-window", id);

  const img = icon.querySelector("img").cloneNode(true);
  const label = document.createElement("p");
  label.textContent = icon.querySelector("span").textContent;

  taskbarItem.append(img, label);

  taskbarItem.addEventListener("click", () => {
    const targetWindow = document.getElementById(id);
    if (!targetWindow) return;

    const isHidden = getComputedStyle(targetWindow).display === "none";
    targetWindow.style.display = isHidden ? "flex" : "none";

    if (isHidden) {
      targetWindow.style.zIndex = getHighestZIndex() + 1;
      taskbarItem.classList.add("active");
    } else {
      taskbarItem.classList.remove("active");
    }
  });

  document.getElementById("t_programs").appendChild(taskbarItem);
  taskbarItem.classList.add("active");
}

function removeFromTaskbar(windowId) {
  const item = document.querySelector(`#t_programs .taskbar-item[data-window="${windowId}"]`);
  if (item) item.remove();
}

function updateTaskbarItemState(windowId, active) {
  const item = document.querySelector(`#t_programs .taskbar-item[data-window="${windowId}"]`);
  if (item) item.classList[active ? "add" : "remove"]("active");
}

function initDragDesktop() {
  desktopIcons.forEach((icon, i) => {
    icon.style.position = "absolute";
    let left = 20;
    let top = 20 + i * GRID_HEIGHT;

    if (icon.id === "recycle-bin") top = 20;
    else if (icon.id === "frutiger-areo") top = 120;
    else {
      left = parseInt(icon.style.left) || 20;
      top = parseInt(icon.style.top) || 20;
    }

    icon.style.left = `${left}px`;
    icon.style.top = `${top}px`;

    const gridX = Math.round((left - PADDING) / GRID_WIDTH);
    const gridY = Math.round((top - PADDING) / GRID_HEIGHT);
    occupiedGridPositions.add(`${gridX},${gridY}`);

    makeDraggable(icon);

    icon.addEventListener("dblclick", () => {
      const winId = `${icon.id}-window`;
      const win = document.getElementById(winId);
      if (!win) return;

      win.style.display = "flex";
      win.style.zIndex = getHighestZIndex() + 1;
      addToTaskbar(win);

      if (!win.dataset.contentLoaded) {
        loadWindowContent(win, `windows/${icon.id}.html`);
        win.dataset.contentLoaded = "true";
      }
    });
  });
}

function initIconSelection() {
  const icons = document.querySelectorAll(".desktop-icon");
  icons.forEach((icon) => {
    icon.addEventListener("click", (e) => {
      if (e.detail === 1) {
        icons.forEach((i) => i.classList.remove("selected"));
        icon.classList.add("selected");
        e.stopPropagation();
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".desktop-icon")) {
      icons.forEach((icon) => icon.classList.remove("selected"));
    }
  });
}

function initDrag() {
  windows.forEach((win) => {
    const bar = win.querySelector("#topbar");
    if (!bar) return;

    let isDragging = false;
    let offsetX = 0,
      offsetY = 0;

    bar.addEventListener("mousedown", (e) => {
      if (e.target.closest(".btn")) return;
      isDragging = true;
      offsetX = e.clientX - win.offsetLeft;
      offsetY = e.clientY - win.offsetTop;
      win.style.zIndex = getHighestZIndex() + 1;
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      win.style.left = e.clientX - offsetX + "px";
      win.style.top = e.clientY - offsetY + "px";
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  });
}

function initWindowControls() {
  windows.forEach((win) => {
    const close = win.querySelector(".close");
    const mini = win.querySelector(".mini");
    const max = win.querySelector(".max");

    if (close) {
      close.addEventListener("click", () => {
        win.style.display = "none";
        removeFromTaskbar(win.id);
      });
    }

    if (mini) {
      mini.addEventListener("click", () => {
        win.style.display = "none";
        updateTaskbarItemState(win.id, false);
      });
    }

    if (max) {
      max.addEventListener("click", () => {
        if (win.classList.contains("maximized")) {
          win.style.width = win.dataset.prevWidth || "50%";
          win.style.height = win.dataset.prevHeight || "70%";
          win.style.left = "20%";
          win.style.top = "10%";
          win.classList.remove("maximized");
        } else {
          win.dataset.prevWidth = win.style.width;
          win.dataset.prevHeight = win.style.height;
          win.style.width = "100%";
          win.style.height = "95%";
          win.style.left = "0";
          win.style.top = "0";
          win.classList.add("maximized");
        }
      });
    }
  });
}

function getHighestZIndex() {
  let maxZ = 0;
  windows.forEach((win) => {
    const z = parseInt(getComputedStyle(win).zIndex) || 0;
    if (z > maxZ) maxZ = z;
  });
  return maxZ;
}

function updateClock() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, "0");
  const m = now.getMinutes().toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  const mo = (now.getMonth() + 1).toString().padStart(2, "0");
  const y = now.getFullYear();

  document.getElementById("clock").innerHTML = `${h}:${m}<br>${d}/${mo}/${y}`;
}

function init() {
  windows.forEach((w) => (w.style.display = "none"));
  document.getElementById("t_programs").innerHTML = "";

  initDrag();
  initDragDesktop();
  initWindowControls();
  initMenu();
  initIconSelection();

  document.body.addEventListener(
    "click",
    () => {
      const music = document.getElementById("background-music");
      if (music.paused) {
        music.muted = false;
        music.volume = 0.05;
        music.play();
      }
    },
    { once: true }
  );
}

init();
setInterval(updateClock, 1000);
updateClock();
