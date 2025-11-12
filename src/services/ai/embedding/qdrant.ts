import { QdrantClient } from "@qdrant/js-client-rest";

const COLLECTION = "descriptions";
const VECTOR_SIZE = 3072;

export type Payload = {
  description: string;
  metadata?: Record<string, unknown> | null;
};

export type SearchHit = {
  id: string;
  score?: number;
  payload?: Payload | Record<string, unknown>;
};

function isAlreadyExists(err: unknown) {
  const msg =
    (err as any)?.data?.status?.error ??
    (err as any)?.message ??
    String(err ?? "");
  return /already exists|exists|collection.*exists|index.*exists/i.test(
    String(msg)
  );
}

export class QdrantService {
  public client: QdrantClient;

  constructor(url?: string) {
    this.client = new QdrantClient({
      url: url ?? process.env.QDRANT_URL ?? "http://localhost:6333",
    });
  }

  private async ensureCollection(): Promise<void> {
    try {
      await this.client.createCollection(COLLECTION, {
        vectors: { size: VECTOR_SIZE, distance: "Cosine" },
      });
    } catch (err) {
      if (!isAlreadyExists(err)) throw err;
    }
  }

  /**
   * Ensure an index on payload.description for fast exact matches.
   * Use "keyword" for exact equality (case-sensitive), or switch to the
   * commented "text" schema for full-text / case-insensitive contains.
   */
  private async ensureDescriptionIndex(): Promise<void> {
    try {
      await this.client.createPayloadIndex(COLLECTION, {
        field_name: "description",
        field_schema: "keyword",
      });
    } catch (err) {
      if (!isAlreadyExists(err)) throw err;
    }
  }

  async ensureCollectionWithDescriptionIndex(): Promise<void> {
    await this.ensureCollection();
    await this.ensureDescriptionIndex();
  }

  async upsertPoint(
    id: string,
    vector: number[],
    payload: Payload
  ): Promise<void> {
    await this.client.upsert(COLLECTION, {
      points: [
        {
          id,
          vector,
          payload,
        },
      ],
    });
  }

  async queryVector(vector: number[], limit = 5): Promise<SearchHit[]> {
    const res = await this.client.search(COLLECTION, {
      vector,
      limit,
      withPayload: true,
    } as any);

    const hits: SearchHit[] = (res as any[]).map((h: any) => ({
      id: h.id,
      score: h.score,
      payload: h.payload,
    }));
    return hits;
  }

  async findPointByKey(key: string, value: string): Promise<SearchHit | null> {
    if (!key || typeof key !== "string") {
      throw new TypeError("key must be a non-empty string");
    }
    if (!value || typeof value !== "string") {
      throw new TypeError("value must be a non-empty string");
    }

    const response = await this.client.scroll(COLLECTION, {
      filter: {
        must: [{ key, match: { value } }],
      },
      limit: 1,
    });

    const points = (response as any).points ?? [];
    if (!Array.isArray(points) || points.length === 0) {
      return null;
    }

    const p = points[0];
    return {
      id: p.id,
      payload: p.payload as Payload,
    };
  }
}

// Default instance for convenience (backwards-compatible default export)
export const qdrant = new QdrantService();
export default qdrant;
