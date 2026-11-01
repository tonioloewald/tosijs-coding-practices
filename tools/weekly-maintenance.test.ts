import { expect, test } from 'bun:test'
import { enrolledProjects, weekOf } from './weekly-maintenance.ts'

test('the week is named by its local Monday, whatever day the run lands on', () => {
  expect(weekOf(new Date(2026, 10, 2, 0, 30))).toBe('2026-11-02') // Monday, just after midnight
  expect(weekOf(new Date(2026, 10, 1, 23, 59))).toBe('2026-10-26') // Sunday
  expect(weekOf(new Date(2026, 10, 4, 12))).toBe('2026-11-02') // Wednesday
})

test('only enrolled, unretired projects get the task', () => {
  const list = [
    { name: 'b', enrolled: '2026-10-05 by x', retired: '' },
    { name: 'a', enrolled: '2026-10-04 by x', retired: '' },
    { name: 'never', enrolled: '', retired: '' },
    { name: 'gone', enrolled: '2026-09-01 by x', retired: '2026-10-01' },
  ]
  expect(enrolledProjects(list)).toEqual(['a', 'b'])
})
