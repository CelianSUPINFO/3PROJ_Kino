import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      colors: {
        kino: {
          DEFAULT: "#ff2e7e",
          hot: "#ff5ea1",
          dark: "#c21263",
          bg: "#0a0710",
          ink: "#0a0710",
          "ink-soft": "#14101a",
          surface: "#14101a",
          panel: "#1a1422",
          fg: "#f6f2f7",
          muted: "#a79bb0",
          gold: "#f5c76a",
          glass: "rgba(255,255,255,0.06)",
        },
      },
      boxShadow: {
        kino: "0 20px 60px -20px rgba(255,46,126,0.55)",
        glow: "0 0 0 1px rgba(255,46,126,0.35), 0 18px 50px -18px rgba(255,46,126,0.55)",
        card: "0 30px 80px -40px rgba(0,0,0,0.9)",
      },
      backdropBlur: {
        glass: "18px",
      },
      backgroundImage: {
        "hero-fade":
          "linear-gradient(180deg, rgba(10,7,16,0) 0%, rgba(10,7,16,0.55) 55%, rgba(10,7,16,1) 100%)",
        "radial-kino":
          "radial-gradient(ellipse at 85% 90%, rgba(255,46,126,0.18) 0%, rgba(10,7,16,0) 60%)",
        noise:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.95  0 0 0 0 0.85  0 0 0 0 0.9  0 0 0 0.035 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      },
      animation: {
        fadeUp: "fadeUp 0.5s ease both",
        shimmer: "shimmer 1.6s linear infinite",
        float: "float 8s ease-in-out infinite",
        pulseGlow: "pulseGlow 2.8s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulseGlow: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(255,46,126,0.45)" },
          "50%": { boxShadow: "0 0 0 14px rgba(255,46,126,0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
