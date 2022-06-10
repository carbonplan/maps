// mirrors https://github.com/carbonplan/ndpyramid/blob/41f2bedeb3297db7e299285ca43363f9c0c1a65e/ndpyramid/utils.py#L14-L25
export const DEFAULT_FILL_VALUES = {
  '|S1': '\x00',
  '<i1': -127,
  '|u1': 255,
  '<i2': -32767,
  '<u2': 65535,
  '<i4': -2147483647,
  '<u4': 4294967295,
  // '<i8': -9223372036854775806,
  '<u8': 18446744073709551614,
  '<f4': 9.969209968386869e36,
  '<f8': 9.969209968386869e36,
}
