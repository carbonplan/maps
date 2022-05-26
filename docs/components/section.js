import { MDXProvider } from '@mdx-js/react'
import { NavSection } from '@carbonplan/layouts'
import { Code, Pre } from '@carbonplan/prism'
import { contents } from './contents'

const components = {
  code: Code,
  pre: Pre,
}

const Section = ({ children, name }) => {
  return (
    <MDXProvider components={components}>
      <NavSection
        name={name}
        menu={{ contents, prefix: '/maps' }}
        title={`${name[0].toUpperCase() + name.slice(1)} – CarbonPlan`}
        description={'TK'}
      >
        {children}
      </NavSection>
    </MDXProvider>
  )
}

export default Section
