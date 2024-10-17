// Compatability layer to make regl work with webgl2.
// See https://github.com/regl-project/regl/issues/561
var GL_DEPTH_COMPONENT = 0x1902
var GL_DEPTH_STENCIL = 0x84f9
var HALF_FLOAT_OES = 0x8d61

// webgl1 extensions natively supported by webgl2
var gl2Extensions = {
  WEBGL_depth_texture: {
    UNSIGNED_INT_24_8_WEBGL: 0x84fa,
  },
  OES_element_index_uint: {},
  OES_texture_float: {},
  // 'OES_texture_float_linear': {},
  OES_texture_half_float: {
    HALF_FLOAT_OES: HALF_FLOAT_OES,
  },
  // 'OES_texture_half_float_linear': {},
  EXT_color_buffer_float: {},
  OES_standard_derivatives: {},
  EXT_frag_depth: {},
  EXT_blend_minmax: {
    MIN_EXT: 0x8007,
    MAX_EXT: 0x8008,
  },
  EXT_shader_texture_lod: {},
}

var extensions = {}
export const webgl2Compat = {
  overrideContextType: function (callback) {
    const webgl2 = this
    // Monkey-patch context creation to override the context type.
    const origGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (
      ignoredContextType,
      contextAttributes
    ) {
      return webgl2.wrapGLContext(
        origGetContext.bind(this)('webgl2', contextAttributes),
        extensions
      )
    }
    // Execute the callback with overridden context type.
    var rv = callback()

    // Restore the original method.
    HTMLCanvasElement.prototype.getContext = origGetContext
    return rv
  },

  // webgl1 extensions natively supported by webgl2
  // this is called when initializing regl context
  wrapGLContext: function (gl, extensions) {
    gl[this.versionProperty] = 2
    for (var p in gl2Extensions) {
      extensions[p.toLowerCase()] = gl2Extensions[p]
    }

    // to support float and half-float textures
    gl.getExtension('EXT_color_buffer_float')

    // Now override getExtension to return ours.
    const origGetExtension = gl.getExtension
    gl.getExtension = function (n) {
      return extensions[n.toLowerCase()] || origGetExtension.apply(gl, [n])
    }

    // And texImage2D to handle format conversion
    const origTexImage = gl.texImage2D
    gl.texImage2D = function (
      target,
      miplevel,
      iformat,
      a,
      typeFor6,
      c,
      d,
      typeFor9,
      f
    ) {
      const getInternalFormat =
        webgl2Compat.getInternalFormat.bind(webgl2Compat)
      const getFormat = webgl2Compat.getFormat.bind(webgl2Compat)
      const getTextureType = webgl2Compat.getTextureType.bind(webgl2Compat)

      if (arguments.length == 6) {
        var ifmt = getInternalFormat(gl, iformat, typeFor6)
        var fmt = getFormat(gl, iformat)
        origTexImage.call(
          gl,
          target,
          miplevel,
          ifmt,
          a,
          fmt,
          getTextureType(gl, typeFor6),
          c
        )
      } else if (arguments.length == 9) {
        var ifmt = getInternalFormat(gl, iformat, typeFor9)
        var fmt = getFormat(gl, iformat)
        var type = getTextureType(gl, typeFor9)

        // Ensure 'f' is an ArrayBufferView
        if (!(f instanceof ArrayBuffer || ArrayBuffer.isView(f))) {
          let typedArray
          switch (type) {
            case gl.FLOAT:
              typedArray = new Float32Array(f)
              break
            case gl.UNSIGNED_BYTE:
              typedArray = new Uint8Array(f)
              break
            case gl.UNSIGNED_SHORT:
              typedArray = new Uint16Array(f)
              break
            // Add more cases as needed
            default:
              throw new Error(`Unsupported type: ${type}`)
          }
          f = typedArray
        }

        // Corrected argument list without the extra 'd'
        origTexImage.call(
          gl,
          target,
          miplevel,
          ifmt,
          a,
          typeFor6,
          c,
          fmt,
          type,
          f
        )
      } else {
        throw new Error('Unsupported number of arguments to texImage2D')
      }
    }

    // mocks of draw buffers's functions
    extensions['webgl_draw_buffers'] = {
      drawBuffersWEBGL: function () {
        return gl.drawBuffers.apply(gl, arguments)
      },
    }

    // mocks of vao extension
    extensions['oes_vertex_array_object'] = {
      VERTEX_ARRAY_BINDING_OES: 0x85b5,
      createVertexArrayOES: function () {
        return gl.createVertexArray()
      },
      deleteVertexArrayOES: function () {
        return gl.deleteVertexArray.apply(gl, arguments)
      },
      isVertexArrayOES: function () {
        return gl.isVertexArray.apply(gl, arguments)
      },
      bindVertexArrayOES: function () {
        return gl.bindVertexArray.apply(gl, arguments)
      },
    }

    // mocks of instancing extension
    extensions['angle_instanced_arrays'] = {
      VERTEX_ATTRIB_ARRAY_DIVISOR_ANGLE: 0x88fe,
      drawArraysInstancedANGLE: function () {
        return gl.drawArraysInstanced.apply(gl, arguments)
      },
      drawElementsInstancedANGLE: function () {
        return gl.drawElementsInstanced.apply(gl, arguments)
      },
      vertexAttribDivisorANGLE: function () {
        return gl.vertexAttribDivisor.apply(gl, arguments)
      },
    }

    return gl
  },

  versionProperty: '___regl_gl_version___',

  // texture internal format to update on the fly
  getInternalFormat: function (gl, format, type) {
    if (gl[this.versionProperty] !== 2) {
      return format
    }
    // WebGL2 texture formats
    if (format === GL_DEPTH_COMPONENT) {
      return gl.DEPTH_COMPONENT24
    } else if (format === GL_DEPTH_STENCIL) {
      return gl.DEPTH24_STENCIL8
    } else if (type === HALF_FLOAT_OES && format === gl.RGBA) {
      return gl.RGBA16F
    } else if (type === HALF_FLOAT_OES && format === gl.RGB) {
      return gl.RGB16F
    } else if (type === gl.FLOAT && format === gl.RGBA) {
      return gl.RGBA32F
    } else if (type === gl.FLOAT && format === gl.RGB) {
      return gl.RGB32F
    } else if (format === gl.LUMINANCE && type === gl.FLOAT) {
      return gl.R32F // Use R32F instead of LUMINANCE for float textures
    } else if (format === gl.LUMINANCE) {
      return gl.R8 // Use R8 instead of LUMINANCE for other types
    }
    return format
  },

  // texture type to update on the fly
  getTextureType: function (gl, type) {
    if (gl[this.versionProperty] !== 2) {
      return type
    }
    if (type === HALF_FLOAT_OES) {
      return gl.HALF_FLOAT
    }
    return type
  },

  // Add a new getFormat function
  getFormat: function (gl, format) {
    if (gl[this.versionProperty] !== 2) {
      return format
    }
    if (format === gl.LUMINANCE) {
      return gl.RED // Use RED instead of LUMINANCE in WebGL2
    }
    return format
  },
}

export default webgl2Compat
