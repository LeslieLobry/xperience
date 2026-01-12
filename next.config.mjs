/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "xperience-images.s3.eu-west-3.amazonaws.com",
      "x-perience-images2.s3.eu-west-3.amazonaws.com",
    ],
  },

  async headers() {
    return [
      {
        // Applique les headers CORS à toutes les routes API
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
