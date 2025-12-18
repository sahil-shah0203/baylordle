export type Group = {
  id: string;
  title: string;
  color: "yellow" | "green" | "blue" | "purple";
  words: [string, string, string, string];
};

export type Puzzle = {
  date: string; // YYYY-MM-DD
  groups: [Group, Group, Group, Group];
};

export const PUZZLES: Puzzle[] = [
  {
    date: "2025-12-18",
    groups: [
      { id: "y1", title: "KINDS OF FRUIT", color: "yellow", words: ["APPLE","PEAR","PLUM","KIWI"] },
      { id: "g1", title: "DANCE MOVES", color: "green", words: ["TWIST","SLIDE","WAVE","STEP"] },
      { id: "b1", title: "PROGRAMMING TERMS", color: "blue", words: ["STACK","QUEUE","HEAP","TREE"] },
      { id: "p1", title: "WORDS WITH SILENT KN", color: "purple", words: ["KNIFE","KNEE","KNOT","KNIGHT"] },
    ],
  },
];
