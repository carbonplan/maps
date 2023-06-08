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
  void main() {
    float scale = pixelRatio * 512.0 / size;
    float globalMag = pow(2.0, zoom - globalLevel);
    float mag = pow(2.0, zoom - level);
    float x = mag * (position.x + offset.x * size) - globalMag * camera.x * size ;
    float y = mag * (position.y + offset.y * size) - globalMag * camera.y * size ;
    x = (scale * x);
    y = (scale * y);
    x = (2.0 * x / viewportWidth);
    y = -(2.0 * y / viewportHeight);
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
  ${sh(`varying vec2 uv;`, ['texture'])}
  ${sh(vars.map((d) => `uniform sampler2D ${d};`).join(''), ['texture'])}
  ${sh(vars.map((d) => `varying float ${d}v;`).join(''), ['grid', 'dotgrid'])}
  ${customUniforms.map((d) => `uniform float ${d};`).join('')}
  `

  if (!customFrag)
    return `
    ${declarations}
    #define PI 3.1415926535897932384626433832795
    // float mercLat = uv.x * PI - PI / 2.0;
    // float equirectangularLat = 2.0 * atan(exp(mercLat)) - PI / 2.0;
    // float scaleY = 180.0 / (2.0 * 89.296875);
    // float translateY = 90.0 - 89.296875;

    // float equirectangularLat = log(tan((1.5707963267948966 + mercLat) / 2.0));
    // float equirectangularY = scaleY * (equirectangularLat - radians(translateY)) / PI + 0.5;
    // float equirectangularY = equirectangularLat / PI + 0.5;

    vec2 mercator(float lon, float lat)
    {
      float lambda = radians(lon);
      float phi = radians(lat);
      return vec2(lambda, log(tan((1.5707963267948966 + phi) / 2.0)));
    }

    vec2 mercatorInvert(float x, float y)
    {
      float lambda = x;
      float phi = 2.0 * atan(exp(y)) - 1.5707963267948966;
      return vec2(degrees(lambda), degrees(phi));
    }
    vec2 equirectangular(float lon, float lat)
    {
      float lambda = radians(lon);
      float phi = radians(lat);
      return vec2(cos(phi) * sin(lambda), sin(phi));
    }
    vec2 equirectangularInvert(float x, float y)
    {
      return vec2(degrees(x), degrees(y));
    }

    void main() {      
      vec2 lookup = mercatorInvert(uv.x * 2.0 * PI - PI, uv.y * PI - PI / 2.0);
      float scaleX = 360.0 / abs(178.59375 * 2.0);
      float scaleY = 180.0 / abs(89.296875 * 2.0);
      float translateX = 180.0 - 178.59375;
      float translateY = 90.0 - 89.296875;
      float rescaledX = scaleX * ((lookup.x - translateX) / 360.0 + 0.5);
      float rescaledY = scaleY * ((lookup.y - translateY) / 180.0 + 0.5);

      // float rescaledX = lookup.x / 360.0 + 0.5;
      // float rescaledY = lookup.y / 180.0 + 0.5;

      
      float testX = rescaledX;
      if (rescaledX > 0.75) {
        testX = 0.75;
      } else if (rescaledX > 0.5) {
        testX = 0.5;
      } else if (rescaledX > 0.25) {
        testX = 0.25;
      }
      
      vec2 coord = vec2(rescaledX, rescaledY);
      
      // vec2 lookup = mercator(uv.x * 360.0 - 180.0, uv.y * 180.0 - 90.0);
      // vec2 coord = vec2(lookup.x / 2.0 / PI + 0.5, lookup.y / PI + 0.5);

      ${sh(`float ${vars[0]} = texture2D(${vars[0]}, coord).x;`, ['texture'])}
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
