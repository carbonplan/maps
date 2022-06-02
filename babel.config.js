var value = {}

if (process.env.NODE_ENV === 'test') {
  value = {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {
            node: 'current',
          },
        },
      ],
    ],
  }
} else if (process.env.NODE_ENV === 'docs') {
  value = {
    presets: [
      '@babel/preset-env',
      '@babel/preset-react',
      '@babel/preset-typescript',
    ],
  }
}
module.exports = value
