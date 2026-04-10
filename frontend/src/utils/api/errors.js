import { translate } from '../../i18n'

const joinValidationMessages = (errors) => {
  if (!errors || typeof errors !== 'object') return ''

  const values = Object.values(errors)
    .flat()
    .map((message) => String(message || '').trim())
    .filter(Boolean)

  return values.join(' ')
}

export const extractApiErrorMessage = (error, fallback = null) => {
  const apiData = error?.response?.data

  if (typeof apiData?.message === 'string' && apiData.message.trim()) {
    return apiData.message.trim()
  }

  const validationMessage = joinValidationMessages(apiData?.errors)
  if (validationMessage) return validationMessage

  if (Number(error?.response?.status || 0) === 419) {
    return translate('errors.sessionExpired')
  }

  if (error?.code === 'ERR_NETWORK') {
    return translate('errors.networkUnavailable')
  }

  return String(fallback || translate('errors.requestFailed'))
}
