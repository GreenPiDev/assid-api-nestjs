/**
 * The API contract predates this Postgres/Prisma migration and still
 * exposes documents the way Mongoose did (an `_id` field instead of `id`),
 * so the frontend doesn't need to change. This adapts a Prisma row (or
 * array of rows) to that shape.
 */
export function withMongoId<T extends { id: string }>(row: T): Omit<T, 'id'> & { _id: string } {
  const { id, ...rest } = row;
  return { _id: id, ...rest } as Omit<T, 'id'> & { _id: string };
}

export function withMongoIdList<T extends { id: string }>(rows: T[]): (Omit<T, 'id'> & { _id: string })[] {
  return rows.map(withMongoId);
}
