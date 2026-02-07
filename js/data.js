// js/data.js

const fightersDB = [
    // Example fighter objects - these will be replaced with real data
    {
        id: 1,
        name: "Fighter One",
        nickname: "The Champion",
        height: "6'2",
        reach: "75",
        wins: 20,
        losses: 2,
        draws: 1,
        stance: "Orthodox"
    },
    {
        id: 2,
        name: "Fighter Two",
        nickname: "The Terminator",
        height: "5'10",
        reach: "72",
        wins: 15,
        losses: 5,
        draws: 0,
        stance: "Southpaw"
    },
    // More fighter objects...
];

const fighterStatsMap = {
    "Fighter One": {
        height: "6'2",
        reach: "75",
        wins: 20,
        losses: 2,
        draws: 1,
        stance: "Orthodox",
        nickname: "The Champion"
    },
    "Fighter Two": {
        height: "5'10",
        reach: "72",
        wins: 15,
        losses: 5,
        draws: 0,
        stance: "Southpaw",
        nickname: "The Terminator"
    },
    // More fighter stats...
};

export { fightersDB, fighterStatsMap };