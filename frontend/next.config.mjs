import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    // Resolve @backend/* → <frontend>/backend/*
    config.resolve.alias["@backend"] = path.join(__dirname, "backend");
    // Resolve @/* → <frontend>/* (components, app, lib, etc.)
    config.resolve.alias["@"] = path.join(__dirname, "");
    return config;
  },
};

export default nextConfig;
