const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "maps.googleapis.com"
      }
    ]
  }
};

export default nextConfig;
