/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["sequelize", "sqlite3"]
};

module.exports = nextConfig;
