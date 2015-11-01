var Pokemon = require('./Pokemon_mdl.js');

var Player = function(name, pokemon) {
  this.name = name || null;
  this.pokemon = pokemon || [];

  this.getPokemonByName = function(pokemonName) {
    for (var i = 0; i < this.pokemon.length; i++) {
      if(this.pokemon[i].name == pokemonName) {
        return this.pokemon[i];
      }
    }
    return null;
  };

  this.getPokemonIndexByName = function(pokemonName) {
    for (var i = 0; i < this.pokemon.length; i++) {
      if(this.pokemon[i].name == pokemonName) {
        return i;
      }
    }
    return null;
  };

  this.choosePokemon = function(pokemonName){
    var index = this.getPokemonIndexByName(pokemonName);
    var pokemon;

    if(index !== null){
      pokemon = this.getPokemonByName(pokemonName);
      this.pokemon.slice(index, 1);
    } else {
      pokemon = Pokemon.fromName(pokemonName);
    }

    this.pokemon.unshift(pokemon);
  };

  this.setPokemonType = function(pokemonName, typeArray) {
    return this.getPokemonByName(pokemonName).types = typeArray;
  };

  this.getActivePokemonAllowedMoves = function(){
    if(this.pokemon.length > 0) {
      return this.pokemon[0].allowedMoves;
    }
  };

  this.getActivePokemonTypes = function(){
    if(this.pokemon.length > 0) {
      return this.pokemon[0].types;
    }
  };

  this.addAllowedMove = function(pokemonName, move) {
    return this.getPokemonByName(pokemonName).addAllowedMove(move);
  };

  this.setActivePokemonHP = function(hp) {
    if(this.pokemon.length > 0) {
      this.pokemon[0].hp = hp;
    }
  };

  this.getActivePokemonHP = function(hp) {
    if(this.pokemon.length > 0) {
      return this.pokemon[0].hp;
    }
  };

  this.damageActivePokemon = function(damage) {
    if(this.pokemon.length > 0) {
      return this.pokemon[0].hp -= damage;
    }
  };
};

Player.prototype = new Player();
Player.prototype.constructor = Player;

module.exports.fromName = function(name) {
  return new Player(name);
};

module.exports.fromJSON = function(json) {
  if(!json) {
    return null;
  };

  var pokemonList = [];
  json.pokemon.forEach(function (poke) {
    pokemonList.push(Pokemon.fromJSON(poke));
  });

  return new Player(json.name, pokemonList);
};
