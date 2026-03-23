export const revealDelayStyle = (index, start = 0, step = 70) => {
  return {
    '--reveal-delay': `${start + index * step}ms`,
  }
}
