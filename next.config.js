/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/a/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: buildCsp() },
        ],
      },
    ];
  },
};

function buildCsp() {
  const isDev = process.env.NODE_ENV === 'development';
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

  const policies = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'", "https://apis.google.com"],
    'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    'img-src': ["'self'", 'data:', 'https://lh3.googleusercontent.com', 'https://images.unsplash.com'],
    'font-src': ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com", 'data:'],
    'connect-src': [
      "'self'",
      'https://*.googleapis.com',
      'https://securetoken.googleapis.com',
      `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
      `https://europe-west1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net`,
      isDev ? "http://127.0.0.1:5001" : '',
      isDev ? "http://127.0.0.1:9099" : '',
    ].filter(Boolean),
    'frame-src': ["'self'", "https://accounts.google.com", authDomain],
    'frame-ancestors': ["'none'"],
  };

  return Object.entries(policies)
    .map(([key, value]) => `${key} ${value.join(' ')}`)
    .join('; ');
}

module.exports = nextConfig;