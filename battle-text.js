var pokeapi = require('./poke-api.js');
var stateMachine = require('./state-machine.js');
var moves = require('./move-types.js');
var Q = require('q');

module.exports = {}

/*
 * Return a text string when the battle starts.
 * Stores the player's Slack username and what channel the battle is in,
 * and chooses a Pokemon for the NPC from the original 151.
 */
module.exports.startBattle = function(slackData) {
  var textString = "OK {name}, I'll battle you! ".replace("{name}", slackData.user_name);
  var dex_no = Math.ceil(Math.random() * 151);

  var chooseNpcPokemon = function() {
    return module.exports.npcChoosePokemon(dex_no);
  },

  createNpcAnnouncement = function(pkmnChoice){
    return {
      text: textString + '\n' + pkmnChoice.text,
      spriteUrl: pkmnChoice.spriteUrl
    }
  };

  return stateMachine.newBattle(slackData.user_name, slackData.channel_name)
  .then( chooseNpcPokemon )
  .then( createNpcAnnouncement )
}

/*
 * Return a text string when the user chooses a Pokemon.
 * Fetch the pokemon from the API, choose 4 random moves, write them to REDIS,
 * and then return a message stating the pokemon, its HP, and its moves.
 */
module.exports.userChoosePokemon = function(slackData) {
  debugger;
  var commandArray = slackData.text.toLowerCase().split(" ");
  var commandString = commandArray.join(" ");
  var pokemonName = commandArray[2];
  var textString = "You chose {pkmnn}. It has {hp} HP, and knows ";
  var moves = [];
  var movePromises = [];

  //validate that the command was "pkmn i choose {pokemon}"
  if(!commandString.match(/i choose/i)) {
    return module.exports.unrecognizedCommand(commandsArray);
  }

  return pokeapi.getPokemon(pokemonName).then(function(pkmndata){
    initRandomMoveSet(pkmndata.moves, moves, movePromises, textString, 'player');

    var setUserHP = function(){
      return stateMachine.setUserHP(pkmndata.hp);
    },

    setUserPkmnTypes = function(){
      return stateMachine.setUserPkmnTypes(pkmndata.types.map(function(val){
        return val.name;
      }));
    },

    setTextString = function(){
      textString = textString.replace("{pkmnn}", pkmndata.name);
      textString = textString.replace("{hp}", pkmndata.hp);
      var stringy = "" + pkmndata.pkdx_id;
      if (stringy.length == 1) {
        stringy = "00" + stringy;
      } else if (stringy.length == 2) {
        stringy = "0" + stringy;
      }
      return {
        text: textString,
        spriteUrl: "http://sprites.pokecheck.org/i/"+stringy+".gif"
      }
    };

    return Q.allSettled(movePromises)
    .then( setUserHP )
    .then( setUserPkmnTypes )
    .then( setTextString );
  });
}

/*
 * Return a text string when the NPC chooses a Pokemon.
 * Fetch the pokemon from the API, choose 4 random moves, write them to REDIS,
 * and then return a message stating the pokemon.
 */
module.exports.npcChoosePokemon = function(dex_no) {
  var textString = "I Choose {pkmnn}!";
  var moves = [];
  var movePromises = [];

  return pokeapi.getPokemon(dex_no).then(function(pkmnData){
    initRandomMoveSet(pkmnData.moves, moves, movePromises, textString, 'npc');

    var setNpcHP = function(){
      return stateMachine.setNpcHP(pkmnData.hp);
    },

    setNpcPkmn = function(){
      return stateMachine.setNpcPkmnTypes(pkmnData.types.map(function(val){
        return val.name;
      }));
    },

    setNpcTextString = function(){
      textString = textString.replace("{pkmnn}", pkmnData.name);
      var stringy = "" + pkmnData.pkdx_id;
      if (stringy.length == 1) {
        stringy = "00" + stringy;
      } else if (stringy.length == 2) {
        stringy = "0" + stringy;
      }
      return {
        text: textString,
        spriteUrl: "http://sprites.pokecheck.org/i/"+stringy+".gif"
      }
    };

    return Q.allSettled(movePromises)
    .then( setNpcHP )
    .then( setNpcPkmn )
    .then( setNpcTextString );
  });
}

/*
<<<<<<< HEAD
 * When the user uses a move, calculate the results of the user's turn,
 * then the NPC's turn. If either one of them ends the battle, don't show
 * the other result.
 */
module.exports.useMove = function(moveName) {
  var printResults = function(results){
    if(results[1] === "You Beat Me!") {
      return results[1];
    } else if (results[0] === "You Lost!") {
      return results[0];
    } else {
      return results[1] + "\n" + results[0];
    }
  };

  return Q.all([useMoveNpc(), useMoveUser(moveName)])
  .then( printResults )
}

/*
 * Return a text string when the command doesn't match defined commands.
 */
module.exports.unrecognizedCommand = function(commandsArray) {
  var textString = "I don't recognize the command _{cmd}_ .";
  //get rid of the 'pkmn'
  commandsArray.shift();
  textString = textString.replace("{cmd}", commandsArray.join(" "));
  return Q.fcall(function(){ return textString; });
}

module.exports.endBattle = function(slackData) {
  return stateMachine.endBattle(slackData.user_name);
}


////////////////////////////////
//        Private Methods     //
////////////////////////////////

function initRandomMoveSet(moveList, moves, movePromises, textString, trainer) {
  moves = shuffle(moveList);
  var stateCallback = (trainer === 'npc') ? stateMachine.addMoveNPC : stateMachine.addMove;
  for(var i = 0; i < 4; i++) {
    movePromises.push(
      pokeapi.getMove("http://pokeapi.co"+moves[i].resource_uri)
      .then(stateCallback)
    )
    //format: "vine whip, leer, solar beam, and tackle."
    if(i < 3) {
      textString += moves[i].name;
      textString += ", ";
    } else {
      textString += "and ";
      textString += moves[i].name;
      textString += ".";
    }
  }
}

var effectivenessMessage = function(mult) {
  switch(mult) {
    case 0:
      return "It doesn't have an effect. ";
      break;
    case 0.5:
    case 0.25:
      return "It's not very effective... ";
      break;
    case 1:
      return " ";
      break;
    case 2:
    case 4:
      return "It's super effective! ";
      break;
    default:
      return " ";
      break;
  }
}

/*
 * Helper function for using one of the NPC's pokemon's move.
 * First check to see if the move is among the allowed moves,
 * calculate the type effectiveness, calculate the damage,
 * and then return a message.
 */
var useMoveNpc = function() {
  var textString = "I used {mvname}! {effctv}";
  var textStringDmg = "It did {dmg} damage, leaving you with {hp}HP!";
  var randMove = Math.floor(Math.random() * 4);
  var moveData;
  var multiplier;
  var totalDamage;

  var getNpcUsageMove = function(moves){
    textString = textString.replace("{mvname}", moves[randMove]);
    return stateMachine.getSingleMove(moves[randMove]);
  },

  getUserPkmnType = function(_moveData){
    moveData = _moveData;
    return stateMachine.getUserPkmnTypes()
  },

  getAttackMultiplier = function(types){
    return pokeapi.getAttackMultiplier(moveData.type, types[0], types[1])
  },

  doDamage = function(multiplier){
    totalDamage = Math.ceil( (moveData.power / 5) * multiplier )
    return stateMachine.doDamageToUser(totalDamage)
  },

  formOutcomeText = function(hpRemaining){
    if(parseInt(hpRemaining, 10) <= 0) {
      return stateMachine.endBattle()
      .then(function(){
        return "You Lost!";
      })
    }
    textString = textString.replace("{effctv}", effectivenessMessage(multiplier));
    textStringDmg = textStringDmg.replace("{dmg}", totalDamage);
    textStringDmg = textStringDmg.replace("{hp}", hpRemaining);
    if(multiplier == 0)
      return textString;
    return textString + textStringDmg;
  }

  return stateMachine.getNpcAllowedMoves()
  .then( getNpcUsageMove )
  .then( getUserPkmnType )
  .then( getAttackMultiplier )
  .then( doDamage )
  .then( formOutcomeText )
}

/*
 * Helper function for using one of the user's pokemon's move.
 * First check to see if the move is among the allowed moves,
 * calculate the type effectiveness, calculate the damage,
 * and then return a message.
 */
var useMoveUser = function(moveName) {
  var textString = "You used {mvname}! {effctv}";
  var textStringDmg = "It did {dmg} damage, leaving me with {hp}HP!";
  var moveData;
  var multiplier;
  var totalDamage;

  var getUserMove = function(moves){
    if(moves.indexOf(moveName) !== -1) {
      return stateMachine.getSingleMove(moveName);
    } else {
      throw new Error("Your pokemon doesn't know that move.");
    }
  },

  getNpcPkmnType = function(_moveData){
    textString = textString.replace("{mvname}", moveName);
    moveData = _moveData;
    return stateMachine.getNpcPkmnTypes()
  },

  getAttackMultiplier = function(types){
    return pokeapi.getAttackMultiplier(moveData.type, types[0], types[1])
  },

  doDamage = function(multiplier){
    totalDamage = Math.ceil( (moveData.power / 5) * multiplier )
    return stateMachine.doDamageToNpc(totalDamage)
  },

  formOutcomeText = function(hpRemaining){
    if(parseInt(hpRemaining, 10) <= 0) {
      return stateMachine.endBattle()
      .then(function(){
        return "You Beat Me!";
      })
    }
    textString = textString.replace("{effctv}", effectivenessMessage(multiplier));
    textStringDmg = textStringDmg.replace("{dmg}", totalDamage);
    textStringDmg = textStringDmg.replace("{hp}", hpRemaining);
    if(multiplier == 0)
      return textString;
    return textString + textStringDmg;
  }

  return stateMachine.getUserAllowedMoves()
  .then( getUserMove )
  .then( getNpcPkmnType )
  .then( getAttackMultiplier )
  .then( doDamage )
  .then( formOutcomeText )
}

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [v1.0]
function shuffle(o){ //v1.0
  for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
  return o;
};
