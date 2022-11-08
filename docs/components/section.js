import { MDXProvider, useMDXComponents } from '@mdx-js/react'
import { NavSection } from '@carbonplan/layouts'
import { Code } from '@carbonplan/prism'
import { useThemedStylesWithMdx } from '@theme-ui/mdx'
import { contents } from './contents'

const components = {
  pre: Code,
}

const Section = ({ children, name }) => {
  const styledComponents = useThemedStylesWithMdx(useMDXComponents(components))
  return (
    <MDXProvider components={styledComponents}>
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
