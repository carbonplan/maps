import { Box } from 'theme-ui'
import Section from '../../components/section'

# Examples

## Seaweed farming

In March 2022, we worked with a research team led by Julianne DeAngelo, Steve Davis, and colleagues to develop a [interactive mapping tool](https://carbonplan.org/research/seaweed-farming) and accompanying [explainer article](https://carbonplan.org/research/seaweed-farming-explainer) on the potential of seaweed farming for both carbon removal and biomass products.

The map was built using `@carbonplan/maps` and leveraged the ability to load multiple input layers (via array-based `selector` value) and user-specified variables (via custom `uniforms`) onto the GPU, where the technoeconomic model was implemented.

<Box
  as='iframe'
  src='https://carbonplan.org/research/seaweed-farming/embed'
  sx={{
    display: 'block',
    width: '100%',
    height: ['300px', '300px', '300px', '400px'],
    maxWidth: '1024px',
    my: [7],
    border: 'none',
  }}
/>

## CMIP6 downscaling

In support of our [CMIP6 downscaling work](https://github.com/carbonplan/cmip6-downscaling), we built a [web tool](https://github.com/carbonplan/cmip6-web/) for exploring and comparing downscaled datasets. The tool uses multiple `Raster` layers to facilitate comparing regional data in time series. The tool is slated to be released in June 2022.

export default ({ children }) => <Section name='examples'>{children}</Section>
