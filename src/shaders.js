const _sh = (mode) => {
  return (value, which) => {
    if (which.includes(mode)) return value
    return ''
  }
}

export const vert = (mode, vars) => {
  const sh = _sh(mode)

  return `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
  attribute vec2 position;
  ${sh(`varying vec2 uv;`, ['texture'])}
  ${sh(vars.map((d) => `attribute float ${d};`).join(''), ['grid', 'dotgrid'])}
  ${sh(vars.map((d) => `varying float ${d}v;`).join(''), ['grid', 'dotgrid'])}
  uniform vec2 camera;
  uniform float viewportWidth;
  uniform float viewportHeight;
  uniform float pixelRatio;
  uniform float zoom;
  uniform float size;
  uniform float globalLevel;
  uniform float level;
  uniform vec2 offset;
  uniform vec2 order;
  void main() {
    float scale = pixelRatio * 512.0 / size;
    float globalMag = pow(2.0, zoom - globalLevel);
    float mag = pow(2.0, zoom - level);
    float x = mag * (position.x + offset.x * size) - globalMag * camera.x * size ;
    float y = mag * (position.y + offset.y * size) - globalMag * camera.y * size ;
    x = (scale * x);
    y = (scale * y);
    x = order.x * (2.0 * x / viewportWidth);
    y = order.y * -(2.0 * y / viewportHeight);

    ${sh(`uv = vec2(position.y, position.x) / size;`, ['texture'])}
    ${sh(vars.map((d) => `${d}v = ${d};`).join(''), ['grid', 'dotgrid'])}
    ${sh(`gl_PointSize = 0.9 * scale * mag;`, ['grid', 'dotgrid'])}
    gl_Position = vec4(x, y, 0.0, 1.0);
  }`
}

export const frag = (mode, vars, customFrag, customUniforms) => {
  const sh = _sh(mode)

  const declarations = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
  uniform float opacity;
  uniform sampler2D colormap;
  uniform vec2 clim;
  uniform float fillValue;
  uniform float pixelRatio;
  uniform float projection;
  ${sh(`varying vec2 uv;`, ['texture'])}
  ${sh(vars.map((d) => `uniform sampler2D ${d};`).join(''), ['texture'])}
  ${sh(vars.map((d) => `varying float ${d}v;`).join(''), ['grid', 'dotgrid'])}
  ${customUniforms.map((d) => `uniform float ${d};`).join('')}
  `

  if (!customFrag)
    return `
    ${declarations}
    #define PI 3.1415926535897932384626433832795

    vec2 mercatorInvert(float x, float y)
    {
      float lambda = x;
      float phi = 2.0 * atan(exp(y)) - 1.5707963267948966;
      return vec2(degrees(lambda), degrees(phi));
    }

    void main() {
      ${sh(
        `
      // By default (mercator projection), index into vars[0] using uv
      vec2 coord = uv;

      // Equirectangular
      if (projection == 1.0) {
        // convert uv => [-1, 1] => radians
        vec2 lookup = mercatorInvert((uv.y * 2.0 - 1.0) * PI, (uv.x * 2.0 - 1.0) * PI);
        float rescaledX = lookup.x / 360.0 + 0.5;
        float rescaledY = lookup.y / 180.0 + 0.5;
        coord = vec2(rescaledY, rescaledX);
      }

      float ${vars[0]} = texture2D(${vars[0]}, coord).x;
      `,
        ['texture']
      )}
      ${sh(`float ${vars[0]} = ${vars[0]}v;`, ['grid', 'dotgrid'])}
      ${sh(
        `
      if (length(gl_PointCoord.xy - 0.5) > 0.5) {
        discard;
      }
      `,
        ['dotgrid']
      )}
      if (${vars[0]} == fillValue) {
        discard;
      }
      float rescaled = (${vars[0]} - clim.x)/(clim.y - clim.x);
      vec4 c = texture2D(colormap, vec2(rescaled, 1.0));
      gl_FragColor = vec4(c.x, c.y, c.z, opacity);
      gl_FragColor.rgb *= gl_FragColor.a;
    }`

  if (customFrag)
    return `
    ${declarations}
    void main() {
      ${sh(
        `${vars.map((d) => `float ${d} = texture2D(${d}, uv).x;`).join('')}`,
        ['texture']
      )}
      ${sh(`${vars.map((d) => `float ${d} = ${d}v;`).join('')}`, [
        'grid',
        'dotgrid',
      ])}
      ${customFrag}
    }`
}
