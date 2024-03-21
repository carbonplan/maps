import { Box, Flex } from 'theme-ui'
import { useCallback } from 'react'
import { Slider, Badge, Toggle, Select, Link } from '@carbonplan/components'
import { colormaps } from '@carbonplan/colormaps'

const sx = {
  label: {
    fontFamily: 'mono',
    letterSpacing: 'mono',
    textTransform: 'uppercase',
    fontSize: [1, 1, 1, 2],
    mt: [3],
  },
}

const CLIM_RANGES = {
  sst: { max: 30, min: -20 },
  ice: { max: 1, min: 0 },
}

const DEFAULT_COLORMAPS = {
  sst: 'warm',
  ice: 'cool',
}

const TIME = [
  4261.5, 4262.5, 4263.5, 4264.5, 4265.5, 4266.5, 4267.5, 4268.5, 4269.5,
  4270.5, 4271.5, 4272.5, 4273.5, 4274.5, 4275.5, 4276.5, 4277.5, 4278.5,
  4279.5, 4280.5, 4281.5, 4282.5, 4283.5, 4284.5, 4285.5, 4286.5, 4287.5,
  4288.5, 4289.5, 4290.5, 4291.5, 4292.5, 4293.5, 4294.5, 4295.5, 4296.5,
  4297.5, 4298.5, 4299.5, 4300.5, 4301.5, 4302.5, 4303.5, 4304.5, 4305.5,
  4306.5, 4307.5, 4308.5, 4309.5, 4310.5, 4311.5, 4312.5, 4313.5, 4314.5,
  4315.5, 4316.5, 4317.5, 4318.5, 4319.5, 4320.5, 4321.5, 4322.5, 4323.5,
  4324.5, 4325.5, 4326.5, 4327.5, 4328.5, 4329.5, 4330.5, 4331.5, 4332.5,
  4333.5, 4334.5, 4335.5, 4336.5, 4337.5, 4338.5, 4339.5, 4340.5, 4341.5,
  4342.5, 4343.5, 4344.5, 4345.5, 4346.5, 4347.5, 4348.5, 4349.5, 4350.5,
  4351.5, 4352.5, 4353.5, 4354.5, 4355.5, 4356.5, 4357.5, 4358.5, 4359.5,
  4360.5, 4361.5, 4362.5, 4363.5, 4364.5, 4365.5, 4366.5, 4367.5, 4368.5,
  4369.5, 4370.5, 4371.5, 4372.5, 4373.5, 4374.5, 4375.5, 4376.5, 4377.5,
  4378.5, 4379.5, 4380.5, 4381.5, 4382.5, 4383.5, 4384.5, 4385.5, 4386.5,
  4387.5, 4388.5, 4389.5, 4390.5, 4391.5, 4392.5, 4393.5, 4394.5, 4395.5,
  4396.5, 4397.5, 4398.5, 4399.5, 4400.5, 4401.5, 4402.5, 4403.5, 4404.5,
  4405.5, 4406.5, 4407.5, 4408.5, 4409.5, 4410.5, 4411.5, 4412.5, 4413.5,
  4414.5, 4415.5, 4416.5, 4417.5, 4418.5, 4419.5, 4420.5, 4421.5, 4422.5,
  4423.5, 4424.5, 4425.5, 4426.5, 4427.5, 4428.5, 4429.5, 4430.5, 4431.5,
  4432.5, 4433.5, 4434.5, 4435.5, 4436.5, 4437.5, 4438.5, 4439.5, 4440.5,
  4441.5, 4442.5, 4443.5, 4444.5, 4445.5, 4446.5, 4447.5, 4448.5, 4449.5,
  4450.5, 4451.5, 4452.5, 4453.5, 4454.5, 4455.5, 4456.5, 4457.5, 4458.5,
  4459.5, 4460.5, 4461.5, 4462.5, 4463.5, 4464.5, 4465.5, 4466.5, 4467.5,
  4468.5, 4469.5, 4470.5, 4471.5, 4472.5, 4473.5, 4474.5, 4475.5, 4476.5,
  4477.5, 4478.5, 4479.5, 4480.5, 4481.5, 4482.5, 4483.5, 4484.5, 4485.5,
  4486.5, 4487.5, 4488.5, 4489.5, 4490.5, 4491.5, 4492.5, 4493.5, 4494.5,
  4495.5, 4496.5, 4497.5, 4498.5, 4499.5, 4500.5, 4501.5, 4502.5, 4503.5,
  4504.5, 4505.5, 4506.5, 4507.5, 4508.5, 4509.5, 4510.5, 4511.5, 4512.5,
  4513.5, 4514.5, 4515.5, 4516.5, 4517.5, 4518.5, 4519.5, 4520.5, 4521.5,
  4522.5, 4523.5, 4524.5, 4525.5, 4526.5, 4527.5, 4528.5, 4529.5, 4530.5,
  4531.5, 4532.5, 4533.5, 4534.5, 4535.5, 4536.5, 4537.5, 4538.5, 4539.5,
  4540.5, 4541.5, 4542.5, 4543.5, 4544.5, 4545.5, 4546.5, 4547.5, 4548.5,
  4549.5, 4550.5, 4551.5, 4552.5, 4553.5, 4554.5, 4555.5, 4556.5, 4557.5,
  4558.5, 4559.5, 4560.5, 4561.5, 4562.5, 4563.5, 4564.5, 4565.5, 4566.5,
  4567.5, 4568.5, 4569.5, 4570.5, 4571.5, 4572.5, 4573.5, 4574.5, 4575.5,
  4576.5, 4577.5, 4578.5, 4579.5, 4580.5, 4581.5, 4582.5, 4583.5, 4584.5,
  4585.5, 4586.5, 4587.5, 4588.5, 4589.5, 4590.5, 4591.5, 4592.5, 4593.5,
  4594.5, 4595.5, 4596.5, 4597.5, 4598.5, 4599.5, 4600.5, 4601.5, 4602.5,
  4603.5, 4604.5, 4605.5, 4606.5, 4607.5, 4608.5, 4609.5, 4610.5, 4611.5,
  4612.5, 4613.5, 4614.5, 4615.5, 4616.5, 4617.5, 4618.5, 4619.5, 4620.5,
  4621.5, 4622.5, 4623.5, 4624.5, 4625.5, 4626.5,
]

const ParameterControls = ({ getters, setters }) => {
  const { display, debug, opacity, clim, time, variable, colormapName } =
    getters
  const {
    setDisplay,
    setDebug,
    setOpacity,
    setClim,
    setTime,
    setVariable,
    setColormapName,
  } = setters

  const handleVariableChange = useCallback((e) => {
    const variable = e.target.value
    setVariable(variable)
    setClim([CLIM_RANGES[variable].min, CLIM_RANGES[variable].max])
    setColormapName(DEFAULT_COLORMAPS[variable])
  })

  return (
    <>
      <Box sx={{ position: 'absolute', top: 20, right: 20 }}>
        <Flex
          sx={{
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 4,
          }}
        >
          <Box>
            <Box sx={{ ...sx.label, mt: [0] }}>Tile boundaries</Box>
            <Toggle
              sx={{ float: 'right', mt: [2] }}
              value={debug}
              onClick={() => setDebug((prev) => !prev)}
            />
          </Box>

          <Box>
            <Box sx={{ ...sx.label, mt: [0] }}>Display</Box>
            <Toggle
              sx={{ display: 'block', float: 'right', mt: [2] }}
              value={display}
              onClick={() => setDisplay((prev) => !prev)}
            />
          </Box>
        </Flex>
      </Box>
      <Box sx={{ position: 'absolute', top: 20, left: 20 }}>
        <Box sx={{ ...sx.label, mt: [0] }}>Opacity</Box>
        <Slider
          min={0}
          max={1}
          step={0.01}
          sx={{ width: '175px', display: 'inline-block' }}
          value={opacity}
          onChange={(e) => setOpacity(parseFloat(e.target.value))}
        />
        <Badge
          sx={{
            bg: 'primary',
            color: 'background',
            display: 'inline-block',
            fontSize: [1, 1, 1, 2],
            height: ['21px', '21px', '21px', '23px'],
            position: 'relative',
            left: [3],
            top: ['3px'],
          }}
        >
          {opacity.toFixed(2)}
        </Badge>
        <Box sx={sx.label}>Minimum</Box>
        <Slider
          min={CLIM_RANGES[variable].min}
          max={CLIM_RANGES[variable].max}
          step={1}
          sx={{ width: '175px', display: 'inline-block' }}
          value={clim[0]}
          onChange={(e) =>
            setClim((prev) => [parseFloat(e.target.value), prev[1]])
          }
        />
        <Badge
          sx={{
            bg: 'primary',
            color: 'background',
            display: 'inline-block',
            position: 'relative',
            left: [3],
            top: [1],
          }}
        >
          {clim[0].toFixed(0)}
        </Badge>
        <Box sx={sx.label}>Maximum</Box>
        <Slider
          min={CLIM_RANGES[variable].min}
          max={CLIM_RANGES[variable].max}
          step={1}
          sx={{ width: '175px', display: 'inline-block' }}
          value={clim[1]}
          onChange={(e) =>
            setClim((prev) => [prev[0], parseFloat(e.target.value)])
          }
        />
        <Badge
          sx={{
            bg: 'primary',
            color: 'background',
            display: 'inline-block',
            position: 'relative',
            left: [3],
            top: [1],
          }}
        >
          {clim[1].toFixed(0)}
        </Badge>
        <Box sx={sx.label}>Month</Box>
        <Slider
          min={0}
          max={TIME.length - 1}
          step={1}
          sx={{ width: '175px', display: 'inline-block' }}
          value={TIME.indexOf(time)}
          onChange={(e) => setTime(TIME[parseFloat(e.target.value)])}
        />
        <Badge
          sx={{
            bg: 'primary',
            color: 'background',
            display: 'inline-block',
            position: 'relative',
            left: [3],
            top: [1],
          }}
        >
          {time}
        </Badge>

        <Box sx={{ ...sx.label, mt: [4] }}>Variable</Box>
        <Select
          sxSelect={{ bg: 'transparent' }}
          size='xs'
          onChange={handleVariableChange}
          sx={{ mt: [1] }}
          value={variable}
        >
          <option value='sst'>Sea Surface Temperature</option>
          <option value='ice'>Sea Ice Concentrations</option>
        </Select>

        <Box sx={{ ...sx.label, mt: [4] }}>Colormap</Box>
        <Select
          sxSelect={{ bg: 'transparent' }}
          size='xs'
          onChange={(e) => setColormapName(e.target.value)}
          sx={{ mt: [1] }}
          value={colormapName}
        >
          {colormaps.map((d) => (
            <option key={d.name}>{d.name}</option>
          ))}
        </Select>
        <Box sx={{ ...sx.label, mt: [4] }}>
          <Link href='https://github.com/carbonplan/maps'>CODE ON Github</Link>
        </Box>
      </Box>
    </>
  )
}

export default ParameterControls
