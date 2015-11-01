var Player = require('./Player_mdl.js');

var Game = function(gameId, player1, player2, channel) {
  this.gameId = gameId || null;
  this.player1 = player1 || null;
  this.player2 = player2 || null;
  this.channel = channel || null;

  this.addPlayer = function(playerName) {
    if(this.player1 == null) {
      this.player1 = Player.fromName(playerName);
      return this.player1;
    } else if (this.player2 == null) {
      this.player2 = Player.fromName(playerName);
      return this.player2;
    } else {
      throw new Error('Can\'t add player. Game is full.');
    }
  };

  this.getPlayerByName = function(playerName) {
    if(this.player1 != null && this.player1.name == playerName){
      return this.player1;
    } else if(this.player2 != null && this.player2.name == playerName) {
      return this.player2;
    } else {
      return this.addPlayer(playerName);
    }
  };

  this.choosePokemon = function(playerName, pokemonName) {
    this.getPlayerByName(playerName).choosePokemon(pokemonName);
  };

  this.getAllowedMoves = function(playerName, pokemonName){
    this.getPlayerByName(playerName).getAllowedMoves(pokemonName);
  };

  this.addAllowedMove = function(playerName, pokemonName, move) {
    this.getPlayerByName(playerName).addAllowedMove(pokemonName, move);
  };

  this.setPokemonType = function(playerName, pokemonName, typeArray) {
    this.getPlayerByName(playerName).setPokemonType(pokemonName, typeArray);
  };

  this.setActivePokemonHP = function(playerName, hp) {
    this.getPlayerByName(playerName).setActivePokemonHP(hp);
  };

  this.getActivePokemonHP = function(playerName, hp) {
    this.getPlayerByName(playerName).getActivePokemonHP(hp);
  };

  this.damageActivePokemon = function(playerName, damage) {
    this.getPlayerByName(playerName).damageActivePokemonHP(damage);
  };
};

Game.prototype = new Game();
Game.prototype.constructor = Game;

module.exports.fromName = function(name) {
  return new Game(name);
};

module.exports.fromJSON = function(json) {
  return new Game(json.gameId, Player.fromJSON(json.player1), Player.fromJSON(json.player2), json.channel);
};
