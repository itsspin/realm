/**
 * Content Loader Utility
 * 
 * Provides utilities for loading and overriding game content from data files.
 * Supports loading additional data files that override existing entries.
 * 
 * USAGE:
 * - Load override files after base files
 * - Entries with same ID override existing ones
 * - Useful for mods, custom content, or testing
 * 
 * @module ContentLoader
 */

(function (global) {
  /**
   * Load and merge content from a data file
   * 
   * @param {string} filePath - Path to JSON file
   * @param {string} lookupKey - Key in REALM.data to store array (e.g., 'items')
   * @param {string} lookupMapKey - Key in REALM.data for lookup map (e.g., 'itemsById')
   * @param {Function} idExtractor - Function to extract ID from entry (e.g., entry => entry.id)
   * @returns {Promise<Array>} Loaded entries
   */
  async function loadContentFile(filePath, lookupKey, lookupMapKey, idExtractor) {
    try {
      const entries = await global.REALM?.fetchJSON(filePath);
      if (!Array.isArray(entries)) {
        console.warn(`[ContentLoader] ${filePath} is not an array`);
        return [];
      }

      // Merge into existing array
      if (!global.REALM.data[lookupKey]) {
        global.REALM.data[lookupKey] = [];
      }

      // Update lookup map (later entries override earlier ones)
      if (!global.REALM.data[lookupMapKey]) {
        global.REALM.data[lookupMapKey] = {};
      }

      entries.forEach(entry => {
        const id = idExtractor(entry);
        if (id) {
          // Override existing entry if ID matches
          const existingIndex = global.REALM.data[lookupKey].findIndex(e => 
            idExtractor(e) === id
          );
          
          if (existingIndex >= 0) {
            // Override existing
            global.REALM.data[lookupKey][existingIndex] = entry;
            global.DIAG?.note(`[ContentLoader] Overrode ${lookupKey} entry: ${id}`);
          } else {
            // Add new
            global.REALM.data[lookupKey].push(entry);
            global.DIAG?.note(`[ContentLoader] Added ${lookupKey} entry: ${id}`);
          }

          // Update lookup map
          global.REALM.data[lookupMapKey][String(id).toLowerCase()] = entry;
        }
      });

      global.DIAG?.ok(`content:${lookupKey} (${entries.length} entries)`);
      return entries;
    } catch (error) {
      global.DIAG?.fail(`content:${lookupKey}`, error);
      return [];
    }
  }

  /**
   * Load override file (for mods/custom content)
   * 
   * @param {string} filePath - Path to override JSON file
   * @param {string} baseKey - Base data key (e.g., 'items')
   * @param {string} mapKey - Lookup map key (e.g., 'itemsById')
   * @param {Function} idExtractor - ID extractor function
   */
  async function loadOverrideFile(filePath, baseKey, mapKey, idExtractor) {
    console.log(`[ContentLoader] Loading override file: ${filePath}`);
    return loadContentFile(filePath, baseKey, mapKey, idExtractor);
  }

  /**
   * Load multiple override files
   * 
   * @param {Array<Object>} files - Array of {path, baseKey, mapKey, idExtractor}
   */
  async function loadOverrideFiles(files) {
    const results = [];
    for (const file of files) {
      const result = await loadOverrideFile(
        file.path,
        file.baseKey,
        file.mapKey,
        file.idExtractor
      );
      results.push(result);
    }
    return results;
  }

  /**
   * Get content statistics
   * 
   * @returns {Object} Statistics about loaded content
   */
  function getContentStats() {
    const stats = {};
    
    // Count entries in each data array
    Object.keys(global.REALM?.data || {}).forEach(key => {
      const value = global.REALM.data[key];
      if (Array.isArray(value)) {
        stats[key] = value.length;
      } else if (typeof value === 'object' && value !== null) {
        stats[key] = Object.keys(value).length;
      }
    });

    return stats;
  }

  /**
   * Validate content structure
   * 
   * @param {string} key - Data key to validate
   * @param {Function} validator - Validation function
   * @returns {Object} Validation results
   */
  function validateContent(key, validator) {
    const entries = global.REALM?.data[key];
    if (!Array.isArray(entries)) {
      return {
        valid: false,
        error: `${key} is not an array`
      };
    }

    const results = {
      valid: true,
      total: entries.length,
      validCount: 0,
      invalidCount: 0,
      errors: []
    };

    entries.forEach((entry, index) => {
      try {
        if (validator(entry)) {
          results.validCount++;
        } else {
          results.invalidCount++;
          results.errors.push({
            index,
            entry,
            error: 'Validation failed'
          });
        }
      } catch (error) {
        results.invalidCount++;
        results.errors.push({
          index,
          entry,
          error: error.message
        });
      }
    });

    results.valid = results.invalidCount === 0;
    return results;
  }

  const ContentLoader = {
    loadContentFile,
    loadOverrideFile,
    loadOverrideFiles,
    getContentStats,
    validateContent
  };

  global.ContentLoader = ContentLoader;
})(window);

