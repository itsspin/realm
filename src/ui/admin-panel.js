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
  let editingQuest = null;
  let editingLootTable = null;
  let unsavedChanges = false;
  let backupData = null; // For undo functionality

  /**
   * Initialize admin panel
   */
  function initialize() {
    // Don't check admin status here - let checkAndShowAdminButton handle it
    // Just set up the initialization checks
    console.log('[AdminPanel] Initializing admin panel system');
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
          <button class="admin-tab" data-tab="quests">Quest Editor</button>
          <button class="admin-tab" data-tab="loot">Loot Tables</button>
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
              
              <h4 style="margin-top: 1.5rem; color: var(--gold-bright);">Map Generation</h4>
              <div class="map-gen-controls">
                <label>Generate Type:</label>
                <select id="mapGenType">
                  <option value="city">City (with streets & buildings)</option>
                  <option value="outdoor">Outdoor (with paths & roads)</option>
                  <option value="dungeon">Dungeon (with corridors)</option>
                  <option value="fantasy">Fantasy Map (rivers, forests, roads)</option>
                </select>
                <label>Road/Path Width:</label>
                <input type="number" id="mapGenRoadWidth" value="2" min="1" max="5">
                <label>Building Density (0-100):</label>
                <input type="number" id="mapGenBuildingDensity" value="30" min="0" max="100">
                <label>Add Main Roads:</label>
                <input type="checkbox" id="mapGenMainRoads" checked>
                <label>Add Side Paths:</label>
                <input type="checkbox" id="mapGenSidePaths" checked>
                <button class="admin-btn" onclick="window.AdminPanel.generateMap()">Generate Map</button>
                <button class="admin-btn" onclick="window.AdminPanel.generateFantasyMap()">Generate Fantasy Map</button>
              </div>
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

        <!-- Quests Tab -->
        <div class="admin-tab-content" data-content="quests">
          <div class="admin-quest-editor">
            <div class="admin-quest-list">
              <h3>Quest Editor</h3>
              <div class="quest-selector">
                <label>NPC/Mob:</label>
                <select id="questNpcSelect">
                  <option value="">-- Select NPC/Mob --</option>
                </select>
                <button class="admin-btn" onclick="window.AdminPanel.createQuest()">Create New Quest</button>
              </div>
              <div class="quest-list" id="questList"></div>
            </div>
            <div class="admin-quest-properties" id="questProperties" style="display: none;">
              <h3>Edit Quest</h3>
              <div class="quest-props-form">
                <label>Quest ID:</label>
                <input type="text" id="questId" placeholder="unique_quest_id">
                <label>Quest Title:</label>
                <input type="text" id="questTitle" placeholder="Quest Title">
                <label>Quest Description:</label>
                <textarea id="questDescription" rows="3" placeholder="Quest description shown to players"></textarea>
                <label>Quest Type:</label>
                <select id="questType">
                  <option value="kill">Kill Quest</option>
                  <option value="turnin">Turn-in Quest</option>
                </select>
                <div id="questKillProps">
                  <label>Target Mob ID:</label>
                  <input type="text" id="questTargetMob" placeholder="goblin_scout">
                  <label>Target Count:</label>
                  <input type="number" id="questTargetCount" value="1" min="1">
                </div>
                <div id="questTurninProps" style="display: none;">
                  <label>Required Items (comma-separated):</label>
                  <input type="text" id="questRequiredItems" placeholder="item1, item2">
                  <label>Item Counts (JSON, e.g. {"item1": 5, "item2": 1}):</label>
                  <textarea id="questItemCounts" rows="2" placeholder='{"item1": 5, "item2": 1}'></textarea>
                </div>
                <label>Rewards:</label>
                <div class="quest-rewards">
                  <label>XP:</label>
                  <input type="number" id="questRewardXp" value="0" min="0">
                  <label>Gold:</label>
                  <input type="number" id="questRewardGold" value="0" min="0">
                  <label>Items (comma-separated):</label>
                  <input type="text" id="questRewardItems" placeholder="item1, item2">
                </div>
                <label>Prerequisites (comma-separated quest IDs):</label>
                <input type="text" id="questPrerequisites" placeholder="quest1, quest2">
                <label>NPC ID (for turn-in quests):</label>
                <input type="text" id="questNpcId" placeholder="npc_id">
                <label>Quest Dialogue:</label>
                <textarea id="questDialogue" rows="3" placeholder="What the NPC says when offering the quest"></textarea>
                <button class="admin-btn" onclick="window.AdminPanel.saveQuest()">Save Quest</button>
                <button class="admin-btn admin-btn-danger" onclick="window.AdminPanel.deleteQuest()">Delete Quest</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Loot Tables Tab -->
        <div class="admin-tab-content" data-content="loot">
          <div class="admin-loot-editor">
            <div class="admin-loot-list">
              <h3>Loot Table Editor</h3>
              <div class="loot-selector">
                <label>Loot Table:</label>
                <select id="lootTableSelect">
                  <option value="">-- Create New --</option>
                </select>
                <button class="admin-btn" onclick="window.AdminPanel.createLootTable()">New Loot Table</button>
              </div>
              <div class="loot-list" id="lootList"></div>
            </div>
            <div class="admin-loot-properties" id="lootProperties" style="display: none;">
              <h3>Edit Loot Table</h3>
              <div class="loot-props-form">
                <label>Loot Table ID:</label>
                <input type="text" id="lootTableId" readonly>
                <label>Loot Table Name:</label>
                <input type="text" id="lootTableName" placeholder="Loot Table Name">
                <h4>Loot Entries</h4>
                <div id="lootEntriesList"></div>
                <button class="admin-btn" onclick="window.AdminPanel.addLootEntry()">Add Entry</button>
                <button class="admin-btn" onclick="window.AdminPanel.saveLootTable()">Save Loot Table</button>
                <button class="admin-btn admin-btn-danger" onclick="window.AdminPanel.deleteLootTable()">Delete Loot Table</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="admin-panel-footer">
        <div class="admin-status" id="adminStatus">Ready</div>
        <div class="admin-actions">
          <button class="admin-btn" id="undoBtn" onclick="window.AdminPanel.undoChanges()" style="display: none;">Undo Last Save</button>
          <button class="admin-btn admin-btn-primary" onclick="window.AdminPanel.saveAll()">Save All Changes (Live)</button>
          <button class="admin-btn" onclick="window.AdminPanel.reloadData()">Reload Data</button>
        </div>
      </div>
    `;

    document.body.appendChild(adminPanel);
    setupEventListeners();
    loadData();
    
    // Also set up button handlers directly (in case onclick doesn't work)
    setTimeout(() => {
      setupButtonHandlers();
    }, 100);
  }

  /**
   * Setup button handlers directly (fallback for onclick issues)
   * This ensures buttons work even if onclick handlers fail
   */
  function setupButtonHandlers() {
    if (!adminPanel) return;

    // Map editor buttons
    const fillBtn = adminPanel.querySelector('button[onclick*="fillZoneWithTile"]');
    if (fillBtn) {
      fillBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[AdminPanel] Fill button clicked');
        fillZoneWithTile();
      });
      fillBtn.onclick = null; // Remove onclick to use addEventListener instead
    }

    const clearBtn = adminPanel.querySelector('button[onclick*="clearZone"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[AdminPanel] Clear button clicked');
        clearZone();
      });
      clearBtn.onclick = null;
    }

    const genMapBtn = adminPanel.querySelector('button[onclick*="generateMap"]');
    if (genMapBtn) {
      genMapBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[AdminPanel] Generate Map button clicked');
        generateMap();
      });
      genMapBtn.onclick = null;
    }

    const genFantasyBtn = adminPanel.querySelector('button[onclick*="generateFantasyMap"]');
    if (genFantasyBtn) {
      genFantasyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[AdminPanel] Generate Fantasy Map button clicked');
        generateFantasyMap();
      });
      genFantasyBtn.onclick = null;
    }

    const saveBtn = adminPanel.querySelector('button[onclick*="saveAll"]');
    if (saveBtn) {
      saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[AdminPanel] Save All button clicked');
        await saveAll();
      });
      saveBtn.onclick = null;
    }

    const reloadBtn = adminPanel.querySelector('button[onclick*="reloadData"]');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[AdminPanel] Reload Data button clicked');
        reloadData();
      });
      reloadBtn.onclick = null;
    }

    const undoBtn = adminPanel.querySelector('button[onclick*="undoChanges"]');
    if (undoBtn) {
      undoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[AdminPanel] Undo button clicked');
        undoChanges();
      });
      undoBtn.onclick = null;
    }

    // Close button
    const closeBtn = adminPanel.querySelector('.admin-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[AdminPanel] Close button clicked');
        close();
      });
      closeBtn.onclick = null;
    }

    console.log('[AdminPanel] Button handlers set up');
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

    // Quest type selector
    const questTypeSelect = document.getElementById('questType');
    if (questTypeSelect) {
      questTypeSelect.addEventListener('change', (e) => {
        const type = e.target.value;
        const killProps = document.getElementById('questKillProps');
        const turninProps = document.getElementById('questTurninProps');
        if (killProps) killProps.style.display = type === 'kill' ? 'block' : 'none';
        if (turninProps) turninProps.style.display = type === 'turnin' ? 'block' : 'none';
      });
    }

    // Loot table selector
    const lootTableSelect = document.getElementById('lootTableSelect');
    if (lootTableSelect) {
      lootTableSelect.addEventListener('change', (e) => {
        if (e.target.value) {
          editLootTable(e.target.value);
        }
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
      } else if (tabName === 'quests') {
        renderQuestEditor();
      } else if (tabName === 'loot') {
        renderLootEditor();
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
    loadQuests();
    loadLootTables();
    loadNPCsForQuests();
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
    if (!canvas) {
      console.warn('[AdminPanel] Canvas not found');
      return;
    }

    const zoneSelect = document.getElementById('adminZoneSelect');
    const zoneId = zoneSelect?.value;
    if (!zoneId) {
      console.warn('[AdminPanel] No zone selected');
      return;
    }

    const zone = global.World?.getZone(zoneId);
    if (!zone) {
      console.warn('[AdminPanel] Zone not found:', zoneId);
      return;
    }

    const worldData = global.World?.getWorldData();
    if (!worldData) {
      console.error('[AdminPanel] World data not available');
      return;
    }

    const tileSize = 20;
    canvas.width = zone.gridWidth * tileSize;
    canvas.height = zone.gridHeight * tileSize;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw tiles directly from worldData.tiles (more reliable than getZoneTiles)
    let tilesDrawn = 0;
    for (let y = 0; y < zone.gridHeight; y++) {
      for (let x = 0; x < zone.gridWidth; x++) {
        const key = `${zoneId}_${x}_${y}`;
        let tile = worldData.tiles[key];
        
        // If tile doesn't exist, create a default one for display (but don't save it)
        if (!tile) {
          // Show empty/undefined tiles as dark gray
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 1;
          ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
          continue;
        }

        const screenX = x * tileSize;
        const screenY = y * tileSize;
        const color = getTerrainColor(tile.terrainType);
        
        ctx.fillStyle = color;
        ctx.fillRect(screenX, screenY, tileSize, tileSize);
        
        if (!tile.walkable) {
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX, screenY, tileSize, tileSize);
        }
        tilesDrawn++;
      }
    }
    
    console.log('[AdminPanel] Rendered', tilesDrawn, 'tiles for zone', zoneId);

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
    try {
      console.log('[AdminPanel] fillZoneWithTile called');
      const zoneSelect = document.getElementById('adminZoneSelect');
      if (!zoneSelect) {
        console.error('[AdminPanel] Zone select not found');
        alert('Zone selector not found. Please refresh the admin panel.');
        return;
      }
      
      const zoneId = zoneSelect.value;
      if (!zoneId) {
        alert('Please select a zone first');
        return;
      }

      if (!confirm('This will replace all tiles in the zone. Continue?')) {
        return;
      }

      const zone = global.World?.getZone(zoneId);
      if (!zone) {
        alert('Zone not found: ' + zoneId);
        return;
      }

      const tileTypeSelect = document.getElementById('tileTypeSelect');
      const tileType = tileTypeSelect?.value || selectedTileType || 'grass';
      const walkableCheckbox = document.getElementById('tileWalkable');
      const walkable = walkableCheckbox ? walkableCheckbox.checked : true;
      
      const worldData = global.World?.getWorldData();
      if (!worldData) {
        alert('World data not available. Is the World system initialized?');
        console.error('[AdminPanel] World.getWorldData() returned:', worldData);
        return;
      }

      if (!worldData.tiles) {
        worldData.tiles = {};
      }

      console.log('[AdminPanel] Filling zone', zoneId, 'with', zone.gridWidth, 'x', zone.gridHeight, 'tiles');
      let tileCount = 0;
      for (let y = 0; y < zone.gridHeight; y++) {
        for (let x = 0; x < zone.gridWidth; x++) {
          const key = `${zoneId}_${x}_${y}`;
          worldData.tiles[key] = {
            x, y, zoneId,
            terrainType: tileType,
            walkable: walkable
          };
          tileCount++;
        }
      }

      console.log('[AdminPanel] Created', tileCount, 'tiles');
      unsavedChanges = true;
      updateStatus(`Zone filled with ${tileCount} tiles`);
      
      // Force re-render
      setTimeout(() => {
        renderMapEditor();
        console.log('[AdminPanel] Zone filled, total tiles in worldData:', Object.keys(worldData.tiles).filter(k => k.startsWith(zoneId)).length);
      }, 50);
      
      // Update live game map if in same zone
      const player = global.State?.getPlayer();
      if (player && player.currentZone === zoneId && global.WorldMapRender) {
        setTimeout(() => global.WorldMapRender.renderMap(), 100);
      }
    } catch (error) {
      console.error('[AdminPanel] Error in fillZoneWithTile:', error);
      alert('Error filling zone: ' + error.message);
    }
  }

  /**
   * Clear zone
   */
  function clearZone() {
    try {
      console.log('[AdminPanel] clearZone called');
      const zoneSelect = document.getElementById('adminZoneSelect');
      if (!zoneSelect) {
        alert('Zone selector not found');
        return;
      }
      
      const zoneId = zoneSelect.value;
      if (!zoneId) {
        alert('Please select a zone first');
        return;
      }

      if (!confirm('This will clear all tiles in the zone. Continue?')) {
        return;
      }

      const zone = global.World?.getZone(zoneId);
      if (!zone) {
        alert('Zone not found: ' + zoneId);
        return;
      }

      const worldData = global.World?.getWorldData();
      if (!worldData) {
        alert('World data not available. Is the World system initialized?');
        console.error('[AdminPanel] World.getWorldData() returned:', worldData);
        return;
      }

      if (!worldData.tiles) {
        worldData.tiles = {};
      }

      let deletedCount = 0;
      for (let y = 0; y < zone.gridHeight; y++) {
        for (let x = 0; x < zone.gridWidth; x++) {
          const key = `${zoneId}_${x}_${y}`;
          if (worldData.tiles[key]) {
            delete worldData.tiles[key];
            deletedCount++;
          }
        }
      }

      console.log('[AdminPanel] Deleted', deletedCount, 'tiles');
      unsavedChanges = true;
      updateStatus(`Zone cleared (${deletedCount} tiles removed)`);
      
      // Force re-render
      setTimeout(() => {
        renderMapEditor();
        console.log('[AdminPanel] Zone cleared, remaining tiles:', Object.keys(worldData.tiles).filter(k => k.startsWith(zoneId)).length);
      }, 50);
      
      // Update live game map if in same zone
      const player = global.State?.getPlayer();
      if (player && player.currentZone === zoneId && global.WorldMapRender) {
        setTimeout(() => global.WorldMapRender.renderMap(), 100);
      }
    } catch (error) {
      console.error('[AdminPanel] Error in clearZone:', error);
      alert('Error clearing zone: ' + error.message);
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
   * Create backup before saving
   */
  function createBackup() {
    const worldData = global.World?.getWorldData();
    if (!worldData) return null;

    backupData = {
      zones: JSON.parse(JSON.stringify(worldData.zones)),
      tiles: JSON.parse(JSON.stringify(worldData.tiles)),
      spawnGroups: JSON.parse(JSON.stringify(worldData.spawnGroups)),
      mobTemplates: JSON.parse(JSON.stringify(worldData.mobTemplates)),
      guardPatrols: JSON.parse(JSON.stringify(global.REALM?.data?.guardPatrols || [])),
      timestamp: Date.now()
    };

      // Also save to localStorage as persistent backup
      try {
        localStorage.setItem('REALM_ADMIN_BACKUP', JSON.stringify(backupData));
        localStorage.setItem('REALM_ADMIN_BACKUP_TIME', Date.now().toString());
        console.log('[AdminPanel] Backup created and saved to localStorage');
      } catch (e) {
        console.warn('[AdminPanel] Failed to save backup to localStorage:', e);
      }

    // Show undo button
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) {
      undoBtn.style.display = 'block';
    }

    return backupData;
  }

  /**
   * Undo last save
   */
  function undoChanges() {
    if (!backupData) {
      // Try to load from localStorage
      try {
        const stored = localStorage.getItem('REALM_ADMIN_BACKUP');
        if (stored) {
          backupData = JSON.parse(stored);
        }
      } catch (e) {
        console.warn('[AdminPanel] Failed to load backup from localStorage:', e);
      }
    }

    if (!backupData) {
      alert('No backup found to restore');
      return;
    }

    if (!confirm('This will restore the previous version. Continue?')) {
      return;
    }

    const worldData = global.World?.getWorldData();
    if (!worldData) {
      alert('World data not available');
      return;
    }

    // Restore from backup
    worldData.zones = backupData.zones;
    worldData.tiles = backupData.tiles;
    worldData.spawnGroups = backupData.spawnGroups;
    worldData.mobTemplates = backupData.mobTemplates;
    if (global.REALM.data) {
      global.REALM.data.guardPatrols = backupData.guardPatrols;
    }

    // Apply changes live
    applyChangesLive(worldData);

    // Save to localStorage/backend
    saveToLiveStorage(worldData);

    unsavedChanges = false;
    updateStatus('Changes restored from backup');
    
    if (global.Toast) {
      global.Toast.show({
        type: 'success',
        title: 'Restored',
        text: 'Previous version has been restored.'
      });
    }
  }

  /**
   * Save to live storage (localStorage and/or backend)
   */
  async function saveToLiveStorage(worldData) {
    const zones = Object.values(worldData.zones);
    const spawnGroups = Object.values(worldData.spawnGroups);
    const mobTemplates = Object.values(worldData.mobTemplates);
    const guardPatrols = global.REALM?.data?.guardPatrols || [];
    const quests = global.REALM?.data?.quests || [];
    const lootTables = global.REALM?.data?.lootTables || [];
    const npcs = Object.values(global.REALM?.data?.npcsById || {});

    // Save to localStorage for immediate effect
    try {
      localStorage.setItem('REALM_WORLD_ZONES', JSON.stringify(zones));
      localStorage.setItem('REALM_SPAWN_GROUPS', JSON.stringify(spawnGroups));
      localStorage.setItem('REALM_MOB_TEMPLATES', JSON.stringify(mobTemplates));
      localStorage.setItem('REALM_GUARD_PATROLS', JSON.stringify(guardPatrols));
      localStorage.setItem('REALM_QUESTS', JSON.stringify(quests));
      localStorage.setItem('REALM_LOOT_TABLES', JSON.stringify(lootTables));
      localStorage.setItem('REALM_NPCS', JSON.stringify(npcs));
      localStorage.setItem('REALM_WORLD_TILES', JSON.stringify(worldData.tiles));
      localStorage.setItem('REALM_WORLD_DATA_SAVED', Date.now().toString());
      console.log('[AdminPanel] Saved to localStorage - changes will be live for all players');
      
      // Verify save
      const saved = localStorage.getItem('REALM_WORLD_DATA_SAVED');
      if (saved) {
        console.log('[AdminPanel] Save verified, timestamp:', saved);
      }
    } catch (e) {
      console.error('[AdminPanel] Failed to save to localStorage:', e);
      throw new Error('Failed to save to localStorage: ' + e.message);
    }

    // Try to save via backend API if available
    const API_BASE_URL = window.REALM_API_URL || '';
    if (API_BASE_URL) {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/save-world-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...global.Auth?.getAuthHeaders()
          },
          body: JSON.stringify({
            zones: zones,
            spawnGroups: spawnGroups,
            mobTemplates: mobTemplates,
            guardPatrols: guardPatrols,
            quests: quests,
            lootTables: lootTables,
            npcs: npcs,
            tiles: worldData.tiles
          })
        });

        if (response.ok) {
          console.log('[AdminPanel] Saved to backend API');
          return;
        }
      } catch (error) {
        console.warn('[AdminPanel] API save failed:', error);
      }
    }

    // Also download files as backup
    await saveJSONFile('data/world-zones.json', zones);
    await saveJSONFile('data/spawn-groups.json', spawnGroups);
    await saveJSONFile('data/mob-templates.json', mobTemplates);
    await saveJSONFile('data/guard-patrols.json', guardPatrols);
    await saveJSONFile('data/quests.json', quests);
    await saveJSONFile('data/loot-tables.json', lootTables);
    await saveJSONFile('data/npcs.json', npcs);
  }

  /**
   * Save all changes and apply live
   */
  async function saveAll() {
    try {
      console.log('[AdminPanel] saveAll called, unsavedChanges:', unsavedChanges);
      
      if (!unsavedChanges) {
        updateStatus('No changes to save');
        return;
      }

      if (!confirm('This will apply changes to the live game for all players. Continue?')) {
        return;
      }

      updateStatus('Creating backup and saving...');

      const worldData = global.World?.getWorldData();
      if (!worldData) {
        throw new Error('World data not available. Is the World system initialized?');
      }

      console.log('[AdminPanel] World data available, zones:', Object.keys(worldData.zones).length);
      console.log('[AdminPanel] Tiles:', Object.keys(worldData.tiles).length);

      // Create backup before saving
      createBackup();

      // Apply changes live to the game
      applyChangesLive(worldData);

      // Save to live storage (localStorage and/or backend)
      await saveToLiveStorage(worldData);

      unsavedChanges = false;
      updateStatus('All changes saved and applied live!');
      
      // Show success message
      if (global.Toast) {
        global.Toast.show({
          type: 'success',
          title: 'Changes Applied',
          text: 'All changes have been saved and applied to the live game for all players.'
        });
      }
      
      console.log('[AdminPanel] Save completed successfully');
    } catch (error) {
      console.error('[AdminPanel] Save error:', error);
      updateStatus('Error saving: ' + error.message);
      alert('Error saving changes: ' + error.message + '\n\nCheck console for details.');
    }
  }

  /**
   * Apply changes live to the game without restart
   */
  function applyChangesLive(worldData) {
    console.log('[AdminPanel] Applying changes live to game...');
    
    // Update World data structures directly
    if (global.World && typeof global.World.getWorldData === 'function') {
      const currentWorldData = global.World.getWorldData();
      if (currentWorldData) {
        // Update zones
        currentWorldData.zones = worldData.zones;
        currentWorldData.tiles = worldData.tiles;
        currentWorldData.spawnGroups = worldData.spawnGroups;
        currentWorldData.mobTemplates = worldData.mobTemplates;
        console.log('[AdminPanel] Updated World data structures');
      }
    }

    // Update REALM.data structures for immediate access
    if (global.REALM && global.REALM.data) {
      // Update zonesById lookup
      if (!global.REALM.data.zonesById) {
        global.REALM.data.zonesById = {};
      }
      Object.values(worldData.zones).forEach(zone => {
        global.REALM.data.zonesById[zone.id.toLowerCase()] = zone;
      });

      // Update monstersById lookup
      if (!global.REALM.data.monstersById) {
        global.REALM.data.monstersById = {};
      }
      Object.values(worldData.mobTemplates).forEach(mob => {
        global.REALM.data.monstersById[mob.id.toLowerCase()] = mob;
      });

      // Update spawnGroups
      if (!global.REALM.data.spawnGroupsById) {
        global.REALM.data.spawnGroupsById = {};
      }
      Object.values(worldData.spawnGroups).forEach(sg => {
        global.REALM.data.spawnGroupsById[sg.id.toLowerCase()] = sg;
      });

      console.log('[AdminPanel] Updated REALM.data structures');
    }

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
      if (typeof global.SpawnSystem.clearZone === 'function') {
        global.SpawnSystem.clearZone();
      }
      // Reinitialize with new spawn data
      if (typeof global.SpawnSystem.initializeZone === 'function') {
        global.SpawnSystem.initializeZone(player.currentZone);
      }
    }

    // Update guard system
    if (global.GuardSystem && typeof global.GuardSystem.reloadPatrols === 'function') {
      global.GuardSystem.reloadPatrols();
    }

    // Re-render map immediately
    if (global.WorldMapRender && typeof global.WorldMapRender.renderMap === 'function') {
      setTimeout(() => {
        global.WorldMapRender.renderMap();
        console.log('[AdminPanel] Map re-rendered with new data');
      }, 100);
    }

    // Update UI components that display zone/mob data
    if (global.Rendering) {
      if (typeof global.Rendering.updateZoneHeader === 'function') {
        global.Rendering.updateZoneHeader();
      }
    }

    console.log('[AdminPanel] All changes applied live to game');
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
    console.log('[AdminPanel] reloadData called');
    if (unsavedChanges && !confirm('You have unsaved changes. Reload anyway?')) {
      return;
    }

    // Clear localStorage admin saves to reload from files
    try {
      localStorage.removeItem('REALM_WORLD_ZONES');
      localStorage.removeItem('REALM_SPAWN_GROUPS');
      localStorage.removeItem('REALM_MOB_TEMPLATES');
      localStorage.removeItem('REALM_GUARD_PATROLS');
      localStorage.removeItem('REALM_WORLD_TILES');
      localStorage.removeItem('REALM_WORLD_DATA_SAVED');
      console.log('[AdminPanel] Cleared localStorage, reloading...');
    } catch (e) {
      console.warn('[AdminPanel] Failed to clear localStorage:', e);
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
    const existingBtn = document.getElementById('adminPanelBtn');
    if (existingBtn) {
      console.log('[AdminPanel] Admin button already exists');
      return;
    }

    // Only add if user is admin
    if (!global.AdminUtils) {
      console.log('[AdminPanel] AdminUtils not available');
      return;
    }

    if (!global.AdminUtils.isAdmin()) {
      console.log('[AdminPanel] User is not admin, not adding button');
      return;
    }

    console.log('[AdminPanel] Creating admin button');
    const button = document.createElement('button');
    button.id = 'adminPanelBtn';
    button.className = 'admin-panel-btn';
    button.textContent = 'Admin';
    button.onclick = () => {
      console.log('[AdminPanel] Admin button clicked');
      show();
    };
    button.title = 'Open Admin Panel (Ctrl+Shift+A)';
    button.style.position = 'fixed';
    button.style.top = '10px';
    button.style.right = '10px';
    button.style.zIndex = '10000';

    // Try to add to header first, but always add to body as fallback
    const header = document.querySelector('.app-header');
    if (header) {
      // Try to add to header, but position it properly
      button.style.position = 'absolute';
      button.style.top = '10px';
      button.style.right = '10px';
      header.style.position = 'relative'; // Make header a positioning context
      header.appendChild(button);
      console.log('[AdminPanel] Admin button added to header');
    } else {
      // Fallback: add to body with fixed positioning
      document.body.appendChild(button);
      console.log('[AdminPanel] Admin button added to body (fixed position)');
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
    console.log('[AdminPanel] delayedInit called');
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

  // Initialize immediately and check multiple times
  initialize();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(delayedInit, 500);
      // Check again after game initialization
      setTimeout(delayedInit, 2000);
      setTimeout(delayedInit, 5000);
      setTimeout(delayedInit, 10000); // Check again after 10 seconds
    });
  } else {
    setTimeout(delayedInit, 500);
    setTimeout(delayedInit, 2000);
    setTimeout(delayedInit, 5000);
    setTimeout(delayedInit, 10000); // Check again after 10 seconds
  }

  // Also check periodically
  setInterval(checkAndShowAdminButton, 5000);
  
  // Force check when window loads
  window.addEventListener('load', () => {
    setTimeout(checkAndShowAdminButton, 1000);
  });

  /**
   * Get zone transition points (where zone lines are)
   */
  function getZoneTransitions(zone) {
    const transitions = [];
    if (!zone.neighboringZones || zone.neighboringZones.length === 0) {
      return transitions;
    }

    // Get neighboring zones to determine transition directions
    zone.neighboringZones.forEach(neighborZoneId => {
      const neighborZone = global.World?.getZone(neighborZoneId);
      if (!neighborZone) return;

      // Check if neighbor zone has this zone in its neighboringZones to determine direction
      // For now, we'll infer direction based on zone names and types
      // If neighbor is a city and we're outdoor, transition is likely at an edge
      // If we're a city and neighbor is outdoor, transition is at city gate (edge)
      
      // Default: place transitions at all edges, but prioritize based on zone type
      if (zone.type === 'city' && neighborZone.type === 'outdoor') {
        // City gate - typically at one edge
        // Check which edge makes sense (usually south for main gates)
        transitions.push({ 
          zoneId: neighborZoneId, 
          direction: 'south', 
          x: Math.floor(zone.gridWidth / 2), 
          y: zone.gridHeight - 1 
        });
      } else if (zone.type === 'outdoor' && neighborZone.type === 'city') {
        // Approaching city - transition at edge closest to city
        transitions.push({ 
          zoneId: neighborZoneId, 
          direction: 'north', 
          x: Math.floor(zone.gridWidth / 2), 
          y: 0 
        });
      } else {
        // Outdoor to outdoor - can be at any edge
        // Place at center of each edge as potential transition points
        transitions.push({ zoneId: neighborZoneId, direction: 'south', x: Math.floor(zone.gridWidth / 2), y: zone.gridHeight - 1 });
        transitions.push({ zoneId: neighborZoneId, direction: 'north', x: Math.floor(zone.gridWidth / 2), y: 0 });
        transitions.push({ zoneId: neighborZoneId, direction: 'east', x: zone.gridWidth - 1, y: Math.floor(zone.gridHeight / 2) });
        transitions.push({ zoneId: neighborZoneId, direction: 'west', x: 0, y: Math.floor(zone.gridHeight / 2) });
      }
    });

    // Deduplicate by direction and zoneId
    const unique = [];
    const seen = new Set();
    transitions.forEach(t => {
      const key = `${t.direction}_${t.zoneId}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(t);
      }
    });

    return unique;
  }

  /**
   * Check if tile is near ruins (check for structures or special markers)
   */
  function isNearRuins(zone, x, y, worldData) {
    // Check if there are structures or special markers nearby
    // For now, we'll check if there are any special terrain types that indicate ruins
    const nearbyTiles = [
      { x: x - 1, y: y - 1 }, { x: x, y: y - 1 }, { x: x + 1, y: y - 1 },
      { x: x - 1, y: y }, { x: x + 1, y: y },
      { x: x - 1, y: y + 1 }, { x: x, y: y + 1 }, { x: x + 1, y: y + 1 }
    ];

    for (const tile of nearbyTiles) {
      const key = `${zone.id}_${tile.x}_${tile.y}`;
      const existingTile = worldData.tiles[key];
      if (existingTile && (existingTile.terrainType === 'rock' || existingTile.terrainType === 'building')) {
        // Check if it looks like ruins (broken buildings, rocks in patterns)
        return true;
      }
    }

    return false;
  }

  /**
   * Generate map based on type (context-aware)
   */
  function generateMap() {
    try {
      console.log('[AdminPanel] generateMap called');
      const zoneSelect = document.getElementById('adminZoneSelect');
      if (!zoneSelect) {
        alert('Zone selector not found');
        return;
      }
      
      const zoneId = zoneSelect.value;
      if (!zoneId) {
        alert('Please select a zone first');
        return;
      }

      const zone = global.World?.getZone(zoneId);
      if (!zone) {
        alert('Zone not found: ' + zoneId);
        return;
      }

      const genTypeSelect = document.getElementById('mapGenType');
      const genType = genTypeSelect?.value || 'outdoor';
      const roadWidthInput = document.getElementById('mapGenRoadWidth');
      const roadWidth = parseInt(roadWidthInput?.value || '2');
      const buildingDensityInput = document.getElementById('mapGenBuildingDensity');
      const buildingDensity = parseInt(buildingDensityInput?.value || '30');
      const mainRoadsCheckbox = document.getElementById('mapGenMainRoads');
      const mainRoads = mainRoadsCheckbox ? mainRoadsCheckbox.checked : true;
      const sidePathsCheckbox = document.getElementById('mapGenSidePaths');
      const sidePaths = sidePathsCheckbox ? sidePathsCheckbox.checked : true;

      if (!confirm(`Generate ${genType} map for ${zone.name}? This will replace existing tiles.`)) {
        return;
      }

      const worldData = global.World?.getWorldData();
      if (!worldData) {
        alert('World data not available. Is the World system initialized?');
        console.error('[AdminPanel] World.getWorldData() returned:', worldData);
        return;
      }

      if (!worldData.tiles) {
        worldData.tiles = {};
      }

      console.log('[AdminPanel] Generating', genType, 'map for zone', zoneId);
      
      // Generate based on type (context-aware)
      if (genType === 'city') {
        generateCityMapContextAware(zone, worldData, roadWidth, buildingDensity, mainRoads, sidePaths);
      } else if (genType === 'outdoor') {
        generateOutdoorMapContextAware(zone, worldData, roadWidth, mainRoads, sidePaths);
      } else if (genType === 'dungeon') {
        generateDungeonMap(zone, worldData);
      } else {
        alert('Unknown map generation type: ' + genType);
        return;
      }

      const tileCount = Object.keys(worldData.tiles).filter(k => k.startsWith(zoneId)).length;
      console.log('[AdminPanel] Generated', tileCount, 'tiles');
      
      unsavedChanges = true;
      updateStatus(`Map generated (${tileCount} tiles)`);
      
      // Force re-render
      setTimeout(() => {
        renderMapEditor();
        console.log('[AdminPanel] Map generated, total tiles:', tileCount);
      }, 50);
      
      // Update live game map if in same zone
      const player = global.State?.getPlayer();
      if (player && player.currentZone === zoneId && global.WorldMapRender) {
        setTimeout(() => global.WorldMapRender.renderMap(), 100);
      }
    } catch (error) {
      console.error('[AdminPanel] Error in generateMap:', error);
      alert('Error generating map: ' + error.message);
    }
  }

  /**
   * Generate fantasy map with rivers, forests, roads (context-aware)
   */
  function generateFantasyMap() {
    console.log('[AdminPanel] generateFantasyMap called');
    const zoneSelect = document.getElementById('adminZoneSelect');
    if (!zoneSelect) {
      alert('Zone selector not found');
      return;
    }
    
    const zoneId = zoneSelect.value;
    if (!zoneId) {
      alert('Please select a zone first');
      return;
    }

    const zone = global.World?.getZone(zoneId);
    if (!zone) {
      alert('Zone not found: ' + zoneId);
      return;
    }

    if (!confirm(`Generate fantasy map for ${zone.name}? This will replace existing tiles.`)) {
      return;
    }

    const worldData = global.World?.getWorldData();
    if (!worldData) {
      alert('World data not available');
      return;
    }

    if (!worldData.tiles) {
      worldData.tiles = {};
    }

    // Get zone transitions for context-aware road generation
    const transitions = getZoneTransitions(zone);
    const eastTransitions = transitions.filter(t => t.direction === 'east');
    const southTransitions = transitions.filter(t => t.direction === 'south');
    const northTransitions = transitions.filter(t => t.direction === 'north');
    const westTransitions = transitions.filter(t => t.direction === 'west');

    // Generate fantasy map with context-aware roads
    for (let y = 0; y < zone.gridHeight; y++) {
      for (let x = 0; x < zone.gridWidth; x++) {
        const key = `${zoneId}_${x}_${y}`;
        let terrainType = 'grass';
        let walkable = true;

        // Create roads leading to zone transitions
        let isOnRoad = false;
        
        // Road to east transitions (split if multiple)
        if (eastTransitions.length > 0) {
          if (eastTransitions.length === 1) {
            // Single road to east
            const targetY = eastTransitions[0].y;
            if (Math.abs(y - targetY) < 2 && x > zone.gridWidth * 0.3) {
              terrainType = 'path';
              walkable = true;
              isOnRoad = true;
            }
          } else {
            // Multiple east transitions - split road
            const sorted = eastTransitions.sort((a, b) => a.y - b.y);
            const midY = (sorted[0].y + sorted[sorted.length - 1].y) / 2;
            if (x > zone.gridWidth * 0.3) {
              if (Math.abs(y - midY) < 2) {
                // Main road
                terrainType = 'path';
                walkable = true;
                isOnRoad = true;
              } else if (sorted.some(t => Math.abs(y - t.y) < 2)) {
                // Branch to specific transition
                terrainType = 'path';
                walkable = true;
                isOnRoad = true;
              }
            }
          }
        }

        // Road to south transitions
        if (!isOnRoad && southTransitions.length > 0) {
          const targetX = southTransitions[0].x;
          if (Math.abs(x - targetX) < 2 && y > zone.gridHeight * 0.3) {
            terrainType = 'path';
            walkable = true;
            isOnRoad = true;
          }
        }

        // Road to north transitions
        if (!isOnRoad && northTransitions.length > 0) {
          const targetX = northTransitions[0].x;
          if (Math.abs(x - targetX) < 2 && y < zone.gridHeight * 0.7) {
            terrainType = 'path';
            walkable = true;
            isOnRoad = true;
          }
        }

        // Road to west transitions
        if (!isOnRoad && westTransitions.length > 0) {
          const targetY = westTransitions[0].y;
          if (Math.abs(y - targetY) < 2 && x < zone.gridWidth * 0.7) {
            terrainType = 'path';
            walkable = true;
            isOnRoad = true;
          }
        }

        // Create a river (winding path) if not on road
        if (!isOnRoad) {
          const riverX = Math.sin(y * 0.1) * 10 + zone.gridWidth / 2;
          if (Math.abs(x - riverX) < 2) {
            terrainType = 'water';
            walkable = false;
          }
          // Create forests (clusters)
          else if (Math.random() > 0.7 && Math.sqrt(Math.pow(x - zone.gridWidth / 2, 2) + Math.pow(y - zone.gridHeight / 2, 2)) > zone.gridWidth * 0.2) {
            terrainType = 'tree';
            walkable = false;
          }
          // Create some rocks
          else if (Math.random() > 0.95) {
            terrainType = 'rock';
            walkable = false;
          }
          // Default to grass
          else {
            terrainType = 'grass';
            walkable = true;
          }
        }

        worldData.tiles[key] = {
          x, y, zoneId: zone.id,
          terrainType,
          walkable
        };
      }
    }

    unsavedChanges = true;
    updateStatus('Fantasy map generated');
    
    // Force re-render
    setTimeout(() => {
      renderMapEditor();
      console.log('[AdminPanel] Fantasy map generated, tiles updated:', Object.keys(worldData.tiles).filter(k => k.startsWith(zoneId)).length);
    }, 50);
    
    // Update live game map if in same zone
    const player = global.State?.getPlayer();
    if (player && player.currentZone === zoneId && global.WorldMapRender) {
      setTimeout(() => global.WorldMapRender.renderMap(), 100);
    }
  }

  /**
   * Generate city map with streets and buildings (context-aware)
   */
  function generateCityMapContextAware(zone, worldData, roadWidth, buildingDensity, mainRoads, sidePaths) {
    const transitions = getZoneTransitions(zone);
    
    // Find which directions have cities (for density)
    const cityDirections = [];
    transitions.forEach(t => {
      const neighborZone = global.World?.getZone(t.zoneId);
      if (neighborZone && neighborZone.type === 'city') {
        cityDirections.push(t.direction);
      }
    });

    for (let y = 0; y < zone.gridHeight; y++) {
      for (let x = 0; x < zone.gridWidth; x++) {
        const key = `${zone.id}_${x}_${y}`;
        let terrainType = 'city_plaza';
        let walkable = true;

        // Walls on edges
        if (x === 0 || x === zone.gridWidth - 1 || y === 0 || y === zone.gridHeight - 1) {
          terrainType = 'wall';
          walkable = false;
        }
        // Roads leading to zone transitions
        else {
          let isOnRoad = false;
          
          // Check each transition direction and create roads
          transitions.forEach(transition => {
            if (transition.direction === 'east' && Math.abs(y - transition.y) < roadWidth && x > zone.gridWidth * 0.2) {
              terrainType = 'city_street';
              walkable = true;
              isOnRoad = true;
            } else if (transition.direction === 'west' && Math.abs(y - transition.y) < roadWidth && x < zone.gridWidth * 0.8) {
              terrainType = 'city_street';
              walkable = true;
              isOnRoad = true;
            } else if (transition.direction === 'south' && Math.abs(x - transition.x) < roadWidth && y > zone.gridHeight * 0.2) {
              terrainType = 'city_street';
              walkable = true;
              isOnRoad = true;
            } else if (transition.direction === 'north' && Math.abs(x - transition.x) < roadWidth && y < zone.gridHeight * 0.8) {
              terrainType = 'city_street';
              walkable = true;
              isOnRoad = true;
            }
          });

          // Main roads (horizontal and vertical center) if enabled
          if (!isOnRoad && mainRoads && (Math.abs(y - Math.floor(zone.gridHeight / 2)) < roadWidth || Math.abs(x - Math.floor(zone.gridWidth / 2)) < roadWidth)) {
            terrainType = 'city_street';
            walkable = true;
            isOnRoad = true;
          }
          // Side paths (grid pattern) if enabled
          else if (!isOnRoad && sidePaths && (x % 5 === 0 || y % 5 === 0)) {
            terrainType = 'city_street';
            walkable = true;
            isOnRoad = true;
          }
          // Buildings - higher density near city transitions and zone lines
          else if (!isOnRoad) {
            let density = buildingDensity;
            // Increase density near city transitions (where other cities connect)
            transitions.forEach(transition => {
              const neighborZone = global.World?.getZone(transition.zoneId);
              if (neighborZone && neighborZone.type === 'city') {
                const dist = Math.sqrt(Math.pow(x - transition.x, 2) + Math.pow(y - transition.y, 2));
                if (dist < zone.gridWidth * 0.3) {
                  density += 20; // More buildings near city entrances
                }
              }
            });
            
            // Increase density near zone lines (where cities connect to outdoor zones)
            transitions.forEach(transition => {
              const neighborZone = global.World?.getZone(transition.zoneId);
              if (neighborZone && neighborZone.type === 'outdoor') {
                // More dense near the zone line
                if (transition.direction === 'south' && y > zone.gridHeight * 0.7) {
                  density += 15;
                } else if (transition.direction === 'north' && y < zone.gridHeight * 0.3) {
                  density += 15;
                } else if (transition.direction === 'east' && x > zone.gridWidth * 0.7) {
                  density += 15;
                } else if (transition.direction === 'west' && x < zone.gridWidth * 0.3) {
                  density += 15;
                }
              }
            });
            
            if (Math.random() * 100 < density) {
              terrainType = 'building';
              walkable = false;
            } else {
              terrainType = 'city_plaza';
              walkable = true;
            }
          }
        }

        worldData.tiles[key] = {
          x, y, zoneId: zone.id,
          terrainType,
          walkable
        };
      }
    }
  }

  /**
   * Generate city map with streets and buildings (old version - kept for compatibility)
   */
  function generateCityMap(zone, worldData, roadWidth, buildingDensity, mainRoads, sidePaths) {
    generateCityMapContextAware(zone, worldData, roadWidth, buildingDensity, mainRoads, sidePaths);
  }

  /**
   * Generate outdoor map with paths and roads (context-aware)
   */
  function generateOutdoorMapContextAware(zone, worldData, roadWidth, mainRoads, sidePaths) {
    const transitions = getZoneTransitions(zone);
    const eastTransitions = transitions.filter(t => t.direction === 'east');
    const southTransitions = transitions.filter(t => t.direction === 'south');
    const northTransitions = transitions.filter(t => t.direction === 'north');
    const westTransitions = transitions.filter(t => t.direction === 'west');

    for (let y = 0; y < zone.gridHeight; y++) {
      for (let x = 0; x < zone.gridWidth; x++) {
        const key = `${zone.id}_${x}_${y}`;
        let terrainType = 'grass';
        let walkable = true;

        let isOnRoad = false;

        // Roads to east transitions
        if (eastTransitions.length > 0) {
          if (eastTransitions.length === 1) {
            const targetY = eastTransitions[0].y;
            if (Math.abs(y - targetY) < roadWidth && x > zone.gridWidth * 0.2) {
              terrainType = 'path';
              walkable = true;
              isOnRoad = true;
            }
          } else {
            // Multiple - split road
            const sorted = eastTransitions.sort((a, b) => a.y - b.y);
            const midY = (sorted[0].y + sorted[sorted.length - 1].y) / 2;
            if (x > zone.gridWidth * 0.2) {
              if (Math.abs(y - midY) < roadWidth) {
                terrainType = 'path';
                walkable = true;
                isOnRoad = true;
              } else if (sorted.some(t => Math.abs(y - t.y) < roadWidth)) {
                terrainType = 'path';
                walkable = true;
                isOnRoad = true;
              }
            }
          }
        }

        // Roads to south
        if (!isOnRoad && southTransitions.length > 0) {
          const targetX = southTransitions[0].x;
          if (Math.abs(x - targetX) < roadWidth && y > zone.gridHeight * 0.2) {
            terrainType = 'path';
            walkable = true;
            isOnRoad = true;
          }
        }

        // Roads to north
        if (!isOnRoad && northTransitions.length > 0) {
          const targetX = northTransitions[0].x;
          if (Math.abs(x - targetX) < roadWidth && y < zone.gridHeight * 0.8) {
            terrainType = 'path';
            walkable = true;
            isOnRoad = true;
          }
        }

        // Roads to west
        if (!isOnRoad && westTransitions.length > 0) {
          const targetY = westTransitions[0].y;
          if (Math.abs(y - targetY) < roadWidth && x < zone.gridWidth * 0.8) {
            terrainType = 'path';
            walkable = true;
            isOnRoad = true;
          }
        }

        // Main roads if enabled and not already on a road
        if (!isOnRoad && mainRoads && (Math.abs(y - Math.floor(zone.gridHeight / 2)) < roadWidth || Math.abs(x - Math.floor(zone.gridWidth / 2)) < roadWidth)) {
          terrainType = 'path';
          walkable = true;
          isOnRoad = true;
        }
        // Side paths if enabled
        else if (!isOnRoad && sidePaths && ((x + y) % 8 === 0 || x % 10 === 0 || y % 10 === 0)) {
          terrainType = 'path';
          walkable = true;
          isOnRoad = true;
        }
        // Trees (random)
        else if (!isOnRoad && Math.random() > 0.85) {
          terrainType = 'tree';
          walkable = false;
        }
        // Rocks (edges)
        else if (!isOnRoad && (x < 3 || x > zone.gridWidth - 4 || y < 3 || y > zone.gridHeight - 4) && Math.random() > 0.7) {
          terrainType = 'rock';
          walkable = false;
        }
        // Default to grass
        else if (!isOnRoad) {
          terrainType = 'grass';
          walkable = true;
        }

        worldData.tiles[key] = {
          x, y, zoneId: zone.id,
          terrainType,
          walkable
        };
      }
    }
  }

  /**
   * Generate outdoor map with paths and roads (old version - kept for compatibility)
   */
  function generateOutdoorMap(zone, worldData, roadWidth, mainRoads, sidePaths) {
    generateOutdoorMapContextAware(zone, worldData, roadWidth, mainRoads, sidePaths);
  }

  /**
   * Load NPCs for quest editor
   */
  function loadNPCsForQuests() {
    const npcs = Object.values(global.REALM?.data?.npcsById || {});
    const mobTemplates = Object.values(global.World?.getWorldData()?.mobTemplates || {});
    const select = document.getElementById('questNpcSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- Select NPC/Mob --</option>' +
      npcs.map(npc => `<option value="npc_${npc.id}">NPC: ${npc.name} (${npc.id})</option>`).join('') +
      mobTemplates.map(mob => `<option value="mob_${mob.id}">Mob: ${mob.name} (${mob.id})</option>`).join('');
  }

  /**
   * Load quests
   */
  function loadQuests() {
    const quests = global.REALM?.data?.quests || [];
    const questList = document.getElementById('questList');
    if (!questList) return;

    questList.innerHTML = quests.map(quest => `
      <div class="quest-item" onclick="window.AdminPanel.editQuest('${quest.id}')">
        <strong>${quest.title}</strong> (${quest.id})<br>
        <small>Type: ${quest.type || 'kill'} | NPC: ${quest.npcId || 'N/A'}</small>
      </div>
    `).join('');
  }

  /**
   * Render quest editor
   */
  function renderQuestEditor() {
    loadQuests();
    loadNPCsForQuests();
  }

  /**
   * Create new quest
   */
  function createQuest() {
    const questId = prompt('Enter quest ID:');
    if (!questId) return;

    const worldData = global.World?.getWorldData();
    if (!worldData) return;

    if (!worldData.quests) {
      worldData.quests = [];
    }

    if (worldData.quests.find(q => q.id === questId)) {
      alert('Quest already exists');
      return;
    }

    const newQuest = {
      id: questId,
      title: questId,
      description: '',
      type: 'kill',
      rewards: { xp: 0, gold: 0, items: [] },
      prerequisites: []
    };

    worldData.quests.push(newQuest);
    
    // Update REALM.data
    if (global.REALM && global.REALM.data) {
      if (!global.REALM.data.quests) global.REALM.data.quests = [];
      global.REALM.data.quests.push(newQuest);
      if (!global.REALM.data.questsById) global.REALM.data.questsById = {};
      global.REALM.data.questsById[questId] = newQuest;
    }

    loadQuests();
    editQuest(questId);
    unsavedChanges = true;
    updateStatus('Quest created');
  }

  /**
   * Edit quest
   */
  function editQuest(questId) {
    const quest = global.REALM?.data?.questsById?.[questId];
    if (!quest) return;

    const propsDiv = document.getElementById('questProperties');
    propsDiv.style.display = 'block';

    document.getElementById('questId').value = quest.id || '';
    document.getElementById('questTitle').value = quest.title || '';
    document.getElementById('questDescription').value = quest.description || '';
    document.getElementById('questType').value = quest.type || 'kill';
    
    // Update type-specific fields
    const questType = document.getElementById('questType');
    questType.dispatchEvent(new Event('change'));

    if (quest.type === 'kill') {
      document.getElementById('questTargetMob').value = quest.target || '';
      document.getElementById('questTargetCount').value = quest.targetCount || 1;
    } else if (quest.type === 'turnin') {
      document.getElementById('questRequiredItems').value = (quest.requiredItems || []).join(', ');
      document.getElementById('questItemCounts').value = JSON.stringify(quest.requiredItemCounts || {}, null, 2);
      document.getElementById('questNpcId').value = quest.npcId || '';
      document.getElementById('questDialogue').value = quest.dialogue || '';
    }

    document.getElementById('questRewardXp').value = quest.rewards?.xp || 0;
    document.getElementById('questRewardGold').value = quest.rewards?.gold || 0;
    document.getElementById('questRewardItems').value = (quest.rewards?.items || []).join(', ');
    document.getElementById('questPrerequisites').value = (quest.prerequisites || []).join(', ');

    // Store editing quest
    editingQuest = quest;
  }

  /**
   * Save quest
   */
  function saveQuest() {
    if (!editingQuest) {
      alert('No quest selected');
      return;
    }

    const worldData = global.World?.getWorldData();
    if (!worldData) return;

    editingQuest.title = document.getElementById('questTitle')?.value || editingQuest.id;
    editingQuest.description = document.getElementById('questDescription')?.value || '';
    editingQuest.type = document.getElementById('questType')?.value || 'kill';

    if (editingQuest.type === 'kill') {
      editingQuest.target = document.getElementById('questTargetMob')?.value || '';
      editingQuest.targetCount = parseInt(document.getElementById('questTargetCount')?.value || '1');
    } else if (editingQuest.type === 'turnin') {
      const requiredItemsStr = document.getElementById('questRequiredItems')?.value || '';
      editingQuest.requiredItems = requiredItemsStr.split(',').map(s => s.trim()).filter(s => s);
      
      try {
        const itemCountsStr = document.getElementById('questItemCounts')?.value || '{}';
        editingQuest.requiredItemCounts = JSON.parse(itemCountsStr);
      } catch (e) {
        alert('Invalid JSON in item counts. Using default.');
        editingQuest.requiredItemCounts = {};
      }
      
      editingQuest.npcId = document.getElementById('questNpcId')?.value || '';
      editingQuest.dialogue = document.getElementById('questDialogue')?.value || '';

      // Update NPC quest list
      if (editingQuest.npcId) {
        const npc = global.REALM?.data?.npcsById?.[editingQuest.npcId];
        if (npc) {
          if (!npc.quests) npc.quests = [];
          if (!npc.quests.includes(editingQuest.id)) {
            npc.quests.push(editingQuest.id);
          }
          if (editingQuest.dialogue) {
            npc.questDialogue = editingQuest.dialogue;
          }
        }
      }
    }

    editingQuest.rewards = {
      xp: parseInt(document.getElementById('questRewardXp')?.value || '0'),
      gold: parseInt(document.getElementById('questRewardGold')?.value || '0'),
      items: (document.getElementById('questRewardItems')?.value || '').split(',').map(s => s.trim()).filter(s => s)
    };

    const prereqsStr = document.getElementById('questPrerequisites')?.value || '';
    editingQuest.prerequisites = prereqsStr.split(',').map(s => s.trim()).filter(s => s);

    unsavedChanges = true;
    updateStatus('Quest saved');
    loadQuests();
  }

  /**
   * Delete quest
   */
  function deleteQuest() {
    if (!editingQuest) {
      alert('No quest selected');
      return;
    }

    if (!confirm(`Delete quest "${editingQuest.title}"?`)) {
      return;
    }

    const worldData = global.World?.getWorldData();
    if (!worldData) return;

    if (worldData.quests) {
      worldData.quests = worldData.quests.filter(q => q.id !== editingQuest.id);
    }

    if (global.REALM && global.REALM.data) {
      if (global.REALM.data.quests) {
        global.REALM.data.quests = global.REALM.data.quests.filter(q => q.id !== editingQuest.id);
      }
      if (global.REALM.data.questsById) {
        delete global.REALM.data.questsById[editingQuest.id];
      }
    }

    editingQuest = null;
    document.getElementById('questProperties').style.display = 'none';
    loadQuests();
    unsavedChanges = true;
    updateStatus('Quest deleted');
  }

  /**
   * Load loot tables
   */
  function loadLootTables() {
    const lootTables = global.REALM?.data?.lootTables || [];
    const select = document.getElementById('lootTableSelect');
    const list = document.getElementById('lootList');
    
    if (select) {
      select.innerHTML = '<option value="">-- Create New --</option>' +
        lootTables.map(lt => `<option value="${lt.id}">${lt.name || lt.id}</option>`).join('');
    }

    if (list) {
      list.innerHTML = lootTables.map(lt => `
        <div class="loot-item" onclick="window.AdminPanel.editLootTable('${lt.id}')">
          <strong>${lt.name || lt.id}</strong> (${lt.id})<br>
          <small>${lt.entries?.length || 0} entries</small>
        </div>
      `).join('');
    }
  }

  /**
   * Render loot editor
   */
  function renderLootEditor() {
    loadLootTables();
  }

  /**
   * Create loot table
   */
  function createLootTable() {
    const lootTableId = prompt('Enter loot table ID:');
    if (!lootTableId) return;

    if (!global.REALM.data.lootTables) {
      global.REALM.data.lootTables = [];
    }

    if (global.REALM.data.lootTables.find(lt => lt.id === lootTableId)) {
      alert('Loot table already exists');
      return;
    }

    const newLootTable = {
      id: lootTableId,
      name: lootTableId,
      entries: []
    };

    global.REALM.data.lootTables.push(newLootTable);
    loadLootTables();
    editLootTable(lootTableId);
    unsavedChanges = true;
    updateStatus('Loot table created');
  }

  /**
   * Edit loot table
   */
  function editLootTable(lootTableId) {
    const lootTable = global.REALM?.data?.lootTables?.find(lt => lt.id === lootTableId);
    if (!lootTable) return;

    const propsDiv = document.getElementById('lootProperties');
    propsDiv.style.display = 'block';

    document.getElementById('lootTableId').value = lootTable.id;
    document.getElementById('lootTableName').value = lootTable.name || '';

    editingLootTable = lootTable;
    updateLootEntriesList();
  }

  /**
   * Update loot entries list
   */
  function updateLootEntriesList() {
    if (!editingLootTable) return;

    const entriesList = document.getElementById('lootEntriesList');
    if (!entriesList) return;

    if (!editingLootTable.entries) {
      editingLootTable.entries = [];
    }

    entriesList.innerHTML = editingLootTable.entries.map((entry, idx) => `
      <div class="loot-entry-item" style="padding: 0.5rem; background: rgba(10, 14, 26, 0.4); border-radius: 0.25rem; margin-bottom: 0.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${entry.itemId}</strong><br>
            <small>Chance: ${(entry.chance * 100).toFixed(1)}% | Quantity: ${entry.minQuantity || 1}-${entry.maxQuantity || 1}</small>
          </div>
          <button class="admin-btn-small" onclick="window.AdminPanel.removeLootEntry(${idx})">Remove</button>
        </div>
      </div>
    `).join('') || '<p>No entries. Click "Add Entry" to add items.</p>';
  }

  /**
   * Add loot entry
   */
  function addLootEntry() {
    if (!editingLootTable) {
      alert('Please select a loot table first');
      return;
    }

    const itemId = prompt('Enter item ID:');
    if (!itemId) return;

    const chance = parseFloat(prompt('Enter drop chance (0.0-1.0):', '0.5'));
    if (isNaN(chance) || chance < 0 || chance > 1) {
      alert('Invalid chance. Must be between 0 and 1.');
      return;
    }

    const minQuantity = parseInt(prompt('Enter minimum quantity:', '1')) || 1;
    const maxQuantity = parseInt(prompt('Enter maximum quantity:', '1')) || 1;

    if (!editingLootTable.entries) {
      editingLootTable.entries = [];
    }

    editingLootTable.entries.push({
      itemId: itemId,
      chance: chance,
      minQuantity: minQuantity,
      maxQuantity: maxQuantity
    });

    updateLootEntriesList();
    unsavedChanges = true;
    updateStatus('Loot entry added');
  }

  /**
   * Remove loot entry
   */
  function removeLootEntry(index) {
    if (!editingLootTable || !editingLootTable.entries) return;

    editingLootTable.entries.splice(index, 1);
    updateLootEntriesList();
    unsavedChanges = true;
    updateStatus('Loot entry removed');
  }

  /**
   * Save loot table
   */
  function saveLootTable() {
    if (!editingLootTable) {
      alert('No loot table selected');
      return;
    }

    editingLootTable.name = document.getElementById('lootTableName')?.value || editingLootTable.id;

    unsavedChanges = true;
    updateStatus('Loot table saved');
    loadLootTables();
  }

  /**
   * Delete loot table
   */
  function deleteLootTable() {
    if (!editingLootTable) {
      alert('No loot table selected');
      return;
    }

    if (!confirm(`Delete loot table "${editingLootTable.name}"?`)) {
      return;
    }

    if (global.REALM.data.lootTables) {
      global.REALM.data.lootTables = global.REALM.data.lootTables.filter(lt => lt.id !== editingLootTable.id);
    }

    editingLootTable = null;
    document.getElementById('lootProperties').style.display = 'none';
    loadLootTables();
    unsavedChanges = true;
    updateStatus('Loot table deleted');
  }

  /**
   * Generate dungeon map with corridors
   */
  function generateDungeonMap(zone, worldData) {
    for (let y = 0; y < zone.gridHeight; y++) {
      for (let x = 0; x < zone.gridWidth; x++) {
        const key = `${zone.id}_${x}_${y}`;
        let terrainType = 'dungeon_floor';
        let walkable = true;

        // Walls on edges
        if (x === 0 || x === zone.gridWidth - 1 || y === 0 || y === zone.gridHeight - 1) {
          terrainType = 'dungeon_wall';
          walkable = false;
        }
        // Corridor pattern
        else if (x % 3 === 0 || y % 3 === 0) {
          terrainType = 'dungeon_floor';
          walkable = true;
        }
        // Some walls inside
        else if (Math.random() > 0.7) {
          terrainType = 'dungeon_wall';
          walkable = false;
        }
        // Default to floor
        else {
          terrainType = 'dungeon_floor';
          walkable = true;
        }

        worldData.tiles[key] = {
          x, y, zoneId: zone.id,
          terrainType,
          walkable
        };
      }
    }
  }

  // Export all functions to window.AdminPanel immediately so onclick handlers work
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
    removePatrolWaypoint,
    generateMap,
    generateFantasyMap,
    undoChanges,
    createQuest,
    editQuest,
    saveQuest,
    deleteQuest,
    createLootTable,
    editLootTable,
    addLootEntry,
    removeLootEntry,
    saveLootTable,
    deleteLootTable,
    checkAndShowAdminButton // Export this for app.js to call
  };

  // Set both global and window for maximum compatibility
  global.AdminPanel = AdminPanel;
  window.AdminPanel = AdminPanel;
  
  // Initialize admin button check after a short delay
  setTimeout(() => {
    checkAndShowAdminButton();
  }, 1000);
  
  console.log('[AdminPanel] Admin panel module loaded, functions exported to window.AdminPanel');
})(window);

