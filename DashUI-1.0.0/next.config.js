/** @type {import('next').NextConfig} */
const basePath = "/dashui-template";

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  images: { unoptimized: true },
  basePath
};

module.exports = nextConfig;
