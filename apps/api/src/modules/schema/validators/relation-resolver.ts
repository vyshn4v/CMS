import { PrismaClient } from '@prisma/client';
import { SchemaDefinition } from '@cms/shared-types';

/**
 * Resolves and populates relations for Content Entries.
 */
export async function populateEntryRelations(
  prisma: PrismaClient,
  orgId: string,
  schemaDef: SchemaDefinition,
  data: Record<string, any>,
): Promise<Record<string, any>> {
  if (!schemaDef?.fields || !data) return {};

  const relationFields = schemaDef.fields.filter(
    (f) => f.type === 'relation' && f.relation && data[f.name],
  );

  if (relationFields.length === 0) return {};

  const populated: Record<string, any> = {};

  for (const field of relationFields) {
    const rawVal = data[field.name];
    if (!rawVal) continue;

    const ids: string[] = Array.isArray(rawVal) ? rawVal : [rawVal];
    const validIds = ids.filter((id) => typeof id === 'string' && id.length > 10);

    if (validIds.length === 0) continue;

    const relatedEntries = await prisma.contentEntry.findMany({
      where: {
        id: { in: validIds },
        orgId,
      },
      select: {
        id: true,
        status: true,
        data: true,
        publishedData: true,
        createdAt: true,
      },
    });

    const displayField = field.relation?.displayField || 'title';
    const mapped = relatedEntries.map((re) => {
      const entryData = (re.publishedData as Record<string, any>) || (re.data as Record<string, any>) || {};
      return {
        id: re.id,
        status: re.status,
        [displayField]: entryData[displayField] || entryData.name || entryData.title || re.id,
        data: entryData,
      };
    });

    populated[field.name] = Array.isArray(rawVal) ? mapped : mapped[0] || null;
  }

  return populated;
}
