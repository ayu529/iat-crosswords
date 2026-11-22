/*
 * puzzles.js — example question banks + a tiny data-access layer.
 *
 * The rest of the app only talks to `window.PuzzleAPI`. When the backend
 * exists, replace the bodies of these functions with fetch() calls (see the
 * comments) and delete the BANKS array. Nothing else needs to change.
 *
 * Bank shape:   { id, name, entries: [{ clue, answer }, ...] }
 * Answers may contain spaces; they are stripped and upper-cased by the app.
 */
(function () {
  'use strict';

  const BANKS = [
    {
      id: 'general',
      name: 'General Knowledge',
      entries: [
        { clue: 'Capital of France', answer: 'PARIS' },
        { clue: 'Largest ocean on Earth', answer: 'PACIFIC' },
        { clue: 'Instrument with 88 keys', answer: 'PIANO' },
        { clue: 'Tallest mountain in the world', answer: 'EVEREST' },
        { clue: 'Author of "Romeo and Juliet"', answer: 'SHAKESPEARE' },
        { clue: 'The Red Planet', answer: 'MARS' },
        { clue: 'Frozen water', answer: 'ICE' },
        { clue: 'Number of continents', answer: 'SEVEN' },
        { clue: 'Currency of Japan', answer: 'YEN' },
        { clue: 'Longest river in Africa', answer: 'NILE' },
        { clue: 'Ancient tomb at Giza', answer: 'PYRAMID' },
        { clue: 'Main language spoken in Brazil', answer: 'PORTUGUESE' },
      ],
    },
    {
      id: 'science',
      name: 'Science',
      entries: [
        { clue: 'H2O, more commonly', answer: 'WATER' },
        { clue: 'Center of an atom', answer: 'NUCLEUS' },
        { clue: 'Force that keeps us on the ground', answer: 'GRAVITY' },
        { clue: 'Gas we need to breathe', answer: 'OXYGEN' },
        { clue: 'Unit of electrical resistance', answer: 'OHM' },
        { clue: 'The star at the center of our solar system', answer: 'SUN' },
        { clue: 'Study of living things', answer: 'BIOLOGY' },
        { clue: 'Negatively charged particle', answer: 'ELECTRON' },
        { clue: 'Green pigment in plants', answer: 'CHLOROPHYLL' },
        { clue: 'Molecule that carries genetic information', answer: 'DNA' },
        { clue: 'State of matter between solid and gas', answer: 'LIQUID' },
        { clue: 'Physicist behind the theory of relativity', answer: 'EINSTEIN' },
        { clue: 'Organ that pumps blood', answer: 'HEART' },
      ],
    },
    {
      id: 'animals',
      name: 'Animals',
      entries: [
        { clue: 'Largest land animal', answer: 'ELEPHANT' },
        { clue: 'King of the jungle', answer: 'LION' },
        { clue: 'Black-and-white bear from China', answer: 'PANDA' },
        { clue: 'Flightless bird of Antarctica', answer: 'PENGUIN' },
        { clue: 'Fastest land animal', answer: 'CHEETAH' },
        { clue: 'Tallest animal, thanks to its neck', answer: 'GIRAFFE' },
        { clue: 'Eight-armed sea creature', answer: 'OCTOPUS' },
        { clue: 'Ocean giant that spouts water', answer: 'WHALE' },
        { clue: "Man's best friend", answer: 'DOG' },
        { clue: 'Striped African horse', answer: 'ZEBRA' },
        { clue: 'Lizard that changes color', answer: 'CHAMELEON' },
        { clue: 'Hopper with a pouch', answer: 'KANGAROO' },
        { clue: 'Nocturnal bird that hoots', answer: 'OWL' },
      ],
    },
  ];

  const clone = (x) => JSON.parse(JSON.stringify(x));

  window.PuzzleAPI = {
    /** List available banks (id + name only). */
    async listBanks() {
      // Backend: return (await fetch('/api/banks')).json();
      return BANKS.map(({ id, name }) => ({ id, name }));
    },

    /** Fetch one full bank by id. */
    async getBank(id) {
      // Backend: return (await fetch(`/api/banks/${id}`)).json();
      const bank = BANKS.find((b) => b.id === id);
      if (!bank) throw new Error(`Unknown bank: ${id}`);
      return clone(bank);
    },

    /** Fetch a random bank, avoiding `excludeId` when possible. */
    async getRandomBank(excludeId) {
      // Backend: return (await fetch(`/api/banks/random?exclude=${excludeId ?? ''}`)).json();
      const pool = BANKS.length > 1 ? BANKS.filter((b) => b.id !== excludeId) : BANKS;
      return clone(pool[Math.floor(Math.random() * pool.length)]);
    },
  };
})();
