import { getBandInformation } from './utils'

describe('utils', () => {
  describe('getBandInformation()', () => {
    it('returns no bands for empty selectors', () => {
      expect(getBandInformation({})).toEqual({})
    })

    it('returns no bands for non-array selector values', () => {
      expect(getBandInformation({ time: 0 })).toEqual({})
      expect(getBandInformation({ time: 0, variable: 'pr' })).toEqual({})
    })

    it('handles array selector values', () => {
      expect(getBandInformation({ time: ['jan', 'feb'] })).toEqual({
        jan: { time: 'jan' },
        feb: { time: 'feb' },
      })
    })

    it('handles array selector values with number entries', () => {
      expect(getBandInformation({ time: [1, 2] })).toEqual({
        time_1: { time: 1 },
        time_2: { time: 2 },
      })
    })

    it('handles multiple array selector values', () => {
      expect(
        getBandInformation({ time: ['jan', 'feb'], variable: ['pr', 'tavg'] })
      ).toEqual({
        jan_pr: { time: 'jan', variable: 'pr' },
        feb_pr: { time: 'feb', variable: 'pr' },
        jan_tavg: { time: 'jan', variable: 'tavg' },
        feb_tavg: { time: 'feb', variable: 'tavg' },
      })
    })

    it('handles multiple array selector values with number entries', () => {
      expect(
        getBandInformation({ time: [1, 2], variable: ['pr', 'tavg'] })
      ).toEqual({
        time_1_pr: { time: 1, variable: 'pr' },
        time_2_pr: { time: 2, variable: 'pr' },
        time_1_tavg: { time: 1, variable: 'tavg' },
        time_2_tavg: { time: 2, variable: 'tavg' },
      })
      expect(getBandInformation({ time: [1, 2], variable: [3, 4] })).toEqual({
        time_1_variable_3: { time: 1, variable: 3 },
        time_2_variable_3: { time: 2, variable: 3 },
        time_1_variable_4: { time: 1, variable: 4 },
        time_2_variable_4: { time: 2, variable: 4 },
      })
    })

    it('handles mix of array selector values with non-array selector values', () => {
      expect(
        getBandInformation({ time: ['jan', 'feb'], variable: 'pr' })
      ).toEqual({
        jan: { time: 'jan', variable: 'pr' },
        feb: { time: 'feb', variable: 'pr' },
      })
      expect(getBandInformation({ time: ['jan', 'feb'], variable: 3 })).toEqual(
        {
          jan: { time: 'jan', variable: 3 },
          feb: { time: 'feb', variable: 3 },
        }
      )
    })
  })
})
