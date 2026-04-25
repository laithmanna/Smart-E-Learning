export interface GeneratedClass {
  topic: string;
  classDate: Date;
  startTime: string;
  endTime: string;
  location: string;
  meetingLink: string;
}

/**
 * Replicates the legacy .NET behavior:
 * - one class per day between start and end (inclusive)
 * - skip Friday (5) and Saturday (6)
 * - default times 13:00–14:00
 * - default location/meetingLink "NaN" (admin updates later)
 * - sequential topic "Class N"
 */
export function generateClassesForRange(start: Date, end: Date): GeneratedClass[] {
  const classes: GeneratedClass[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);

  let index = 1;
  while (cursor.getTime() <= last.getTime()) {
    const dow = cursor.getDay();
    if (dow !== 5 && dow !== 6) {
      classes.push({
        topic: `Class ${index}`,
        classDate: new Date(cursor),
        startTime: '13:00',
        endTime: '14:00',
        location: 'NaN',
        meetingLink: 'NaN',
      });
      index++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return classes;
}
