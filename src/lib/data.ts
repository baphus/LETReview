import type { Question, Pet } from "./types";

export const sampleQuestions: Question[] = [
  // General Education
  {
    id: 1,
    category: "gen_education",
    difficulty: "easy",
    question: "What is the capital of the Philippines?",
    answer: "Manila",
    explanation: "Manila was declared the capital of the Philippines in 1571.",
  },
  {
    id: 2,
    category: "gen_education",
    difficulty: "easy",
    question: "Who is the national hero of the Philippines?",
    answer: "Jose Rizal",
    explanation: "Jose Rizal is widely considered the greatest Filipino hero.",
  },
  {
    id: 3,
    category: "gen_education",
    difficulty: "medium",
    question: "What is the longest river in the Philippines?",
    answer: "Cagayan River",
    explanation: "The Cagayan River, also known as the Rio Grande de Cagayan, is the longest river in the Philippines.",
  },
  {
    id: 4,
    category: "gen_education",
    difficulty: "hard",
    question: "The 'Cry of Pugad Lawin' marked the start of what historical event?",
    answer: "Philippine Revolution",
    explanation: "It was the beginning of the Philippine Revolution against Spanish rule in 1896.",
  },
  {
    id: 5,
    category: "gen_education",
    difficulty: "medium",
    question: "What is the chemical symbol for Gold?",
    answer: "Au",
    explanation: "Au comes from the Latin word for gold, 'aurum'.",
  },

  // Professional Education
  {
    id: 6,
    category: "professional",
    difficulty: "easy",
    question: "Which educational philosophy emphasizes the importance of student-centered learning?",
    answer: "Progressivism",
    explanation: "Progressivism believes that education should focus on the whole child, rather than on the content or the teacher.",
  },
  {
    id: 7,
    category: "professional",
    difficulty: "medium",
    question: "What is the highest level in Bloom's Taxonomy (original version)?",
    answer: "Evaluation",
    explanation: "In the original taxonomy, the levels are Knowledge, Comprehension, Application, Analysis, Synthesis, and Evaluation.",
  },
  {
    id: 8,
    category: "professional",
    difficulty: "hard",
    question: "What does the 'Zone of Proximal Development' (ZPD) by Lev Vygotsky refer to?",
    answer: "The difference between what a learner can do without help and what they can achieve with guidance.",
    explanation: "ZPD is a key concept in Vygotsky's sociocultural theory of learning.",
  },
  {
    id: 9,
    category: "professional",
    difficulty: "medium",
    question: "RA 7836 is also known as the...",
    answer: "Philippine Teachers Professionalization Act of 1994",
    explanation: "This act strengthened the regulation and supervision of the practice of teaching in the Philippines.",
  },
  {
    id: 10,
    category: "professional",
    difficulty: "easy",
    question: "What type of assessment is conducted at the end of a unit to measure student learning?",
    answer: "Summative Assessment",
    explanation: "Summative assessments are used to evaluate student learning, skill acquisition, and academic achievement at the conclusion of a defined instructional period.",
  },
];

export const pets: Pet[] = [
    { name: "Pet Rock", unlock_criteria: "3-day streak", points: 5, image: "https://placehold.co/200x200", hint: "rock stone" },
    { name: "Pet Fish", unlock_criteria: "7-day streak", points: 10, image: "https://placehold.co/200x200", hint: "goldfish fishbowl" },
    { name: "Pet Cat", unlock_criteria: "14-day streak", points: 20, image: "https://placehold.co/200x200", hint: "cute kitten" },
    { name: "Pet Dragon", unlock_criteria: "30-day streak", points: 50, image: "https://placehold.co/200x200", hint: "fantasy dragon" },
];
