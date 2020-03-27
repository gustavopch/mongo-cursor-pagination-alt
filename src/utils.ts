export const sanitizeLimit = (limit: number | null | undefined): number => {
  return Math.max(1, limit ?? 20)
}
