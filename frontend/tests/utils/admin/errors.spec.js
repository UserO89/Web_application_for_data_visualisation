import { extractAdminApiError } from '../../../src/utils/admin/errors'

describe('extractAdminApiError', () => {
  it('delegates admin API errors to the shared API error formatter', () => {
    expect(extractAdminApiError({
      response: {
        data: {
          message: 'Admin request failed.',
        },
      },
    })).toBe('Admin request failed.')

    expect(extractAdminApiError({}, 'Fallback admin error.')).toBe('Fallback admin error.')
  })
})
