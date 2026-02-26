/** @typedef {{ id: string, name: string, createdAt: number, updatedAt: number, archived: boolean, defaultStart?: boolean }} Project */
/** @typedef {{ id: string, startAt: number, endAt: number | null, note?: string }} Session */
/** @typedef {{ id: string, sessionId: string, projectId: string | null, startAt: number, endAt: number | null }} Segment */
