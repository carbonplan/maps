import remarkGfm from 'remark-gfm'
import nextMDX from '@next/mdx'

const isDev =
  process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'development'

const withMDX = nextMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [remarkGfm],
    format: 'mdx',
  },
})

export default withMDX({
  pageExtensions: ['js', 'jsx', 'mdx', 'md'],
  assetPrefix: isDev ? '' : 'https://maps.docs.carbonplan.org',
})
