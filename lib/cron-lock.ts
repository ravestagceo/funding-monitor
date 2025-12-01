/**
 * Simple in-memory lock to prevent concurrent cron executions
 * This prevents the same cron job from running multiple times simultaneously
 */

const locks = new Map<string, { locked: boolean; timestamp: number }>()

// Lock expires after 5 minutes (in case of crashes)
const LOCK_TIMEOUT_MS = 5 * 60 * 1000

/**
 * Try to acquire a lock for the given key
 * Returns true if lock acquired, false if already locked
 */
export function tryAcquireLock(key: string): boolean {
  const now = Date.now()
  const existing = locks.get(key)

  // If lock exists and hasn't expired, reject
  if (existing && existing.locked && (now - existing.timestamp) < LOCK_TIMEOUT_MS) {
    console.log(`[CronLock] Lock already held for "${key}" (age: ${Math.round((now - existing.timestamp) / 1000)}s)`)
    return false
  }

  // Acquire lock
  locks.set(key, { locked: true, timestamp: now })
  console.log(`[CronLock] Lock acquired for "${key}"`)
  return true
}

/**
 * Release the lock for the given key
 */
export function releaseLock(key: string): void {
  locks.delete(key)
  console.log(`[CronLock] Lock released for "${key}"`)
}

/**
 * Get lock status for debugging
 */
export function getLockStatus(key: string): { locked: boolean; age: number } | null {
  const existing = locks.get(key)
  if (!existing) return null

  const age = Date.now() - existing.timestamp
  return {
    locked: existing.locked && age < LOCK_TIMEOUT_MS,
    age: Math.round(age / 1000),
  }
}
