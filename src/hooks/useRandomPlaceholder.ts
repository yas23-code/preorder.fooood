import { useState, useEffect } from "react";

const SEARCH_PLACEHOLDERS = [
  "Search for tasty stuff 👀",
  "Discover delicious treats 🍕",
  "What sounds good? 🎯",
  "Feed the hunger monster 👹",
  "Treat yourself today 🎁",
  "Let's get you fed! 🍴",
  "Munchies calling? 📞",
  "Food hunt begins now 🏹",
  "Belly rumbling? 🥁",
  "Chef's kiss awaits 👨‍🍳",
  "Nom nom time! 🐹",
];

export function useRandomPlaceholder() {
  const [placeholder, setPlaceholder] = useState(
    () => SEARCH_PLACEHOLDERS[Math.floor(Math.random() * SEARCH_PLACEHOLDERS.length)],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholder(SEARCH_PLACEHOLDERS[Math.floor(Math.random() * SEARCH_PLACEHOLDERS.length)]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return placeholder;
}
