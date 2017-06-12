"use strict";

var chai = require("chai");
var expect = chai.expect;

var MultiString = require('../lib/multistring').MultiString;
var SortedSet = require('../js/sortedset').SortedSet;

var as_labels = function(acc, obj) {
  if (typeof(acc) != 'string') {
    acc = acc.label;
  }
  return acc + ';' + obj.label;
};

describe("MultiString and SortedSet work together", function() {
  it("changing langpath changes sort order", function() {
    var pets = SortedSet().sort_on('label');
    pets.add({label: (new MultiString('dog', 'en',
                                      'chein', 'fr',
                                      'Hund', 'de'))});
    pets.add({label: (new MultiString('cat', 'en',
                                      'chat', 'fr',
                                      'Katze', 'de'))});
    pets.add({label: (new MultiString('mouse', 'en',
                                      'souris', 'fr',
                                      'Maus', 'de'))});
    MultiString.set_langpath('fr');
    pets.resort();
    expect(pets.reduce(as_labels)).to.eql('chat;chein;souris');
    MultiString.set_langpath('de:fr:en');
    pets.resort();
    expect(pets.reduce(as_labels)).to.eql('Hund;Katze;Maus');
    MultiString.set_langpath('en');
    pets.resort();
    expect(pets.reduce(as_labels)).to.eql('cat;dog;mouse');
  });
});
