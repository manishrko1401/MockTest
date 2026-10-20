// AUTO-COPIED from the website by scripts/sync-shared.mjs. Edit the website file, then run npm run sync-shared.
// Ready-made starting syllabi for the Study Planner's syllabus tracker. They follow the
// subject / topic lists of the official notifications; students can edit everything.

export type SyllabusTemplate = { id: string; name: string; nameHi: string; subjects: { name: string; chapters: string[] }[] };

const REASONING_SSC = [
  'Analogy', 'Classification (Odd one out)', 'Coding-Decoding', 'Number Series', 'Letter Series', 'Blood Relations',
  'Direction Sense', 'Order & Ranking', 'Syllogism', 'Venn Diagrams', 'Missing Number / Matrix', 'Mathematical Operations',
  'Word Arrangement (Dictionary Order)', 'Paper Folding & Cutting', 'Mirror & Water Images', 'Embedded Figures',
  'Counting Figures', 'Dice & Cubes', 'Seating Arrangement', 'Statement & Conclusion',
];
const GA_SSC = [
  'History', 'Geography', 'Indian Polity', 'Indian Economy', 'Physics', 'Chemistry', 'Biology',
  'Static GK (Art, Culture, Awards, Books)', 'Sports', 'Important Days & Events', 'Current Affairs', 'Computer Awareness',
];
const QUANT_SSC = [
  'Number System', 'Simplification', 'HCF & LCM', 'Percentage', 'Ratio & Proportion', 'Average', 'Mixture & Alligation',
  'Profit & Loss', 'Discount', 'Simple Interest', 'Compound Interest', 'Time & Work', 'Pipes & Cisterns',
  'Time, Speed & Distance', 'Boats & Streams', 'Algebra', 'Geometry', 'Mensuration', 'Trigonometry',
  'Heights & Distances', 'Data Interpretation',
];
const ENGLISH_SSC = [
  'Reading Comprehension', 'Cloze Test', 'Error Spotting', 'Sentence Improvement', 'Fill in the Blanks', 'Synonyms',
  'Antonyms', 'One Word Substitution', 'Idioms & Phrases', 'Spelling Correction', 'Active & Passive Voice',
  'Direct & Indirect Speech', 'Para Jumbles',
];

export const SYLLABUS_TEMPLATES: SyllabusTemplate[] = [
  {
    id: 'ssc-cgl-t1', name: 'SSC CGL Tier 1', nameHi: 'एसएससी सीजीएल टियर 1',
    subjects: [
      { name: 'General Intelligence & Reasoning', chapters: REASONING_SSC },
      { name: 'General Awareness', chapters: GA_SSC },
      { name: 'Quantitative Aptitude', chapters: QUANT_SSC },
      { name: 'English Comprehension', chapters: ENGLISH_SSC },
    ],
  },
  {
    id: 'ssc-chsl-t1', name: 'SSC CHSL Tier 1', nameHi: 'एसएससी सीएचएसएल टियर 1',
    subjects: [
      { name: 'English Language', chapters: ENGLISH_SSC },
      { name: 'General Intelligence', chapters: REASONING_SSC },
      { name: 'Quantitative Aptitude', chapters: QUANT_SSC.filter(c => c !== 'Heights & Distances' && c !== 'Boats & Streams') },
      { name: 'General Awareness', chapters: GA_SSC },
    ],
  },
  {
    id: 'rrb-ntpc-cbt1', name: 'RRB NTPC CBT 1', nameHi: 'आरआरबी एनटीपीसी सीबीटी 1',
    subjects: [
      {
        name: 'Mathematics',
        chapters: [
          'Number System', 'Decimals & Fractions', 'LCM & HCF', 'Ratio & Proportion', 'Percentage', 'Mensuration',
          'Time & Work', 'Time & Distance', 'Simple & Compound Interest', 'Profit & Loss', 'Elementary Algebra',
          'Geometry & Trigonometry', 'Elementary Statistics',
        ],
      },
      {
        name: 'General Intelligence & Reasoning',
        chapters: [
          'Analogies', 'Number & Alphabet Series', 'Coding-Decoding', 'Mathematical Operations', 'Similarities & Differences',
          'Relationships', 'Analytical Reasoning', 'Syllogism', 'Jumbling', 'Venn Diagrams', 'Puzzles', 'Data Sufficiency',
          'Statement – Conclusion', 'Statement – Courses of Action', 'Decision Making', 'Maps', 'Interpretation of Graphs',
        ],
      },
      {
        name: 'General Awareness',
        chapters: [
          'Current Events', 'Games & Sports', 'Art & Culture of India', 'Indian Literature', 'Monuments & Places of India',
          'General Science (up to Class 10)', 'History of India & Freedom Struggle', 'Geography of India & World',
          'Indian Polity & Governance', 'Indian Economy', 'Space & Nuclear Programmes of India', 'UN & World Organisations',
          'Environmental Issues', 'Basics of Computers', 'Abbreviations', 'Transport Systems in India',
          'Famous Personalities', 'Government Flagship Programmes', 'Flora & Fauna of India', 'Important Government Bodies',
        ],
      },
    ],
  },
];
