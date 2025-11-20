(function (global) {
  const MAX_PARTY_SIZE = 6;

  function createParty(leaderId, leaderName) {
    const party = {
      id: `party_${Date.now()}`,
      leader: leaderId,
      members: [leaderId],
      memberNames: { [leaderId]: leaderName },
      created: Date.now()
    };

    const player = global.State?.getPlayer();
    if (player && player.id === leaderId) {
      global.State.updatePlayer({ party: party });
    }

    global.ChatSystem?.addSystemMessage(`Party created. You are the leader.`);
    return party;
  }

  function invitePlayer(playerId, playerName) {
    const player = global.State?.getPlayer();
    if (!player || !player.party) {
      global.ChatSystem?.addSystemMessage('You are not in a party.');
      return false;
    }

    if (player.party.leader !== player.id) {
      global.ChatSystem?.addSystemMessage('Only the party leader can invite players.');
      return false;
    }

    if (player.party.members.length >= MAX_PARTY_SIZE) {
      global.ChatSystem?.addSystemMessage('Party is full (max 6 members).');
      return false;
    }

    if (player.party.members.includes(playerId)) {
      global.ChatSystem?.addSystemMessage(`${playerName} is already in the party.`);
      return false;
    }

    // In real game, send invite to target player
    // For now, auto-accept
    player.party.members.push(playerId);
    player.party.memberNames[playerId] = playerName;
    global.State.updatePlayer({ party: player.party });

    global.ChatSystem?.addSystemMessage(`${playerName} has joined the party.`);
    global.ChatSystem?.addChatMessage('party', 'System', `${playerName} joined the party.`, 'system');

    return true;
  }

  function leaveParty() {
    const player = global.State?.getPlayer();
    if (!player || !player.party) {
      global.ChatSystem?.addSystemMessage('You are not in a party.');
      return false;
    }

    const wasLeader = player.party.leader === player.id;
    const partyName = wasLeader ? 'Your party' : 'The party';

    global.State.updatePlayer({ party: null });
    global.ChatSystem?.addSystemMessage(`You have left ${partyName}.`);

    return true;
  }

  function getPartyMembers() {
    const player = global.State?.getPlayer();
    if (!player || !player.party) return [];

    return player.party.members.map(id => ({
      id,
      name: player.party.memberNames[id] || 'Unknown'
    }));
  }

  function isInParty() {
    const player = global.State?.getPlayer();
    return !!(player && player.party);
  }

  const Party = {
    createParty,
    invitePlayer,
    leaveParty,
    getPartyMembers,
    isInParty,
    MAX_PARTY_SIZE
  };

  global.Party = Party;
})(window);

