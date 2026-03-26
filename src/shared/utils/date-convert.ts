import { parseDate, type CalendarDate } from '@internationalized/date'

export function toCalendarDate(dateStr: string): CalendarDate {
  return parseDate(dateStr)
}

export function dateRangeToStrings(range: { start?: { toString(): string }; end?: { toString(): string } }): { start?: string; end?: string } {
  return {
    start: range.start?.toString(),
    end: range.end?.toString(),
  }
}
