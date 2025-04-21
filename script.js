// =======================================================================================
// 1. DOM Element References
// =======================================================================================
const windows = document.querySelectorAll('.window');
const windowEl = windows[0]; // Keep reference to first window for backward compatibility
const topbar = windowEl.querySelector('#topbar');
const content = windowEl.querySelector('.content');
const resizer = windowEl.querySelector('.resizer');
const footerIcon = document.querySelector('#icon');

const btnClose = document.querySelector('.close');
const btnMax = document.querySelector('.max');
const btnMini = document.querySelector('.mini');
const iconImg = document.querySelector('#icon');

const startMenu = document.querySelector('#start_menu');
const vistaStart = document.querySelector('#vista_start');

const desktopIcons = document.querySelectorAll('.desktop-icon');

// ================================
// 2. Constants
// ================================

// Constants for desktop grid
const GRID_WIDTH = 100; 
const GRID_HEIGHT = 100;
const PADDING = 20;
const TASKBAR_HEIGHT = 40;

// Track occupied grid positions
const occupiedGridPositions = new Set();

// ================================
// 3. Start Menu Functions
// ================================
function initMenu() {
  vistaStart.addEventListener('click', () => {
    if (startMenu.classList.contains('closed')) {
      startMenu.style.display = 'flex';
      startMenu.classList.remove('closed');
    } else {
      startMenu.style.display = 'none';
      startMenu.classList.add('closed');
    }
  });
}

// ================================
// 4. Desktop Icon Functions
// ================================
function makeDraggable(element) {
  element.onmousedown = function(e) {
    if (e.button !== 0) return;
    
    // Remove current position from occupied positions
    const currentGridX = Math.round((element.offsetLeft - PADDING) / GRID_WIDTH);
    const currentGridY = Math.round((element.offsetTop - PADDING) / GRID_HEIGHT);
    occupiedGridPositions.delete(`${currentGridX},${currentGridY}`);
    
    const shiftX = e.clientX - element.getBoundingClientRect().left;
    const shiftY = e.clientY - element.getBoundingClientRect().top;

    const moveAt = (pageX, pageY) => {
      let x = pageX - shiftX;
      let y = pageY - shiftY;

      const maxX = window.innerWidth - element.offsetWidth - PADDING;
      const maxY = window.innerHeight - element.offsetHeight - TASKBAR_HEIGHT - PADDING;

      x = Math.max(PADDING, Math.min(x, maxX));
      y = Math.max(PADDING, Math.min(y, maxY));

      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
    };

    const onMouseMove = (e) => moveAt(e.pageX, e.pageY);
    document.addEventListener('mousemove', onMouseMove);

    element.onmouseup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      element.onmouseup = null;

      let x = element.offsetLeft;
      let y = element.offsetTop;

      // Calculate grid position
      let gridX = Math.round((x - PADDING) / GRID_WIDTH);
      let gridY = Math.round((y - PADDING) / GRID_HEIGHT);
      
      // Find nearest unoccupied grid position
      let found = false;
      let searchRadius = 0;
      const maxSearchRadius = 10; // Limit search to prevent infinite loops
      
      while (!found && searchRadius < maxSearchRadius) {
        // Try current position first
        if (!occupiedGridPositions.has(`${gridX},${gridY}`)) {
          found = true;
          break;
        }
        
        // Expand search radius
        searchRadius++;
        
        // Check positions in expanding square pattern
        for (let offsetX = -searchRadius; offsetX <= searchRadius; offsetX++) {
          for (let offsetY = -searchRadius; offsetY <= searchRadius; offsetY++) {
            // Skip positions not on the edge of the square
            if (Math.abs(offsetX) < searchRadius && Math.abs(offsetY) < searchRadius) continue;
            
            const testX = gridX + offsetX;
            const testY = gridY + offsetY;
            
            // Skip invalid positions (outside screen)
            if (testX < 0 || testY < 0) continue;
            
            // Check if position is available
            if (!occupiedGridPositions.has(`${testX},${testY}`)) {
              gridX = testX;
              gridY = testY;
              found = true;
              break;
            }
          }
          if (found) break;
        }
      }
      
      // Calculate final position
      const snappedX = gridX * GRID_WIDTH + PADDING;
      const snappedY = gridY * GRID_HEIGHT + PADDING;
      
      const maxX = window.innerWidth - element.offsetWidth - PADDING;
      const maxY = window.innerHeight - element.offsetHeight - TASKBAR_HEIGHT - PADDING;

      // Apply position
      element.style.left = `${Math.min(snappedX, maxX)}px`;
      element.style.top = `${Math.min(snappedY, maxY)}px`;
      
      // Mark position as occupied
      occupiedGridPositions.add(`${gridX},${gridY}`);
    };
  };

  element.ondragstart = () => false;
}

// Update the desktop icons selection
// Add function to load external HTML content
function loadWindowContent(windowElement, contentPath) {
  const contentContainer = windowElement.querySelector('.content');
  if (!contentContainer) return;
  
  fetch(contentPath)
    .then(response => response.text())
    .then(html => {
      contentContainer.innerHTML = html;
    })
    .catch(error => {
      console.error('Error loading window content:', error);
      contentContainer.innerHTML = `<div class="error">Error loading content: ${error.message}</div>`;
    });
}

// Update initDragDesktop to load content when opening windows
// Function to add program to taskbar
function addToTaskbar(windowElement) {
  const windowId = windowElement.id;
  const iconId = windowId.replace('-window', '');
  const desktopIcon = document.getElementById(iconId);
  
  // Check if program is already in taskbar
  const existingTaskbarItem = document.querySelector(`#t_programs .taskbar-item[data-window="${windowId}"]`);
  if (existingTaskbarItem) return;
  
  // Create new taskbar item
  const taskbarItem = document.createElement('div');
  taskbarItem.className = 'taskbar-item';
  taskbarItem.setAttribute('data-window', windowId);
  
  // Copy icon and text from desktop icon
  const iconImg = desktopIcon.querySelector('img').cloneNode(true);
  const iconText = document.createElement('p');
  iconText.textContent = desktopIcon.querySelector('span').textContent;
  
  taskbarItem.appendChild(iconImg);
  taskbarItem.appendChild(iconText);
  
  // Add click event to show/hide window
  taskbarItem.addEventListener('click', () => {
    const targetWindow = document.getElementById(windowId);
    if (targetWindow) {
      const isHidden = getComputedStyle(targetWindow).display === 'none';
      
      if (isHidden) {
        // Show window and bring to front
        targetWindow.style.display = 'flex';
        const highestZ = getHighestZIndex();
        targetWindow.style.zIndex = highestZ + 1;
        taskbarItem.classList.add('active');
      } else {
        // If window is already visible, minimize it
        targetWindow.style.display = 'none';
        taskbarItem.classList.remove('active');
      }
    }
  });
  
  // Add to taskbar
  document.getElementById('t_programs').appendChild(taskbarItem);
  
  // Mark as active
  taskbarItem.classList.add('active');
}

// Function to remove program from taskbar
function removeFromTaskbar(windowId) {
  const taskbarItem = document.querySelector(`#t_programs .taskbar-item[data-window="${windowId}"]`);
  if (taskbarItem) {
    taskbarItem.remove();
  }
}

// Function to update taskbar item state (active/inactive)
function updateTaskbarItemState(windowId, isActive) {
  const taskbarItem = document.querySelector(`#t_programs .taskbar-item[data-window="${windowId}"]`);
  if (taskbarItem) {
    if (isActive) {
      taskbarItem.classList.add('active');
    } else {
      taskbarItem.classList.remove('active');
    }
  }
}

function initDragDesktop() {
  // Apply initial positioning and draggable behavior to each icon
  desktopIcons.forEach((icon, index) => {
    // Ensure the icon has absolute positioning
    if (!icon.style.position) {
      icon.style.position = 'absolute';
    }
    
    // Set initial positions if not already set
    let initialX, initialY;
    if (icon.id === 'recycle-bin' && !icon.style.left) {
      initialX = 20;
      initialY = 20;
    } else if (icon.id === 'frutiger-areo' && !icon.style.left) {
      initialX = 20;
      initialY = 120;
    } else if (!icon.style.left) {
      // For any new icons without explicit positioning
      // Calculate position based on index to create a column of icons
      initialX = 20;
      initialY = 20 + (index * GRID_HEIGHT);
    } else {
      initialX = parseInt(icon.style.left) || 20;
      initialY = parseInt(icon.style.top) || 20;
    }
    
    // Apply the position
    icon.style.left = `${initialX}px`;
    icon.style.top = `${initialY}px`;
    
    // Calculate and mark grid position as occupied
    const gridX = Math.round((initialX - PADDING) / GRID_WIDTH);
    const gridY = Math.round((initialY - PADDING) / GRID_HEIGHT);
    occupiedGridPositions.add(`${gridX},${gridY}`);
    
    // Make the icon draggable
    makeDraggable(icon);
    
    // Add double-click to open window
    icon.addEventListener('dblclick', () => {
      const windowId = `${icon.id}-window`;
      const targetWindow = document.getElementById(windowId);
      
      if (targetWindow) {
        // Show the window
        targetWindow.style.display = 'flex';
        
        // Bring window to front
        const highestZ = getHighestZIndex();
        targetWindow.style.zIndex = highestZ + 1;
        
        // Add to taskbar
        addToTaskbar(targetWindow);
        
        // Load content if not already loaded
        if (!targetWindow.dataset.contentLoaded) {
          const contentPath = `windows/${icon.id}.html`;
          loadWindowContent(targetWindow, contentPath);
          targetWindow.dataset.contentLoaded = 'true';
        }
      }
    });
  });
}

function initIconSelection() {
  const desktopIcons = document.querySelectorAll('.desktop-icon');
  
  // Add click handler to each icon
  desktopIcons.forEach(icon => {
      icon.addEventListener('click', (e) => {
          // Prevent double-click from triggering this
          if (e.detail === 1) {
              // Remove selected class from all icons
              desktopIcons.forEach(i => i.classList.remove('selected'));
              
              // Add selected class to clicked icon
              icon.classList.add('selected');
              
              // Prevent event from bubbling to document
              e.stopPropagation();
          }
      });
  });
  
  // Add click handler to document to deselect when clicking elsewhere
  document.addEventListener('click', (e) => {
      // Check if the click was on an icon or its children
      if (!e.target.closest('.desktop-icon')) {
          // If not, deselect all icons
          desktopIcons.forEach(icon => icon.classList.remove('selected'));
      }
  });
}

// ================================
// 5. Window Management Functions
// ================================
function loadWindowContent(windowElement, contentPath) {
  const contentContainer = windowElement.querySelector('.content');
  if (!contentContainer) return;
  
  fetch(contentPath)
    .then(response => response.text())
    .then(html => {
      contentContainer.innerHTML = html;
    })
    .catch(error => {
      console.error('Error loading window content:', error);
      contentContainer.innerHTML = `<div class="error">Error loading content: ${error.message}</div>`;
    });
}

function initDrag() {
  // Apply dragging to each window individually
  windows.forEach(windowElement => {
    const windowTopbar = windowElement.querySelector('#topbar');
    if (!windowTopbar) return;
    
    let dragging = false, offsetX = 0, offsetY = 0;

    windowTopbar.addEventListener('mousedown', e => {
      if (e.target.closest('.btn')) return;
      dragging = true;
      offsetX = e.clientX - windowElement.offsetLeft;
      offsetY = e.clientY - windowElement.offsetTop;
      
      // Bring window to front when dragging starts
      const highestZ = getHighestZIndex();
      windowElement.style.zIndex = highestZ + 1;
    });

    const onMouseMove = e => {
      if (!dragging) return;
      windowElement.style.left = `${e.clientX - offsetX}px`;
      windowElement.style.top = `${e.clientY - offsetY}px`;
    };

    const onMouseUp = () => {
      dragging = false;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

function initResize() {
  windows.forEach(windowElement => {
    const windowResizer = windowElement.querySelector('.resizer');
    if (!windowResizer) return;
    
    windowResizer.addEventListener('mousedown', e => {
      e.preventDefault();
      
      function onMouseMove(e) {
        const minW = 250, minH = 200;
        const w = Math.max(e.clientX - windowElement.offsetLeft, minW);
        const h = Math.max(e.clientY - windowElement.offsetTop, minH);
        windowElement.style.width = `${w}px`;
        windowElement.style.height = `${h}px`;
      }
      
      function onMouseUp() {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }
      
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  });
}

function initWindowControls() {
  windows.forEach(windowElement => {
    const closeBtn = windowElement.querySelector('.close');
    const miniBtn = windowElement.querySelector('.mini');
    const maxBtn = windowElement.querySelector('.max');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        windowElement.style.display = 'none';
        // Remove from taskbar
        removeFromTaskbar(windowElement.id);
      });
    }
    
    if (miniBtn) {
      miniBtn.addEventListener('click', () => {
        windowElement.style.display = 'none';
        // Update taskbar item state (not removing it)
        updateTaskbarItemState(windowElement.id, false);
      });
    }
    
    if (maxBtn) {
      maxBtn.addEventListener('click', () => {
        if (windowElement.classList.contains('maximized')) {
          windowElement.style.width = windowElement.dataset.prevWidth || '60%';
          windowElement.style.height = windowElement.dataset.prevHeight || '80%';
          windowElement.classList.remove('maximized');
        } else {
          windowElement.dataset.prevWidth = windowElement.style.width;
          windowElement.dataset.prevHeight = windowElement.style.height;
          windowElement.style.width = '98%';
          windowElement.style.height = '90%';
          windowElement.style.left = '1%';
          windowElement.style.top = '1%';
          windowElement.classList.add('maximized');
        }
        
        const windowContent = windowElement.querySelector('.content');
        if (windowContent) {
          windowContent.style.display = 'block';
          windowContent.style.flex = '1 1 auto';
          windowContent.style.overflowY = 'auto';
        }
      });
    }
  });
}

// Helper function to get highest z-index among windows
function getHighestZIndex() {
  let highest = 0;
  
  windows.forEach(win => {
    const zIndex = parseInt(getComputedStyle(win).zIndex) || 0;
    if (zIndex > highest) highest = zIndex;
  });
  
  return highest;
}

// ================================
// 6. Taskbar Functions
// ================================
function addToTaskbar(windowElement) {
  const windowId = windowElement.id;
  const iconId = windowId.replace('-window', '');
  const desktopIcon = document.getElementById(iconId);
  
  // Check if program is already in taskbar
  const existingTaskbarItem = document.querySelector(`#t_programs .taskbar-item[data-window="${windowId}"]`);
  if (existingTaskbarItem) return;
  
  // Create new taskbar item
  const taskbarItem = document.createElement('div');
  taskbarItem.className = 'taskbar-item';
  taskbarItem.setAttribute('data-window', windowId);
  
  // Copy icon and text from desktop icon
  const iconImg = desktopIcon.querySelector('img').cloneNode(true);
  const iconText = document.createElement('p');
  iconText.textContent = desktopIcon.querySelector('span').textContent;
  
  taskbarItem.appendChild(iconImg);
  taskbarItem.appendChild(iconText);
  
  // Add click event to show/hide window
  taskbarItem.addEventListener('click', () => {
    const targetWindow = document.getElementById(windowId);
    if (targetWindow) {
      const isHidden = getComputedStyle(targetWindow).display === 'none';
      
      if (isHidden) {
        // Show window and bring to front
        targetWindow.style.display = 'flex';
        const highestZ = getHighestZIndex();
        targetWindow.style.zIndex = highestZ + 1;
        taskbarItem.classList.add('active');
      } else {
        // If window is already visible, minimize it
        targetWindow.style.display = 'none';
        taskbarItem.classList.remove('active');
      }
    }
  });
  
  // Add to taskbar
  document.getElementById('t_programs').appendChild(taskbarItem);
  
  // Mark as active
  taskbarItem.classList.add('active');
}

function removeFromTaskbar(windowId) {
  const taskbarItem = document.querySelector(`#t_programs .taskbar-item[data-window="${windowId}"]`);
  if (taskbarItem) {
    taskbarItem.remove();
  }
}

function updateTaskbarItemState(windowId, isActive) {
  const taskbarItem = document.querySelector(`#t_programs .taskbar-item[data-window="${windowId}"]`);
  if (taskbarItem) {
    if (isActive) {
      taskbarItem.classList.add('active');
    } else {
      taskbarItem.classList.remove('active');
    }
  }
}

// ================================
// 7. Clock Functions
// ================================
function updateClock() {
  const now = new Date();

  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const time = `${hours}:${minutes}`;

  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0'); 
  const year = now.getFullYear();
  const date = `${day}/${month}/${year}`; 

  document.getElementById('clock').innerHTML = `${time}<br>${date}`;
}

// ================================
// 8. Initialization
// ================================
function init() {
  // Hide all windows on load
  windows.forEach(window => {
    window.style.display = 'none';
  });
  
  // Clear taskbar programs
  document.getElementById('t_programs').innerHTML = '';
  
  initDrag();
  initDragDesktop();
  initResize();
  initWindowControls();
  initMenu();
  initIconSelection();

  document.body.addEventListener('click', () => {
    const audio = document.getElementById('background-music');
    if (audio.paused) {
      audio.muted  = false;
      audio.volume = 0.05;
      audio.play();
    }
  }, { once: true });
}

// Initialize the application
init();

// Start the clock
setInterval(updateClock, 1000);
updateClock();