import { Note } from "./types";

export const mockNotes: Note[] = [
  {
    id: "note-1",
    title: "Introduction to Quantum Computing",
    subject: "Physics",
    source_type: "youtube",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    tags: ["Physics", "Computing", "Future Tech"],
    bullet_summary: [
      "Quantum computing uses qubits instead of classical bits.",
      "Qubits can exist in a state of superposition, allowing parallel processing.",
      "Entanglement links qubits such that the state of one instantly affects the other.",
      "Quantum computers excel at optimization problems, cryptography, and molecular simulation.",
    ],
    treemap: {
      main_topic: "Quantum Concepts",
      subtopics: [
        {
          name: "Superposition",
          points: ["Qubits can be 0, 1, or both", "Enables massive parallelism"],
          weight: 40,
        },
        {
          name: "Entanglement",
          points: ["Spooky action at a distance", "Instantly linked states"],
          weight: 35,
        },
        {
          name: "Interference",
          points: ["Amplifies correct answers", "Cancels wrong paths"],
          weight: 25,
        },
      ],
    },
    mindmap: {
      nodes: [
        { id: "1", label: "Quantum Computing" },
        { id: "2", label: "Qubits" },
        { id: "3", label: "Superposition" },
        { id: "4", label: "Entanglement" },
      ],
      edges: [
        { source: "1", target: "2" },
        { source: "2", target: "3" },
        { source: "2", target: "4" },
      ],
    },
    flashcards: [
      {
        question: "What is a qubit?",
        answer: "The basic unit of quantum information, analogous to a classical bit but capable of superposition.",
      },
      {
        question: "What is quantum entanglement?",
        answer: "A phenomenon where particles become interconnected and the state of one instantly influences the other.",
      },
    ],
    timeline: [
      { step: "1980s", description: "Feynman proposes the concept of a quantum computer." },
      { step: "1994", description: "Shor's algorithm demonstrates quantum advantage in factoring." },
      { step: "2019", description: "Google claims quantum supremacy with Sycamore processor." },
    ],
    suggested_videos: [
      {
        title: "Quantum Computing in 5 Minutes",
        thumbnail_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=225&fit=crop",
        channel: "Tech Explained",
        video_url: "#",
      },
      {
        title: "How Quantum Computers Break Encryption",
        thumbnail_url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=225&fit=crop",
        channel: "CyberSec 101",
        video_url: "#",
      },
    ],
  },
  {
    id: "note-2",
    title: "Understanding React Server Components",
    subject: "Web Dev",
    source_type: "article",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    tags: ["React", "Web Dev", "Performance"],
    bullet_summary: [
      "RSCs render on the server and send lightweight HTML/JSON to the client.",
      "They reduce bundle size by keeping heavy dependencies on the server.",
      "Client Components are still used for interactivity (useState, useEffect).",
      "Next.js App Router heavily utilizes the RSC architecture.",
    ],
    treemap: {
      main_topic: "React Architecture",
      subtopics: [
        {
          name: "Server Components",
          points: ["Zero bundle size", "Direct DB access", "Rendered once"],
          weight: 60,
        },
        {
          name: "Client Components",
          points: ["Interactivity", "State & Effects", "Browser APIs"],
          weight: 40,
        },
      ],
    },
    mindmap: {
      nodes: [
        { id: "1", label: "React Components" },
        { id: "2", label: "Server Components (RSC)" },
        { id: "3", label: "Client Components" },
        { id: "4", label: "Data Fetching" },
      ],
      edges: [
        { source: "1", target: "2" },
        { source: "1", target: "3" },
        { source: "2", target: "4" },
      ],
    },
    flashcards: [
      {
        question: "What is the main benefit of RSCs?",
        answer: "They reduce the amount of JavaScript sent to the browser, improving performance and load times.",
      },
      {
        question: "Can you use useState in a Server Component?",
        answer: "No, hooks like useState and useEffect are strictly for Client Components.",
      },
    ],
    timeline: [
      { step: "2020", description: "React team introduces the initial RFC for Server Components." },
      { step: "2022", description: "Next.js 13 launches with the App Router, bringing RSCs to the mainstream." },
      { step: "2024", description: "Widespread adoption and stabilization of the RSC paradigm." },
    ],
    suggested_videos: [
      {
        title: "RSC Explained for Beginners",
        thumbnail_url: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=225&fit=crop",
        channel: "Frontend Masters",
        video_url: "#",
      },
    ],
  },
  {
    id: "note-3",
    title: "Q3 Financial Report Analysis",
    subject: "Finance",
    source_type: "pdf",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    tags: ["Finance", "Q3", "Company"],
    bullet_summary: [
      "Overall revenue increased by 15% YoY.",
      "Operating costs rose due to supply chain disruptions.",
      "New product lines accounted for 20% of total sales.",
      "Net profit margin remained stable at 12%.",
    ],
    treemap: {
      main_topic: "Revenue Breakdown",
      subtopics: [
        {
          name: "Core Products",
          points: ["Steady growth", "High margin"],
          weight: 50,
        },
        {
          name: "New Ventures",
          points: ["High customer acquisition", "Promising outlook"],
          weight: 30,
        },
        {
          name: "Services",
          points: ["Recurring revenue", "Lower overhead"],
          weight: 20,
        },
      ],
    },
    mindmap: {
      nodes: [
        { id: "1", label: "Q3 Performance" },
        { id: "2", label: "Revenue" },
        { id: "3", label: "Costs" },
        { id: "4", label: "Profitability" },
      ],
      edges: [
        { source: "1", target: "2" },
        { source: "1", target: "3" },
        { source: "1", target: "4" },
      ],
    },
    flashcards: [
      {
        question: "By how much did revenue increase YoY?",
        answer: "Revenue increased by 15% year-over-year.",
      },
      {
        question: "What was the net profit margin?",
        answer: "The net profit margin was stable at 12%.",
      },
    ],
    timeline: [
      { step: "July", description: "Strong start to the quarter driven by summer promotions." },
      { step: "August", description: "Slight dip in sales due to supply chain issues." },
      { step: "September", description: "Recovery and push to meet quarterly targets." },
    ],
    suggested_videos: [
      {
        title: "How to Read Financial Statements",
        thumbnail_url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=225&fit=crop",
        channel: "Business Basics",
        video_url: "#",
      },
    ],
  }
];
