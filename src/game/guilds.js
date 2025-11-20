(function (global) {
  function createGuild(name, playerId) {
    const player = global.State?.getPlayer();
    if (!player || player.id !== playerId) return false;

    if (player.guild) {
      global.Toast?.show({
        type: 'error',
        title: 'Already in Guild',
        text: 'You are already a member of a guild.'
      });
      return false;
    }

    // For now, player becomes guild leader
    // In multiplayer, this would be stored server-side
    global.State?.updatePlayer({
      guild: {
        id: `guild_${Date.now()}`,
        name: name,
        leader: playerId,
        members: [playerId],
        faction: null,
        territory: []
      }
    });

    global.Narrative?.addEntry({
      type: 'system',
      text: `You have founded the guild "${name}". May it stand strong in the realm.`,
      meta: 'Guild Founded'
    });

    global.Toast?.show({
      type: 'success',
      title: 'Guild Founded!',
      text: `Welcome to ${name}`
    });

    return true;
  }

  function joinGuild(guildId) {
    // Placeholder for multiplayer guild joining
    global.Narrative?.addEntry({
      type: 'system',
      text: 'Guild joining will be available when multiplayer features are enabled.',
      meta: 'Coming Soon'
    });
  }

  function claimTerritory(x, y, guildId) {
    const tile = global.Settlement?.getTile(x, y);
    if (!tile) return false;

    const player = global.State?.getPlayer();
    if (!player || !player.guild) {
      global.Toast?.show({
        type: 'error',
        title: 'No Guild',
        text: 'You must be in a guild to claim territory.'
      });
      return false;
    }

    if (tile.guild && tile.guild !== player.guild.id) {
      global.Toast?.show({
        type: 'error',
        title: 'Territory Claimed',
        text: 'This territory is already claimed by another guild.'
      });
      return false;
    }

    tile.guild = player.guild.id;
    if (!player.guild.territory) {
      player.guild.territory = [];
    }
    player.guild.territory.push({ x, y });

    global.State?.updatePlayer({ guild: player.guild });
    if (global.Settlement && typeof global.Settlement.saveWorldMap === 'function') {
      global.Settlement.saveWorldMap();
    }

    global.Narrative?.addEntry({
      type: 'system',
      text: `Your guild has claimed territory at (${x}, ${y}). The realm recognizes your claim.`,
      meta: 'Territory Claimed'
    });

    return true;
  }

  const Guilds = {
    createGuild,
    joinGuild,
    claimTerritory
  };

  global.Guilds = Guilds;
})(window);

