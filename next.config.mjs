const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "maps.googleapis.com"
      },
      {
        protocol: "https",
        hostname: "cartodb-basemaps-a.global.ssl.fastly.net"
      },
      {
        protocol: "https",
        hostname: "cartodb-basemaps-b.global.ssl.fastly.net"
      },
      {
        protocol: "https",
        hostname: "cartodb-basemaps-c.global.ssl.fastly.net"
      }
    ]
  },
  async headers() {
    return [
      {
        source: "/icon-192.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      },
      {
        source: "/icon-512.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      },
      {
        source: "/icon.svg",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      },
      {
        source: "/manifest.json",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }]
      },
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }]
      }
    ];
  }
};

export default nextConfig;
