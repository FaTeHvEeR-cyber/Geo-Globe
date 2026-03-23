import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
    darkMode: "class",
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
        extend: {
                colors: {
                        // Original shadcn colors (kept for compatibility)
                        background: 'hsl(var(--background))',
                        foreground: 'hsl(var(--foreground))',
                        card: {
                                DEFAULT: 'hsl(var(--card))',
                                foreground: 'hsl(var(--card-foreground))'
                        },
                        popover: {
                                DEFAULT: 'hsl(var(--popover))',
                                foreground: 'hsl(var(--popover-foreground))'
                        },
                        primary: {
                                DEFAULT: 'hsl(var(--primary))',
                                foreground: 'hsl(var(--primary-foreground))'
                        },
                        secondary: {
                                DEFAULT: 'hsl(var(--secondary))',
                                foreground: 'hsl(var(--secondary-foreground))'
                        },
                        muted: {
                                DEFAULT: 'hsl(var(--muted))',
                                foreground: 'hsl(var(--muted-foreground))'
                        },
                        accent: {
                                DEFAULT: 'hsl(var(--accent))',
                                foreground: 'hsl(var(--accent-foreground))'
                        },
                        destructive: {
                                DEFAULT: 'hsl(var(--destructive))',
                                foreground: 'hsl(var(--destructive-foreground))'
                        },
                        border: 'hsl(var(--border))',
                        input: 'hsl(var(--input))',
                        ring: 'hsl(var(--ring))',
                        chart: {
                                '1': 'hsl(var(--chart-1))',
                                '2': 'hsl(var(--chart-2))',
                                '3': 'hsl(var(--chart-3))',
                                '4': 'hsl(var(--chart-4))',
                                '5': 'hsl(var(--chart-5))'
                        },
                        // Retro tactical theme colors
                        tactical: {
                                green: '#39FF14',
                                greenDim: '#2be800',
                                greenGlow: '#8eff71',
                                cyan: '#00E3FD',
                                cyanDim: '#00d4ec',
                                orange: '#ff9f4a',
                                orangeDim: '#ed8200',
                                surface: '#0e0e0e',
                                surfaceBright: '#2c2c2c',
                                surfaceContainer: '#191a1a',
                                surfaceContainerHigh: '#1f2020',
                                surfaceContainerHighest: '#262626',
                                surfaceContainerLow: '#131313',
                                surfaceContainerLowest: '#000000',
                                outline: '#767575',
                                outlineVariant: '#484848',
                                onSurface: '#ffffff',
                                onSurfaceVariant: '#adaaaa',
                        }
                },
                borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: 'calc(var(--radius) - 4px)',
                        DEFAULT: '0px',
                        xl: '0px',
                        full: '9999px'
                },
                fontFamily: {
                        headline: ['Space Grotesk', 'sans-serif'],
                        body: ['Inter', 'sans-serif'],
                        label: ['Space Grotesk', 'sans-serif'],
                },
                boxShadow: {
                        'glow-green': '0 0 15px rgba(57, 255, 20, 0.3)',
                        'glow-cyan': '0 0 15px rgba(0, 227, 253, 0.3)',
                }
        }
  },
  plugins: [tailwindcssAnimate],
};
export default config;
