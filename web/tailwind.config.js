/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        /** ชุดหลักตามสไตล์ HUAJAIY (burgundy / CTA / ข้อความ) */
        hui: {
          burgundy: "#7A1830",
          section: "#8A1C3A",
          cardTitle: "#A5384F",
          body: "#3B2F35",
          muted: "#8C7A80",
          cta: "#D72654",
          roseGold: "#C9878B",
          pink: "#FF6FAE",
          gold: "#E7C98A",
          goldInk: "#5A3A1A",
          placeholder: "#C7A7AD",
          surface: "#FFFCFD",
          border: "#F0D6DC",
          pageTop: "#FFF5F8",
          pageMid: "#FFEEF3",
          pageBot: "#FFD6E2"
        },
        /** ปุ่มและจุดเน้น — ใกล้เคียงเดิมแต่ผูกกับ CTA */
        brand: {
          50: "#FFF5F8",
          100: "#FFE8EE",
          200: "#F5C6D4",
          300: "#E8A0B5",
          400: "#E85D7A",
          500: "#D72654",
          600: "#C41E4A",
          700: "#8A1C3A",
          800: "#7A1830",
          900: "#5C1224"
        }
      },
      fontSize: {
        "hui-hero": ["2.5rem", { lineHeight: "1.15" }],
        "hui-h2": ["1.625rem", { lineHeight: "1.3" }],
        "hui-h3": ["1.125rem", { lineHeight: "1.35" }],
        "hui-price": ["1.5rem", { lineHeight: "1.2" }]
      },
      boxShadow: {
        soft: "0 2px 15px -3px rgb(15 23 42 / 0.08), 0 4px 6px -4px rgb(15 23 42 / 0.06)",
        game:
          "0 12px 40px -10px rgb(225 29 72 / 0.28), 0 4px 20px -6px rgb(251 113 133 / 0.35)",
        "game-sm":
          "0 8px 28px -8px rgb(225 29 72 / 0.22), 0 2px 10px -4px rgb(255 255 255 / 0.5)"
      }
    }
  },
  plugins: []
};
