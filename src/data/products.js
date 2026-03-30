// src/data/products.js
export const PRODUCTS = [
  // ===== MERCH =====
  {
    id: "p1",
    type: "MERCH",
    brand: "Tokaido",
    name: "Traditional Gi - Heavyweight",
    price: 189,
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1520975916662-2b2c1a62ca61?auto=format&fit=crop&w=1200&q=60",
    category: "Gi",
    color: "White",
  },
  {
    id: "p2",
    type: "MERCH",
    brand: "Shureido",
    name: "Competition Gi - Lightweight",
    price: 159,
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1520975882800-9e37f1c0c8c5?auto=format&fit=crop&w=1200&q=60",
    category: "Gi",
    color: "White",
  },
  {
    id: "p3",
    type: "MERCH",
    brand: "Tokaido",
    name: "Obi Belt - Black",
    price: 29,
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=60",
    category: "Belts",
    color: "Black",
  },
  {
    id: "p4",
    type: "MERCH",
    brand: "Hayashi",
    name: "Premium Karate Gloves",
    price: 45,
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=60",
    category: "Protection",
    color: "Black",
  },
  {
    id: "p5",
    type: "MERCH",
    brand: "Arawaza",
    name: "Shin Guards - Competition",
    price: 59,
    rating: 4.6,
    image:
      "https://images.unsplash.com/photo-1517964603305-11c0f6f66012?auto=format&fit=crop&w=1200&q=60",
    category: "Protection",
    color: "Black",
  },
  {
    id: "p6",
    type: "MERCH",
    brand: "Shureido",
    name: "Kata Gi - Master Series",
    price: 249,
    rating: 5.0,
    image:
      "https://images.unsplash.com/photo-1526406915894-6c228685b2b4?auto=format&fit=crop&w=1200&q=60",
    category: "Gi",
    color: "White",
  },

  // ===== TRAINING / REGISTRATION =====
  {
    id: "t-spring-2026",
    type: "REGISTRATION",
    brand: "Training",
    name: "Spring semester training (2026)",
    price: 320,
    rating: 5.0,
    image: "/images/placeholder.png",
    category: "Training",
    color: "—",

    // Frístundastyrkur settings
    leisureGrantEligible: true,
    durationWeeks: 12, // MUST be >= 8 to be eligible in Checkout

    // Form schema used in Checkout
    registration: {
      requiresAthleteName: true,
      requiresAthleteDob: true,
      requiresGuardian: true,
      requiresNotes: false,
    },
  },
  {
    id: "t-summer-camp-2026",
    type: "REGISTRATION",
    brand: "Training",
    name: "Summer training camp (2026)",
    price: 180,
    rating: 4.8,
    image: "/images/placeholder.png",
    category: "Training",
    color: "—",

    leisureGrantEligible: true,
    durationWeeks: 8,

    registration: {
      requiresAthleteName: true,
      requiresAthleteDob: true,
      requiresGuardian: true,
      requiresNotes: true,
    },
  },
  {
    id: "t-short-course-4w",
    type: "REGISTRATION",
    brand: "Training",
    name: "Short intro course (4 weeks) - NOT eligible",
    price: 90,
    rating: 4.6,
    image: "/images/placeholder.png",
    category: "Training",
    color: "—",

    leisureGrantEligible: true,
    durationWeeks: 4, // < 8 => Checkout will show not eligible

    registration: {
      requiresAthleteName: true,
      requiresAthleteDob: true,
      requiresGuardian: false,
      requiresNotes: false,
    },
  },
];
