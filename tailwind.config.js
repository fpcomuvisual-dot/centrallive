/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          roxo: '#7C3AED',
          rosa: '#EC4899',
        },
        fundo: '#F9FAFB',
        disponivel: '#10B981',
        esgotado: '#EF4444',
        forte: '#1F2937',
        fraco: '#9CA3AF',
      },
      backgroundImage: {
        'gradiente-primario': 'linear-gradient(90deg, #7C3AED 0%, #EC4899 100%)',
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [],
}

