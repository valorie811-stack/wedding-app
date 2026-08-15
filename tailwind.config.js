/** @type {import('tailwindcss').Config} */
const t = require("./lib/tokens");

module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./context/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm neutral chrome. Replaces the old cool `ink` scale, which has been
        // fully migrated to stone-* across app/, components/, lib/ and context/.
        stone: t.stone,
        matcha: t.matcha,
        hp: t.hp,
        kk: t.kk,
        gold: t.gold,
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        // The old `serif` utility is remapped to mono: the matcha direction has
        // no serif voice, and display text is set in mono.
        serif: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: {
        // The template's signature: 0.825px at 15px ≈ 0.055em.
        chrome: "0.055em",
      },
      borderRadius: {
        xl2: "1rem",
      },
      boxShadow: {
        // The matcha look is flat. These stay defined so existing shadow-card
        // and shadow-pop utilities resolve, but they are near-invisible now.
        card: "0 1px 2px 0 rgba(55,53,47,0.04)",
        pop: "0 8px 24px -12px rgba(55,53,47,0.18)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
