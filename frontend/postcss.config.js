const plugins = [require('tailwindcss')];

try {
  // Attempt to include autoprefixer when available.
  // eslint-disable-next-line global-require
  plugins.push(require('autoprefixer'));
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') {
    throw error;
  }
}

module.exports = {
  plugins,
};
