/**
 * Admin Utilities
 * 
 * Provides admin check functionality and admin-only features.
 * Admins are determined by:
 * - Character name: "Spin"
 * - Username: "travisrd"
 * - Email: "travisrd@gmail.com"
 */

(function (global) {
  /**
   * Check if current user is an admin
   */
  function isAdmin() {
    // Check character name
    const player = global.State?.getPlayer();
    if (player && player.name) {
      const nameLower = player.name.toLowerCase().trim();
      if (nameLower === 'spin') {
        return true;
      }
    }

    // Check username and email from auth session
    const session = global.Auth?.getSession();
    if (session) {
      const username = (session.username || '').toLowerCase().trim();
      const email = (session.email || '').toLowerCase().trim();
      
      if (username === 'travisrd') {
        return true;
      }
      
      if (email === 'travisrd@gmail.com') {
        return true;
      }
    }

    return false;
  }

  /**
   * Get admin status with details
   */
  function getAdminStatus() {
    const isAdminUser = isAdmin();
    const player = global.State?.getPlayer();
    const session = global.Auth?.getSession();
    
    return {
      isAdmin: isAdminUser,
      characterName: player?.name || null,
      username: session?.username || null,
      email: session?.email || null,
      reason: isAdminUser ? 
        (player?.name?.toLowerCase() === 'spin' ? 'character_name' :
         session?.username?.toLowerCase() === 'travisrd' ? 'username' :
         session?.email?.toLowerCase() === 'travisrd@gmail.com' ? 'email' : 'unknown') :
        null
    };
  }

  const AdminUtils = {
    isAdmin,
    getAdminStatus
  };

  global.AdminUtils = AdminUtils;
})(window);

