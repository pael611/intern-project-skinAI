/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'www.google.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'www.alodokter.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
    ],
  },
  // Help Next/Webpack resolve ESM packages like onnxruntime-web safely
  experimental: { esmExternals: 'loose' },
  webpack: (config, { isServer }) => {
    // Disable FS cache if present
    if (config.cache && config.cache.type === 'filesystem') {
      config.cache = false
    }
    // Ensure resolve/alias exists
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Never bundle Node runtime for ORT in the browser
      'onnxruntime-node': false,
      'onnxruntime-web/dist/ort.node.min.mjs': false,
      'onnxruntime-web/ort.node.min.mjs': false,
      'onnxruntime-web/dist/ort.node.mjs': false,
      'onnxruntime-web/ort.node.mjs': false,
    }
    // Avoid polyfilling Node core modules in client builds
    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        path: false,
        module: false,
      }
    }
    return config
  },
}
module.exports = nextConfig