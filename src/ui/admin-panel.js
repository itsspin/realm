/**
 * Admin Panel
 * 
 * Comprehensive admin panel for editing the game world:
 * - Map grid editor (tile placement)
 * - Spawn point editor (mobs, guards, resources)
 * - Zone line editor (transitions)
 * - Mob property editor (level, HP, drops, etc.)
 * - Guard patrol path editor
 * - Save functionality to overwrite JSON files
 */

(function (global) {
  let adminPanel = null;
  let isOpen = false;
  let currentEditMode = 'tile'; // 'tile', 'spawn', 'zoneLine', 'mob', 'patrol'
  let selectedTileType = 'grass';
  let selectedMobTemplate = null;
  let selectedSpawnGroup = null;
  let editingMob = null;
  let editingPatrol = null;
  let unsavedChanges = false;

  /**
   * Initialize admin panel
   */
  function initialize() {
    if (!global.AdminUtils?.isAdmin()) {
      return; // Not an admin, don't initialize
    }

    createAdminPanel();
    addAdminButton();
  }

  /**
   * Create admin panel HTML
   */
  function createAdminPanel() {
    // Remove existing panel if any
    const existing = document.getElementById('adminPanel');
    if (existing) {
      existing.remove();
    }

    adminPanel = document.createElement('div');
    adminPanel.id = 'adminPanel';
    adminPanel.className = 'admin-panel';
    adminPanel.style.display = 'none';

    adminPanel.innerHTML = `
      <div class="admin-panel-header">
        <h2>Admin Panel</h2>
        <button class="admin-close-btn" onclick="window.AdminPanel.close()">×</button>
      </div>
      
      <div class="admin-panel-content">
        <div class="admin-tabs">
          <button class="admin-tab active" data-tab="map">Map Editor</button>
          <button class="admin-tab" data-tab="spawns">Spawns</button>
          <button class="admin-tab" data-tab="zones">Zone Lines</button>
          <button class="admin-tab" data-tab="mobs">Mob Editor</button>
          <button class="admin-tab" data-tab="patrols">Guard Patrols</button>
        </div>

        <!-- Map Editor Tab -->
        <div class="admin-tab-content active" data-content="map">
          <div class="admin-map-editor">
            <div class="admin-map-controls">
              <h3>Tile Editor</h3>
              <div class="tile-type-selector">
                <label>Tile Type:</label>
                <select id="tileTypeSelect">
                  <option value="grass">Grass</option>
                  <option value="path">Path</option>
                  <option value="city_street">City Street</option>
                  <option value="city_plaza">City Plaza</option>
                  <option value="building">Building</option>
                  <option value="wall">Wall</option>
                  <option value="water">Water</option>
                  <option value="rock">Rock</option>
                  <option value="tree">Tree</option>
                  <option value="dungeon_floor">Dungeon Floor</option>
                  <option value="dungeon_wall">Dungeon Wall</option>
                </select>
              </div>
              <div class="tile-properties">
                <label>
                  <input type="checkbox" id="tileWalkable" checked> Walkable
                </label>
              </div>
              <div class="admin-zone-selector">
                <label>Zone:</label>
                <select id="adminZoneSelect">
                  <option value="">-- Select Zone --</option>
                </select>
              </div>
              <button class="admin-btn" onclick="window.AdminPanel.fillZoneWithTile()">Fill Zone</button>
              <button class="admin-btn" onclick="window.AdminPanel.clearZone()">Clear Zone</button>
            </div>
            <div class="admin-map-canvas-container">
              <canvas id="adminMapCanvas"></canvas>
            </div>
          </div>
        </div>

        <!-- Spawns Tab -->
        <div class="admin-tab-content" data-content="spawns">
          <div class="admin-spawn-editor">
            <div class="admin-spawn-controls">
              <h3>Spawn Point Editor</h3>
              <div class="admin-zone-selector">
                <label>Zone:</label>
                <select id="adminZoneSelectSpawn">
                  <option value="">-- Select Zone --</option>
                </select>
              </div>
              <div class="spawn-group-selector">
                <label>Spawn Group:</label>
                <select id="spawnGroupSelect">
                  <option value="">-- Create New --</option>
                </select>
                <button class="admin-btn" onclick="window.AdminPanel.createSpawnGroup()">New Group</button>
              </div>
              <div class="spawn-group-props" id="spawnGroupProps" style="display: none;">
                <label>Group ID:</label>
                <input type="text" id="spawnGroupId" placeholder="e.g., thronehold_guards_patrol">
                <label>Spawn Type:</label>
                <select id="spawnTypeSelect">
                  <option value="static">Static</option>
                  <option value="roaming">Roaming</option>
                </select>
                <label>Max Concurrent:</label>
                <input type="number" id="spawnMaxConcurrent" value="8" min="1">
                <label>Respawn Seconds:</label>
                <input type="number" id="spawnRespawnSeconds" value="300" min="1">
                <label>Mob Templates (comma-separated):</label>
                <input type="text" id="spawnMobTemplates" placeholder="thronehold_guard, wild_boar">
                <button class="admin-btn" onclick="window.AdminPanel.saveSpawnGroup()">Save Group</button>
                <button class="admin-btn admin-btn-danger" onclick="window.AdminPanel.deleteSpawnGroup()">Delete Group</button>
              </div>
              <div class="spawn-instructions">
                <p><strong>Instructions:</strong> Click on the map to place spawn points. Right-click to remove.</p>
              </div>
            </div>
            <div class="admin-map-canvas-container">
              <canvas id="adminSpawnCanvas"></canvas>
            </div>
          </div>
        </div>

        <!-- Zone Lines Tab -->
        <div class="admin-tab-content" data-content="zones">
          <div class="admin-zone-line-editor">
            <div class="admin-zone-line-controls">
              <h3>Zone Line Editor</h3>
              <div class="zone-line-selector">
                <label>From Zone:</label>
                <select id="zoneLineFromZone"></select>
                <label>To Zone:</label>
                <select id="zoneLineToZone"></select>
                <label>Transition Point (X, Y):</label>
                <input type="number" id="zoneLineX" placeholder="X" min="0">
                <input type="number" id="zoneLineY" placeholder="Y" min="0">
                <button class="admin-btn" onclick="window.AdminPanel.addZoneLine()">Add Zone Line</button>
              </div>
              <div class="zone-lines-list" id="zoneLinesList"></div>
            </div>
            <div class="admin-map-canvas-container">
              <canvas id="adminZoneLineCanvas"></canvas>
            </div>
          </div>
        </div>

        <!-- Mobs Tab -->
        <div class="admin-tab-content" data-content="mobs">
          <div class="admin-mob-editor">
            <div class="admin-mob-list">
              <h3>Mob Templates</h3>
              <input type="text" id="mobSearch" placeholder="Search mobs..." oninput="window.AdminPanel.filterMobs(this.value)">
              <div class="mob-list" id="mobList"></div>
              <button class="admin-btn" onclick="window.AdminPanel.createMobTemplate()">Create New Mob</button>
            </div>
            <div class="admin-mob-properties" id="mobProperties" style="display: none;">
              <h3>Edit Mob Template</h3>
              <div class="mob-props-form">
                <label>ID:</label>
                <input type="text" id="mobId" readonly>
                <label>Name:</label>
                <input type="text" id="mobName">
                <label>Level Range:</label>
                <input type="number" id="mobLevelMin" placeholder="Min" min="1">
                <input type="number" id="mobLevelMax" placeholder="Max" min="1">
                <label>Base Stats:</label>
                <input type="number" id="mobHp" placeholder="HP" min="1">
                <input type="number" id="mobAtk" placeholder="ATK" min="0">
                <input type="number" id="mobDef" placeholder="DEF" min="0">
                <input type="number" id="mobAgi" placeholder="AGI" min="0">
                <label>XP:</label>
                <input type="number" id="mobXp" placeholder="XP" min="0">
                <label>Gold:</label>
                <input type="number" id="mobGold" placeholder="Gold" min="0">
                <label>Faction ID:</label>
                <input type="text" id="mobFactionId" placeholder="thronehold_guards">
                <label>Loot Table ID:</label>
                <input type="text" id="mobLootTableId" placeholder="guard_loot">
                <label>Is Guard:</label>
                <input type="checkbox" id="mobIsGuard">
                <button class="admin-btn" onclick="window.AdminPanel.saveMobTemplate()">Save Mob</button>
                <button class="admin-btn admin-btn-danger" onclick="window.AdminPanel.deleteMobTemplate()">Delete Mob</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Patrols Tab -->
        <div class="admin-tab-content" data-content="patrols">
          <div class="admin-patrol-editor">
            <div class="admin-patrol-controls">
              <h3>Guard Patrol Editor</h3>
              <div class="patrol-selector">
                <label>Patrol Group:</label>
                <select id="patrolGroupSelect">
                  <option value="">-- Create New --</option>
                </select>
                <button class="admin-btn" onclick="window.AdminPanel.createPatrolGroup()">New Patrol</button>
              </div>
              <div class="patrol-props" id="patrolProps" style="display: none;">
                <label>Zone ID:</label>
                <select id="patrolZoneId"></select>
                <label>Guard Template ID:</label>
                <input type="text" id="patrolGuardTemplateId" placeholder="thronehold_guard">
                <label>Speed:</label>
                <input type="number" id="patrolSpeed" value="1" min="0.1" step="0.1">
                <label>Pause at Waypoint (ms):</label>
                <input type="number" id="patrolPause" value="5000" min="0">
                <p><strong>Instructions:</strong> Click on the map to add waypoints to the patrol route. Right-click to remove waypoint.</p>
                <div class="patrol-waypoints" id="patrolWaypoints"></div>
                <button class="admin-btn" onclick="window.AdminPanel.savePatrolGroup()">Save Patrol</button>
                <button class="admin-btn admin-btn-danger" onclick="window.AdminPanel.deletePatrolGroup()">Delete Patrol</button>
              </div>
            </div>
            <div class="admin-map-canvas-container">
              <canvas id="adminPatrolCanvas"></canvas>
            </div>
          </div>
        </div>
      </div>

      <div class="admin-panel-footer">
        <div class="admin-status" id="adminStatus">Ready</div>
        <div class="admin-actions">
          <button class="admin-btn admin-btn-primary" onclick="window.AdminPanel.saveAll()">Save All Changes</button>
          <button class="admin-btn" onclick="window.AdminPanel.reloadData()">Reload Data</button>
        </div>
      </div>
    `;

    document.body.appendChild(adminPanel);
    setupEventListeners();
    loadData();
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Tab switching
    const tabs = adminPanel.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        switchTab(tabName);
      });
    });

    // Tile type selector
    const tileTypeSelect = document.getElementById('tileTypeSelect');
    if (tileTypeSelect) {
      tileTypeSelect.addEventListener('change', (e) => {
        selectedTileType = e.target.value;
        updateWalkableDefault();
      });
    }

    // Zone selector (map editor)
    const zoneSelect = document.getElementById('adminZoneSelect');
    if (zoneSelect) {
      zoneSelect.addEventListener('change', () => {
        renderMapEditor();
      });
    }

    // Zone selector (spawn editor)
    const zoneSelectSpawn = document.getElementById('adminZoneSelectSpawn');
    if (zoneSelectSpawn) {
      zoneSelectSpawn.addEventListener('change', () => {
        renderSpawnEditor();
        // Update spawn groups list for selected zone
        const zoneId = zoneSelectSpawn.value;
        if (zoneId) {
          const spawnGroups = Object.values(global.World?.getWorldData()?.spawnGroups || {})
            .filter(sg => sg.zoneId === zoneId);
          const spawnGroupSelect = document.getElementById('spawnGroupSelect');
          if (spawnGroupSelect) {
            const currentValue = spawnGroupSelect.value;
            spawnGroupSelect.innerHTML = '<option value="">-- Create New --</option>' +
              spawnGroups.map(sg => 
                `<option value="${sg.id}">${sg.id}</option>`
              ).join('');
            if (currentValue && spawnGroups.find(sg => sg.id === currentValue)) {
              spawnGroupSelect.value = currentValue;
            }
          }
        }
      });
    }

    // Spawn group selector
    const spawnGroupSelect = document.getElementById('spawnGroupSelect');
    if (spawnGroupSelect) {
      spawnGroupSelect.addEventListener('change', (e) => {
        loadSpawnGroup(e.target.value);
      });
    }

    // Mob search
    const mobSearch = document.getElementById('mobSearch');
    if (mobSearch) {
      mobSearch.addEventListener('input', (e) => {
        filterMobs(e.target.value);
      });
    }
  }

  /**
   * Update walkable default based on tile type
   */
  function updateWalkableDefault() {
    const walkableCheckbox = document.getElementById('tileWalkable');
    if (!walkableCheckbox) return;

    const nonWalkableTypes = ['wall', 'building', 'water', 'rock', 'tree', 'dungeon_wall'];
    walkableCheckbox.checked = !nonWalkableTypes.includes(selectedTileType);
  }

  /**
   * Switch tabs
   */
  function switchTab(tabName) {
    // Update tab buttons
    adminPanel.querySelectorAll('.admin-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    adminPanel.querySelectorAll('.admin-tab-content').forEach(content => {
      content.classList.toggle('active', content.dataset.content === tabName);
    });

    // Render appropriate canvas
    setTimeout(() => {
      if (tabName === 'map') {
        renderMapEditor();
      } else if (tabName === 'spawns') {
        renderSpawnEditor();
      } else if (tabName === 'zones') {
        renderZoneLineEditor();
      } else if (tabName === 'mobs') {
        renderMobEditor();
      } else if (tabName === 'patrols') {
        renderPatrolEditor();
      }
    }, 100);
  }

  /**
   * Load data from game state
   */
  function loadData() {
    loadZones();
    loadSpawnGroups();
    loadMobTemplates();
    loadPatrolGroups();
  }

  /**
   * Load zones into selectors
   */
  function loadZones() {
    const zones = Object.values(global.World?.getWorldData()?.zones || {});
    const zoneSelect = document.getElementById('adminZoneSelect');
    const zoneSelectSpawn = document.getElementById('adminZoneSelectSpawn');
    const zoneLineFromZone = document.getElementById('zoneLineFromZone');
    const zoneLineToZone = document.getElementById('zoneLineToZone');
    const patrolZoneId = document.getElementById('patrolZoneId');

    const allSelects = [zoneSelect, zoneSelectSpawn, zoneLineFromZone, zoneLineToZone, patrolZoneId].filter(Boolean);
    const player = global.State?.getPlayer();
    const currentZoneId = player?.currentZone;

    allSelects.forEach(select => {
      if (!select) return;
      const currentValue = select.value;
      select.innerHTML = '<option value="">-- Select Zone --</option>' + 
        zones.map(zone => 
          `<option value="${zone.id}">${zone.name} (${zone.id})</option>`
        ).join('');
      
      // Restore current selection if it still exists
      if (currentValue && zones.find(z => z.id === currentValue)) {
        select.value = currentValue;
      } else if (currentZoneId && zones.find(z => z.id === currentZoneId)) {
        // Default to player's current zone
        select.value = currentZoneId;
      }
    });
  }

  /**
   * Load spawn groups
   */
  function loadSpawnGroups() {
    const spawnGroups = Object.values(global.World?.getWorldData()?.spawnGroups || {});
    const select = document.getElementById('spawnGroupSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- Create New --</option>' +
      spawnGroups.map(sg => 
        `<option value="${sg.id}">${sg.id} (${sg.zoneId})</option>`
      ).join('');
  }

  /**
   * Load mob templates
   */
  function loadMobTemplates() {
    const mobTemplates = Object.values(global.World?.getWorldData()?.mobTemplates || {});
    const mobList = document.getElementById('mobList');
    if (!mobList) return;

    mobList.innerHTML = mobTemplates.map(mob => `
      <div class="mob-item" onclick="window.AdminPanel.editMobTemplate('${mob.id}')">
        <strong>${mob.name}</strong> (${mob.id})<br>
        <small>Level ${mob.levelRange?.min || 1}-${mob.levelRange?.max || 1} | HP: ${mob.baseStats?.maxHp || 0}</small>
      </div>
    `).join('');
  }

  /**
   * Load patrol groups
   */
  function loadPatrolGroups() {
    const patrols = global.REALM?.data?.guardPatrols || [];
    const select = document.getElementById('patrolGroupSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- Create New --</option>' +
      patrols.map(p => 
        `<option value="${p.id}">${p.id} (${p.zoneId})</option>`
      ).join('');
  }

  /**
   * Render map editor canvas
   */
  function renderMapEditor() {
    const canvas = document.getElementById('adminMapCanvas');
    if (!canvas) return;

    const zoneSelect = document.getElementById('adminZoneSelect');
    const zoneId = zoneSelect?.value;
    if (!zoneId) return;

    const zone = global.World?.getZone(zoneId);
    if (!zone) return;

    const tiles = global.World?.getZoneTiles(zoneId) || [];
    const container = canvas.parentElement;
    const tileSize = 20;
    
    canvas.width = zone.gridWidth * tileSize;
    canvas.height = zone.gridHeight * tileSize;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw tiles
    tiles.forEach(tile => {
      const x = tile.x * tileSize;
      const y = tile.y * tileSize;
      const color = getTerrainColor(tile.terrainType);
      
      ctx.fillStyle = color;
      ctx.fillRect(x, y, tileSize, tileSize);
      
      if (!tile.walkable) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, tileSize, tileSize);
      }
    });

    // Add click handler
    canvas.onclick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / tileSize);
      const y = Math.floor((e.clientY - rect.top) / tileSize);
      
      if (x >= 0 && x < zone.gridWidth && y >= 0 && y < zone.gridHeight) {
        editTile(zoneId, x, y);
      }
    };
  }

  /**
   * Get terrain color
   */
  function getTerrainColor(terrainType) {
    const colors = {
      grass: '#4a7c3a',
      path: '#8b7355',
      city_street: '#6b6b6b',
      city_plaza: '#8b8b8b',
      building: '#4a4a4a',
      wall: '#2a2a2a',
      water: '#1a3a5c',
      rock: '#5a5a5a',
      tree: '#2d5016',
      dungeon_floor: '#6b5b4f',
      dungeon_wall: '#3a3a3a'
    };
    return colors[terrainType] || '#4a4a4a';
  }

  /**
   * Edit tile
   */
  function editTile(zoneId, x, y) {
    const tileType = selectedTileType;
    const walkable = document.getElementById('tileWalkable')?.checked ?? true;
    
    // Update tile in world data
    const key = `${zoneId}_${x}_${y}`;
    const worldData = global.World?.getWorldData();
    if (!worldData) return;

    worldData.tiles[key] = {
      x, y, zoneId,
      terrainType: tileType,
      walkable: walkable
    };

    unsavedChanges = true;
    updateStatus('Tile updated');
    renderMapEditor();
    
    // Update live game map if in same zone
    const player = global.State?.getPlayer();
    if (player && player.currentZone === zoneId && global.WorldMapRender) {
      setTimeout(() => global.WorldMapRender.renderMap(), 100);
    }
  }

  /**
   * Fill zone with selected tile type
   */
  function fillZoneWithTile() {
    const zoneSelect = document.getElementById('adminZoneSelect');
    const zoneId = zoneSelect?.value;
    if (!zoneId) {
      alert('Please select a zone');
      return;
    }

    if (!confirm('This will replace all tiles in the zone. Continue?')) {
      return;
    }

    const zone = global.World?.getZone(zoneId);
    if (!zone) return;

    const tileType = selectedTileType;
    const walkable = document.getElementById('tileWalkable')?.checked ?? true;
    const worldData = global.World?.getWorldData();
    if (!worldData) return;

    for (let y = 0; y < zone.gridHeight; y++) {
      for (let x = 0; x < zone.gridWidth; x++) {
        const key = `${zoneId}_${x}_${y}`;
        worldData.tiles[key] = {
          x, y, zoneId,
          terrainType: tileType,
          walkable: walkable
        };
      }
    }

    unsavedChanges = true;
    updateStatus('Zone filled');
    renderMapEditor();
    
    // Update live game map if in same zone
    const player = global.State?.getPlayer();
    if (player && player.currentZone === zoneId && global.WorldMapRender) {
      setTimeout(() => global.WorldMapRender.renderMap(), 100);
    }
  }

  /**
   * Clear zone
   */
  function clearZone() {
    const zoneSelect = document.getElementById('adminZoneSelect');
    const zoneId = zoneSelect?.value;
    if (!zoneId) {
      alert('Please select a zone');
      return;
    }

    if (!confirm('This will clear all tiles in the zone. Continue?')) {
      return;
    }

    const zone = global.World?.getZone(zoneId);
    if (!zone) return;

    const worldData = global.World?.getWorldData();
    if (!worldData) return;

    for (let y = 0; y < zone.gridHeight; y++) {
      for (let x = 0; x < zone.gridWidth; x++) {
        const key = `${zoneId}_${x}_${y}`;
        delete worldData.tiles[key];
      }
    }

    unsavedChanges = true;
    updateStatus('Zone cleared');
    renderMapEditor();
    
    // Update live game map if in same zone
    const player = global.State?.getPlayer();
    if (player && player.currentZone === zoneId && global.WorldMapRender) {
      setTimeout(() => global.WorldMapRender.renderMap(), 100);
    }
  }

  /**
   * Render spawn editor
   */
  function renderSpawnEditor() {
    // Similar to map editor but for spawn points
    const canvas = document.getElementById('adminSpawnCanvas');
    if (!canvas) return;

    // Use spawn-specific zone selector or fall back to main one
    const zoneSelect = document.getElementById('adminZoneSelectSpawn') || document.getElementById('adminZoneSelect');
    const zoneId = zoneSelect?.value;
    if (!zoneId) {
      // Try to get current zone from player
      const player = global.State?.getPlayer();
      if (player && player.currentZone) {
        if (zoneSelect) zoneSelect.value = player.currentZone;
        return renderSpawnEditor(); // Retry with current zone
      }
      return;
    }

    const zone = global.World?.getZone(zoneId);
    if (!zone) return;

    const tiles = global.World?.getZoneTiles(zoneId) || [];
    const spawnGroups = Object.values(global.World?.getWorldData()?.spawnGroups || {})
      .filter(sg => sg.zoneId === zoneId);
    
    const tileSize = 20;
    canvas.width = zone.gridWidth * tileSize;
    canvas.height = zone.gridHeight * tileSize;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw tiles
    tiles.forEach(tile => {
      const x = tile.x * tileSize;
      const y = tile.y * tileSize;
      ctx.fillStyle = getTerrainColor(tile.terrainType);
      ctx.fillRect(x, y, tileSize, tileSize);
    });

    // Draw spawn points
    spawnGroups.forEach(spawnGroup => {
      if (spawnGroup.spawnPoints) {
        spawnGroup.spawnPoints.forEach((sp, idx) => {
          const x = sp.x * tileSize;
          const y = sp.y * tileSize;
          ctx.fillStyle = spawnGroup.spawnType === 'static' ? '#00ff00' : '#0000ff';
          ctx.beginPath();
          ctx.arc(x + tileSize / 2, y + tileSize / 2, tileSize / 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      }
    });

    // Click handler
    canvas.onclick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / tileSize);
      const y = Math.floor((e.clientY - rect.top) / tileSize);
      
      if (x >= 0 && x < zone.gridWidth && y >= 0 && y < zone.gridHeight) {
        addSpawnPoint(zoneId, x, y);
      }
    };

    canvas.oncontextmenu = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / tileSize);
      const y = Math.floor((e.clientY - rect.top) / tileSize);
      removeSpawnPoint(zoneId, x, y);
    };
  }

  /**
   * Add spawn point
   */
  function addSpawnPoint(zoneId, x, y) {
    const spawnGroupSelect = document.getElementById('spawnGroupSelect');
    const spawnGroupId = spawnGroupSelect?.value;
    
    if (!spawnGroupId) {
      alert('Please select or create a spawn group first');
      return;
    }

    const worldData = global.World?.getWorldData();
    if (!worldData) return;

    let spawnGroup = worldData.spawnGroups[spawnGroupId];
    if (!spawnGroup) {
      spawnGroup = {
        id: spawnGroupId,
        zoneId: zoneId,
        spawnType: 'static',
        maxConcurrent: 8,
        respawnSeconds: 300,
        mobTemplates: [],
        spawnPoints: []
      };
      worldData.spawnGroups[spawnGroupId] = spawnGroup;
    }

    if (!spawnGroup.spawnPoints) {
      spawnGroup.spawnPoints = [];
    }

    // Check if point already exists
    const exists = spawnGroup.spawnPoints.some(sp => sp.x === x && sp.y === y);
    if (exists) {
      return;
    }

    spawnGroup.spawnPoints.push({ x, y });
    unsavedChanges = true;
    updateStatus('Spawn point added');
    renderSpawnEditor();
    
    // Update live game map if in same zone
    const player = global.State?.getPlayer();
    if (player && player.currentZone === zoneId && global.WorldMapRender) {
      setTimeout(() => global.WorldMapRender.renderMap(), 100);
    }
  }

  /**
   * Remove spawn point
   */
  function removeSpawnPoint(zoneId, x, y) {
    const spawnGroupSelect = document.getElementById('spawnGroupSelect');
    const spawnGroupId = spawnGroupSelect?.value;
    
    if (!spawnGroupId) return;

    const worldData = global.World?.getWorldData();
    if (!worldData) return;

    const spawnGroup = worldData.spawnGroups[spawnGroupId];
    if (!spawnGroup || !spawnGroup.spawnPoints) return;

    spawnGroup.spawnPoints = spawnGroup.spawnPoints.filter(sp => !(sp.x === x && sp.y === y));
    unsavedChanges = true;
    updateStatus('Spawn point removed');
    renderSpawnEditor();
    
    // Update live game map if in same zone
    const player = global.State?.getPlayer();
    if (player && player.currentZone === zoneId && global.WorldMapRender) {
      setTimeout(() => global.WorldMapRender.renderMap(), 100);
    }
  }

  /**
   * Load spawn group
   */
  function loadSpawnGroup(spawnGroupId) {
    const worldData = global.World?.getWorldData();
    if (!worldData) return;

    const spawnGroup = worldData.spawnGroups[spawnGroupId];
    const propsDiv = document.getElementById('spawnGroupProps');
    
    if (!spawnGroup) {
      propsDiv.style.display = 'none';
      return;
    }

    propsDiv.style.display = 'block';
    document.getElementById('spawnGroupId').value = spawnGroup.id || '';
    document.getElementById('spawnTypeSelect').value = spawnGroup.spawnType || 'static';
    document.getElementById('spawnMaxConcurrent').value = spawnGroup.maxConcurrent || 8;
    document.getElementById('spawnRespawnSeconds').value = spawnGroup.respawnSeconds || 300;
    document.getElementById('spawnMobTemplates').value = (spawnGroup.mobTemplates || []).join(', ');

    selectedSpawnGroup = spawnGroup;
    renderSpawnEditor();
  }

  /**
   * Create spawn group
   */
  function createSpawnGroup() {
    const zoneSelect = document.getElementById('adminZoneSelectSpawn') || document.getElementById('adminZoneSelect');
    const zoneId = zoneSelect?.value;
    if (!zoneId) {
      alert('Please select a zone first');
      return;
    }

    const groupId = prompt('Enter spawn group ID:');
    if (!groupId) return;

    const worldData = global.World?.getWorldData();
    if (!worldData) return;

    if (worldData.spawnGroups[groupId]) {
      alert('Spawn group already exists');
      return;
    }

    worldData.spawnGroups[groupId] = {
      id: groupId,
      zoneId: zoneId,
      spawnType: 'static',
      maxConcurrent: 8,
      respawnSeconds: 300,
      mobTemplates: [],
      spawnPoints: []
    };

    loadSpawnGroups();
    document.getElementById('spawnGroupSelect').value = groupId;
    loadSpawnGroup(groupId);
    unsavedChanges = true;
    updateStatus('Spawn group created');
  }

  /**
   * Save spawn group
   */
  function saveSpawnGroup() {
    const spawnGroupId = document.getElementById('spawnGroupId')?.value;
    if (!spawnGroupId) {
      alert('Please create or select a spawn group');
      return;
    }

    const worldData = global.World?.getWorldData();
    if (!worldData) return;

    const spawnGroup = worldData.spawnGroups[spawnGroupId];
    if (!spawnGroup) return;

    spawnGroup.spawnType = document.getElementById('spawnTypeSelect')?.value || 'static';
    spawnGroup.maxConcurrent = parseInt(document.getElementById('spawnMaxConcurrent')?.value || '8');
    spawnGroup.respawnSeconds = parseInt(document.getElementById('spawnRespawnSeconds')?.value || '300');
    
    const mobTemplatesStr = document.getElementById('spawnMobTemplates')?.value || '';
    spawnGroup.mobTemplates = mobTemplatesStr.split(',').map(s => s.trim()).filter(s => s);

    unsavedChanges = true;
    updateStatus('Spawn group saved');
  }

  /**
   * Delete spawn group
   */
  function deleteSpawnGroup() {
    const spawnGroupId = document.getElementById('spawnGroupId')?.value;
    if (!spawnGroupId) return;

    if (!confirm(`Delete spawn group "${spawnGroupId}"?`)) {
      return;
    }

    const worldData = global.World?.getWorldData();
    if (!worldData) return;

    delete worldData.spawnGroups[spawnGroupId];
    loadSpawnGroups();
    document.getElementById('spawnGroupSelect').value = '';
    document.getElementById('spawnGroupProps').style.display = 'none';
    unsavedChanges = true;
    updateStatus('Spawn group deleted');
    renderSpawnEditor();
  }

  /**
   * Render zone line editor
   */
  function renderZoneLineEditor() {
    const canvas = document.getElementById('adminZoneLineCanvas');
    if (!canvas) return;

    const zoneSelect = document.getElementById('zoneLineFromZone');
    const zoneId = zoneSelect?.value;
    if (!zoneId) return;

    const zone = global.World?.getZone(zoneId);
    if (!zone) return;

    const tiles = global.World?.getZoneTiles(zoneId) || [];
    const tileSize = 20;
    canvas.width = zone.gridWidth * tileSize;
    canvas.height = zone.gridHeight * tileSize;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw tiles
    tiles.forEach(tile => {
      const x = tile.x * tileSize;
      const y = tile.y * tileSize;
      ctx.fillStyle = getTerrainColor(tile.terrainType);
      ctx.fillRect(x, y, tileSize, tileSize);
    });

    // Draw zone lines
    if (zone.neighboringZones) {
      zone.neighboringZones.forEach(neighborZoneId => {
        // Draw transition points (simplified - would need actual transition data)
        ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.beginPath();
        ctx.arc(zone.gridWidth * tileSize / 2, 0, tileSize / 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Click handler
    canvas.onclick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / tileSize);
      const y = Math.floor((e.clientY - rect.top) / tileSize);
      
      document.getElementById('zoneLineX').value = x;
      document.getElementById('zoneLineY').value = y;
    };
  }

  /**
   * Add zone line
   */
  function addZoneLine() {
    const fromZoneId = document.getElementById('zoneLineFromZone')?.value;
    const toZoneId = document.getElementById('zoneLineToZone')?.value;
    const x = parseInt(document.getElementById('zoneLineX')?.value || '0');
    const y = parseInt(document.getElementById('zoneLineY')?.value || '0');

    if (!fromZoneId || !toZoneId) {
      alert('Please select both zones');
      return;
    }

    const fromZone = global.World?.getZone(fromZoneId);
    if (!fromZone) return;

    if (!fromZone.neighboringZones) {
      fromZone.neighboringZones = [];
    }

    if (!fromZone.neighboringZones.includes(toZoneId)) {
      fromZone.neighboringZones.push(toZoneId);
    }

    // Store transition point (would need to extend zone data structure)
    unsavedChanges = true;
    updateStatus('Zone line added');
    renderZoneLineEditor();
  }

  /**
   * Render mob editor
   */
  function renderMobEditor() {
    // Mob list is already rendered in loadMobTemplates
  }

  /**
   * Filter mobs
   */
  function filterMobs(searchTerm) {
    const mobList = document.getElementById('mobList');
    if (!mobList) return;

    const mobItems = mobList.querySelectorAll('.mob-item');
    const term = searchTerm.toLowerCase();
    
    mobItems.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(term) ? 'block' : 'none';
    });
  }

  /**
   * Edit mob template
   */
  function editMobTemplate(mobId) {
    const worldData = global.World?.getWorldData();
    if (!worldData) return;

    const mob = worldData.mobTemplates[mobId];
    if (!mob) return;

    editingMob = mob;
    const propsDiv = document.getElementById('mobProperties');
    propsDiv.style.display = 'block';

    document.getElementById('mobId').value = mob.id || '';
    document.getElementById('mobName').value = mob.name || '';
    document.getElementById('mobLevelMin').value = mob.levelRange?.min || 1;
    document.getElementById('mobLevelMax').value = mob.levelRange?.max || 1;
    document.getElementById('mobHp').value = mob.baseStats?.maxHp || 0;
    document.getElementById('mobAtk').value = mob.baseStats?.atk || 0;
    document.getElementById('mobDef').value = mob.baseStats?.def || 0;
    document.getElementById('mobAgi').value = mob.baseStats?.agi || 0;
    document.getElementById('mobXp').value = mob.xp || 0;
    document.getElementById('mobGold').value = mob.gold || 0;
    document.getElementById('mobFactionId').value = mob.factionId || '';
    document.getElementById('mobLootTableId').value = mob.lootTableId || '';
    document.getElementById('mobIsGuard').checked = mob.isGuard || false;
  }

  /**
   * Create mob template
   */
  function createMobTemplate() {
    const mobId = prompt('Enter mob template ID:');
    if (!mobId) return;

    const worldData = global.World?.getWorldData();
    if (!worldData) return;

    if (worldData.mobTemplates[mobId]) {
      alert('Mob template already exists');
      return;
    }

    worldData.mobTemplates[mobId] = {
      id: mobId,
      name: mobId,
      levelRange: { min: 1, max: 1 },
      baseStats: { maxHp: 20, atk: 5, def: 2, agi: 50 },
      xp: 10,
      gold: 5,
      isGuard: false
    };

    loadMobTemplates();
    editMobTemplate(mobId);
    unsavedChanges = true;
    updateStatus('Mob template created');
  }

  /**
   * Save mob template
   */
  function saveMobTemplate() {
    if (!editingMob) {
      alert('No mob selected');
      return;
    }

    const worldData = global.World?.getWorldData();
    if (!worldData) return;

    editingMob.name = document.getElementById('mobName')?.value || editingMob.id;
    editingMob.levelRange = {
      min: parseInt(document.getElementById('mobLevelMin')?.value || '1'),
      max: parseInt(document.getElementById('mobLevelMax')?.value || '1')
    };
    editingMob.baseStats = {
      maxHp: parseInt(document.getElementById('mobHp')?.value || '20'),
      atk: parseInt(document.getElementById('mobAtk')?.value || '5'),
      def: parseInt(document.getElementById('mobDef')?.value || '2'),
      agi: parseInt(document.getElementById('mobAgi')?.value || '50')
    };
    editingMob.xp = parseInt(document.getElementById('mobXp')?.value || '10');
    editingMob.gold = parseInt(document.getElementById('mobGold')?.value || '5');
    editingMob.factionId = document.getElementById('mobFactionId')?.value || null;
    editingMob.lootTableId = document.getElementById('mobLootTableId')?.value || null;
    editingMob.isGuard = document.getElementById('mobIsGuard')?.checked || false;

    unsavedChanges = true;
    updateStatus('Mob template saved');
    loadMobTemplates();
  }

  /**
   * Delete mob template
   */
  function deleteMobTemplate() {
    if (!editingMob) {
      alert('No mob selected');
      return;
    }

    if (!confirm(`Delete mob template "${editingMob.name}"?`)) {
      return;
    }

    const worldData = global.World?.getWorldData();
    if (!worldData) return;

    delete worldData.mobTemplates[editingMob.id];
    editingMob = null;
    document.getElementById('mobProperties').style.display = 'none';
    loadMobTemplates();
    unsavedChanges = true;
    updateStatus('Mob template deleted');
  }

  /**
   * Render patrol editor
   */
  function renderPatrolEditor() {
    const canvas = document.getElementById('adminPatrolCanvas');
    if (!canvas) return;

    const zoneSelect = document.getElementById('patrolZoneId');
    const zoneId = zoneSelect?.value;
    if (!zoneId) return;

    const zone = global.World?.getZone(zoneId);
    if (!zone) return;

    const tiles = global.World?.getZoneTiles(zoneId) || [];
    const tileSize = 20;
    canvas.width = zone.gridWidth * tileSize;
    canvas.height = zone.gridHeight * tileSize;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw tiles
    tiles.forEach(tile => {
      const x = tile.x * tileSize;
      const y = tile.y * tileSize;
      ctx.fillStyle = getTerrainColor(tile.terrainType);
      ctx.fillRect(x, y, tileSize, tileSize);
    });

    // Draw patrol routes if editing
    if (editingPatrol && editingPatrol.patrolRoutes) {
      editingPatrol.patrolRoutes.forEach(route => {
        if (route.waypoints && route.waypoints.length > 0) {
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 2;
          ctx.beginPath();
          route.waypoints.forEach((wp, idx) => {
            const x = wp.x * tileSize + tileSize / 2;
            const y = wp.y * tileSize + tileSize / 2;
            if (idx === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          });
          ctx.stroke();

          // Draw waypoints
          route.waypoints.forEach(wp => {
            const x = wp.x * tileSize + tileSize / 2;
            const y = wp.y * tileSize + tileSize / 2;
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.arc(x, y, tileSize / 4, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      });
    }

    // Click handler
    canvas.onclick = (e) => {
      if (!editingPatrol) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / tileSize);
      const y = Math.floor((e.clientY - rect.top) / tileSize);
      
      addPatrolWaypoint(x, y);
    };
  }

  /**
   * Add patrol waypoint
   */
  function addPatrolWaypoint(x, y) {
    if (!editingPatrol) return;

    if (!editingPatrol.patrolRoutes || editingPatrol.patrolRoutes.length === 0) {
      editingPatrol.patrolRoutes = [{
        id: 'patrol_1',
        waypoints: [],
        speed: 1,
        pauseAtWaypoint: 5000
      }];
    }

    const route = editingPatrol.patrolRoutes[0];
    if (!route.waypoints) {
      route.waypoints = [];
    }

    route.waypoints.push({ x, y });
    unsavedChanges = true;
    updateStatus('Waypoint added');
    renderPatrolEditor();
    updatePatrolWaypointsList();
  }

  /**
   * Update patrol waypoints list
   */
  function updatePatrolWaypointsList() {
    const waypointsDiv = document.getElementById('patrolWaypoints');
    if (!waypointsDiv || !editingPatrol) return;

    const route = editingPatrol.patrolRoutes?.[0];
    if (!route || !route.waypoints) {
      waypointsDiv.innerHTML = '<p>No waypoints</p>';
      return;
    }

    waypointsDiv.innerHTML = route.waypoints.map((wp, idx) => `
      <div class="waypoint-item">
        ${idx + 1}. (${wp.x}, ${wp.y})
        <button class="admin-btn-small" onclick="window.AdminPanel.removePatrolWaypoint(${idx})">Remove</button>
      </div>
    `).join('');
  }

  /**
   * Remove patrol waypoint
   */
  function removePatrolWaypoint(index) {
    if (!editingPatrol || !editingPatrol.patrolRoutes?.[0]) return;

    editingPatrol.patrolRoutes[0].waypoints.splice(index, 1);
    unsavedChanges = true;
    updateStatus('Waypoint removed');
    renderPatrolEditor();
    updatePatrolWaypointsList();
  }

  /**
   * Create patrol group
   */
  function createPatrolGroup() {
    const patrolId = prompt('Enter patrol group ID:');
    if (!patrolId) return;

    const zoneId = document.getElementById('patrolZoneId')?.value;
    if (!zoneId) {
      alert('Please select a zone first');
      return;
    }

    editingPatrol = {
      id: patrolId,
      zoneId: zoneId,
      guardTemplateId: '',
      patrolRoutes: [{
        id: 'patrol_1',
        waypoints: [],
        speed: 1,
        pauseAtWaypoint: 5000
      }]
    };

    document.getElementById('patrolProps').style.display = 'block';
    document.getElementById('patrolGuardTemplateId').value = '';
    document.getElementById('patrolSpeed').value = '1';
    document.getElementById('patrolPause').value = '5000';
    updatePatrolWaypointsList();
    renderPatrolEditor();
    unsavedChanges = true;
    updateStatus('Patrol group created');
  }

  /**
   * Save patrol group
   */
  function savePatrolGroup() {
    if (!editingPatrol) {
      alert('No patrol group selected');
      return;
    }

    editingPatrol.guardTemplateId = document.getElementById('patrolGuardTemplateId')?.value || '';
    if (editingPatrol.patrolRoutes?.[0]) {
      editingPatrol.patrolRoutes[0].speed = parseFloat(document.getElementById('patrolSpeed')?.value || '1');
      editingPatrol.patrolRoutes[0].pauseAtWaypoint = parseInt(document.getElementById('patrolPause')?.value || '5000');
    }

    // Save to REALM.data.guardPatrols
    if (!global.REALM.data.guardPatrols) {
      global.REALM.data.guardPatrols = [];
    }

    const index = global.REALM.data.guardPatrols.findIndex(p => p.id === editingPatrol.id);
    if (index >= 0) {
      global.REALM.data.guardPatrols[index] = editingPatrol;
    } else {
      global.REALM.data.guardPatrols.push(editingPatrol);
    }

    loadPatrolGroups();
    unsavedChanges = true;
    updateStatus('Patrol group saved');
  }

  /**
   * Delete patrol group
   */
  function deletePatrolGroup() {
    if (!editingPatrol) {
      alert('No patrol group selected');
      return;
    }

    if (!confirm(`Delete patrol group "${editingPatrol.id}"?`)) {
      return;
    }

    if (global.REALM.data.guardPatrols) {
      global.REALM.data.guardPatrols = global.REALM.data.guardPatrols.filter(p => p.id !== editingPatrol.id);
    }

    editingPatrol = null;
    document.getElementById('patrolProps').style.display = 'none';
    loadPatrolGroups();
    unsavedChanges = true;
    updateStatus('Patrol group deleted');
  }

  /**
   * Save all changes and apply live
   */
  async function saveAll() {
    if (!unsavedChanges) {
      updateStatus('No changes to save');
      return;
    }

    if (!confirm('This will apply changes to the live game. Continue?')) {
      return;
    }

    updateStatus('Saving and applying changes...');

    try {
      const worldData = global.World?.getWorldData();
      if (!worldData) {
        throw new Error('World data not available');
      }

      // Apply changes live to the game
      applyChangesLive(worldData);

      // Convert to arrays for JSON files
      const zones = Object.values(worldData.zones);
      const spawnGroups = Object.values(worldData.spawnGroups);
      const mobTemplates = Object.values(worldData.mobTemplates);

      // Save zones
      await saveJSONFile('data/world-zones.json', zones);
      
      // Save spawn groups
      await saveJSONFile('data/spawn-groups.json', spawnGroups);
      
      // Save mob templates
      await saveJSONFile('data/mob-templates.json', mobTemplates);
      
      // Save guard patrols
      if (global.REALM.data.guardPatrols) {
        await saveJSONFile('data/guard-patrols.json', global.REALM.data.guardPatrols);
      }

      unsavedChanges = false;
      updateStatus('All changes saved and applied live!');
      
      // Show success message
      if (global.Toast) {
        global.Toast.show({
          type: 'success',
          title: 'Changes Applied',
          text: 'All changes have been saved and applied to the live game.'
        });
      }
    } catch (error) {
      console.error('Save error:', error);
      updateStatus('Error saving: ' + error.message);
      alert('Error saving changes: ' + error.message);
    }
  }

  /**
   * Apply changes live to the game without restart
   */
  function applyChangesLive(worldData) {
    // Regenerate tiles for all zones (preserving manual edits)
    if (global.World && typeof global.World.generateZoneTiles === 'function') {
      Object.values(worldData.zones).forEach(zone => {
        global.World.generateZoneTiles(zone.id);
      });
    } else {
      // Fallback: regenerate tiles manually
      regenerateAllTiles(worldData);
    }

    // Update spawn system for current zone
    const player = global.State?.getPlayer();
    if (player && player.currentZone && global.SpawnSystem) {
      // Clear current spawns
      global.SpawnSystem.clearZone();
      // Reinitialize with new spawn data
      global.SpawnSystem.initializeZone(player.currentZone);
    }

    // Update guard system
    if (global.GuardSystem && typeof global.GuardSystem.reloadPatrols === 'function') {
      global.GuardSystem.reloadPatrols();
    }

    // Update mob templates in REALM.data
    if (global.REALM && global.REALM.data) {
      // Update monstersById lookup
      if (!global.REALM.data.monstersById) {
        global.REALM.data.monstersById = {};
      }
      Object.values(worldData.mobTemplates).forEach(mob => {
        global.REALM.data.monstersById[mob.id.toLowerCase()] = mob;
      });
    }

    // Re-render map
    if (global.WorldMapRender && typeof global.WorldMapRender.renderMap === 'function') {
      setTimeout(() => {
        global.WorldMapRender.renderMap();
      }, 100);
    }

    // Update zone data in REALM.data
    if (global.REALM && global.REALM.data) {
      if (!global.REALM.data.zonesById) {
        global.REALM.data.zonesById = {};
      }
      Object.values(worldData.zones).forEach(zone => {
        global.REALM.data.zonesById[zone.id.toLowerCase()] = zone;
      });
    }

    console.log('[AdminPanel] Changes applied live to game');
  }

  /**
   * Regenerate all tiles for zones
   */
  function regenerateAllTiles(worldData) {
    if (!worldData.tiles) {
      worldData.tiles = {};
    }

    Object.values(worldData.zones).forEach(zone => {
      for (let y = 0; y < zone.gridHeight; y++) {
        for (let x = 0; x < zone.gridWidth; x++) {
          const key = `${zone.id}_${x}_${y}`;
          const existingTile = worldData.tiles[key];
          
          // If tile was manually edited, preserve it
          if (existingTile && existingTile.terrainType) {
            // Keep existing tile
            continue;
          }
          
          // Otherwise, regenerate based on zone type
          const tile = createTileForZone(zone, x, y, worldData);
          worldData.tiles[key] = tile;
        }
      }
    });
  }

  /**
   * Create a tile for a zone (helper function)
   */
  function createTileForZone(zone, x, y, worldData) {
    const { type, id: zoneId } = zone;
    let terrainType = 'grass';
    let walkable = true;
    let spawnGroupId = null;
    let guardPathNodeId = null;

    if (type === 'city') {
      const isWall = x === 0 || x === zone.gridWidth - 1 || y === 0 || y === zone.gridHeight - 1;
      const isStreet = (x % 5 === 0) || (y % 5 === 0) || (x === Math.floor(zone.gridWidth / 2)) || (y === Math.floor(zone.gridHeight / 2));
      const isBuilding = !isWall && !isStreet && Math.random() > 0.3;

      if (isWall) {
        terrainType = 'wall';
        walkable = false;
      } else if (isStreet) {
        terrainType = 'city_street';
        walkable = true;
      } else if (isBuilding) {
        terrainType = 'building';
        walkable = false;
      } else {
        terrainType = 'city_plaza';
        walkable = true;
      }
    } else if (type === 'outdoor') {
      const distanceFromCenter = Math.sqrt(Math.pow(x - zone.gridWidth / 2, 2) + Math.pow(y - zone.gridHeight / 2, 2));
      const maxDistance = Math.sqrt(Math.pow(zone.gridWidth / 2, 2) + Math.pow(zone.gridHeight / 2, 2));

      if (distanceFromCenter / maxDistance > 0.9) {
        terrainType = Math.random() > 0.7 ? 'water' : 'rock';
        walkable = terrainType !== 'water' && terrainType !== 'rock';
      } else if ((x + y) % 8 === 0) {
        terrainType = 'path';
        walkable = true;
      } else if (Math.random() > 0.85) {
        terrainType = 'tree';
        walkable = false;
      } else {
        terrainType = 'grass';
        walkable = true;
      }
    } else if (type === 'dungeon') {
      const isWall = x === 0 || x === zone.gridWidth - 1 || y === 0 || y === zone.gridHeight - 1 || (x % 3 === 0 && y % 3 === 0);
      terrainType = isWall ? 'dungeon_wall' : 'dungeon_floor';
      walkable = !isWall;
    }

    // Check for spawn points
    const spawnGroup = Object.values(worldData.spawnGroups || {}).find(sg => {
      if (sg.zoneId !== zoneId) return false;
      return sg.spawnPoints && sg.spawnPoints.some(sp => sp.x === x && sp.y === y);
    });
    if (spawnGroup) {
      spawnGroupId = spawnGroup.id;
    }

    return {
      x,
      y,
      zoneId,
      terrainType,
      walkable,
      spawnGroupId: spawnGroupId || undefined,
      guardPathNodeId: guardPathNodeId || undefined
    };
  }

  /**
   * Save JSON file (client-side download or backend API)
   */
  async function saveJSONFile(filename, data) {
    const json = JSON.stringify(data, null, 2);
    
    // Try to save via backend API if available
    const API_BASE_URL = window.REALM_API_URL || '';
    if (API_BASE_URL) {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/save-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...global.Auth?.getAuthHeaders()
          },
          body: JSON.stringify({
            filename: filename,
            data: data
          })
        });

        if (response.ok) {
          console.log(`Saved ${filename} via API`);
          return;
        }
      } catch (error) {
        console.warn('API save failed, falling back to download:', error);
      }
    }

    // Fallback: Download file for manual upload
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`Downloaded ${filename} - please upload to server manually`);
    updateStatus(`Downloaded ${filename} - upload to server to apply changes`);
  }

  /**
   * Reload data
   */
  function reloadData() {
    if (unsavedChanges && !confirm('You have unsaved changes. Reload anyway?')) {
      return;
    }

    location.reload();
  }

  /**
   * Update status message
   */
  function updateStatus(message) {
    const statusDiv = document.getElementById('adminStatus');
    if (statusDiv) {
      statusDiv.textContent = message;
      if (unsavedChanges) {
        statusDiv.textContent += ' (Unsaved changes)';
        statusDiv.style.color = '#ffaa00';
      } else {
        statusDiv.style.color = '#fff';
      }
    }
  }

  /**
   * Show admin panel
   */
  function show() {
    if (!global.AdminUtils) {
      console.error('[AdminPanel] AdminUtils not available');
      alert('Admin system not initialized. Please refresh the page.');
      return;
    }

    if (!global.AdminUtils.isAdmin()) {
      const status = global.AdminUtils.getAdminStatus();
      console.log('[AdminPanel] Access denied. Status:', status);
      alert('You do not have admin privileges.\n\nCharacter: ' + (status.characterName || 'N/A') + '\nUsername: ' + (status.username || 'N/A') + '\nEmail: ' + (status.email || 'N/A'));
      return;
    }

    if (!adminPanel) {
      createAdminPanel();
    }

    if (!adminPanel) {
      console.error('[AdminPanel] Failed to create admin panel');
      return;
    }

    adminPanel.style.display = 'block';
    isOpen = true;
    loadData();
    switchTab('map');
    console.log('[AdminPanel] Admin panel opened');
  }

  /**
   * Close admin panel
   */
  function close() {
    if (adminPanel) {
      if (unsavedChanges && !confirm('You have unsaved changes. Close anyway?')) {
        return;
      }
      adminPanel.style.display = 'none';
      isOpen = false;
    }
  }

  /**
   * Add admin button to UI
   */
  function addAdminButton() {
    // Check if button already exists
    if (document.getElementById('adminPanelBtn')) {
      return;
    }

    // Only add if user is admin
    if (!global.AdminUtils?.isAdmin()) {
      return;
    }

    const button = document.createElement('button');
    button.id = 'adminPanelBtn';
    button.className = 'admin-panel-btn';
    button.textContent = 'Admin';
    button.onclick = () => show();
    button.title = 'Open Admin Panel';

    // Add to UI - place in header or body
    const header = document.querySelector('.app-header');
    if (header) {
      header.appendChild(button);
    } else {
      document.body.appendChild(button);
    }
  }

  /**
   * Check admin status and show button
   */
  function checkAndShowAdminButton() {
    if (!global.AdminUtils) {
      console.log('[AdminPanel] AdminUtils not available yet');
      return;
    }

    const isAdmin = global.AdminUtils.isAdmin();
    const status = global.AdminUtils.getAdminStatus();
    console.log('[AdminPanel] Admin check:', isAdmin, status);

    if (isAdmin) {
      addAdminButton();
    } else {
      // Remove button if not admin
      const btn = document.getElementById('adminPanelBtn');
      if (btn) {
        btn.remove();
        console.log('[AdminPanel] Removed admin button - not admin');
      }
    }
  }

  // Initialize on load - check multiple times to catch when player state is ready
  function delayedInit() {
    checkAndShowAdminButton();
    
    // Also check when player state changes
    if (global.State) {
      const originalUpdatePlayer = global.State.updatePlayer;
      if (originalUpdatePlayer && !global.State._adminPanelHooked) {
        global.State.updatePlayer = function(...args) {
          originalUpdatePlayer.apply(this, args);
          setTimeout(checkAndShowAdminButton, 100);
        };
        global.State._adminPanelHooked = true;
      }
    }
  }

  // Keyboard shortcut: Ctrl+Shift+A to open admin panel
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      if (global.AdminUtils?.isAdmin()) {
        if (isOpen) {
          close();
        } else {
          show();
        }
      }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(delayedInit, 500);
      // Check again after game initialization
      setTimeout(delayedInit, 2000);
      setTimeout(delayedInit, 5000);
    });
  } else {
    setTimeout(delayedInit, 500);
    setTimeout(delayedInit, 2000);
    setTimeout(delayedInit, 5000);
  }

  // Also check periodically
  setInterval(checkAndShowAdminButton, 5000);

  const AdminPanel = {
    show,
    close,
    saveAll,
    reloadData,
    fillZoneWithTile,
    clearZone,
    createSpawnGroup,
    saveSpawnGroup,
    deleteSpawnGroup,
    addZoneLine,
    createMobTemplate,
    editMobTemplate,
    saveMobTemplate,
    deleteMobTemplate,
    filterMobs,
    createPatrolGroup,
    savePatrolGroup,
    deletePatrolGroup,
    addPatrolWaypoint,
    removePatrolWaypoint
  };

  global.AdminPanel = AdminPanel;
})(window);

