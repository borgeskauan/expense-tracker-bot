import { v4 as uuidv4 } from "uuid";
import embedder from "./embedder";
import qdrant, { Payload, SearchHit } from "./qdrant";

export class EmbeddingStore {
  collectionEnsured = false;

  private async ensureCollectionIsCreated() {
    if (!this.collectionEnsured) {
      await qdrant.ensureCollectionWithDescriptionIndex();
      this.collectionEnsured = true;
    }
  }

  /**
   * Save a description and payload into Qdrant. Returns the generated ID.
   */
  async save(
    description: string,
    metadata?: Record<string, unknown> | null
  ): Promise<string> {
    if (!description || typeof description !== "string") {
      throw new TypeError("description must be a non-empty string");
    }

    const vector = await embedder.embedText(description);
    await this.ensureCollectionIsCreated();

    const id = uuidv4();
    const payload: Payload = { description, metadata: metadata ?? null };
    await qdrant.upsertPoint(id, vector, payload);
    return id;
  }

  /**
   * Query top-k similar descriptions for the provided text.
   */
  async query(description: string, k = 5): Promise<SearchHit[]> {
    if (!description || typeof description !== "string") {
      throw new TypeError("description must be a non-empty string");
    }

    const vector = await embedder.embedText(description);
    await this.ensureCollectionIsCreated();

    const hits = await qdrant.queryVector(vector, k);
    return hits;
  }

  /**
   * Update a saved description's embedding by finding the point with the oldDescription
   * and upserting it with the newDescription embedding while preserving metadata.
   * Returns the ID of the updated point.
   */
  async update(
    oldDescription: string,
    newDescription: string,
    metadata?: Record<string, unknown> | null
  ): Promise<string> {
    if (!oldDescription || typeof oldDescription !== "string") {
      throw new TypeError("oldDescription must be a non-empty string");
    }
    if (!newDescription || typeof newDescription !== "string") {
      throw new TypeError("newDescription must be a non-empty string");
    }

    // Ensure collection exists (no-op if already ensured)
    await this.ensureCollectionIsCreated();

    // Try to find the point by exact payload match (no vector) first
    let found = await qdrant.findPointByDescription(oldDescription);
    if (!found) {
      throw new Error("no point found with the provided oldDescription");
    }

    const id = String(found.id);

    // Preserve existing metadata if available
    const existingMetadata =
      (found.payload as Payload | undefined)?.metadata ?? null;

    // Compute new embedding and upsert with same id
    const newVector = await embedder.embedText(newDescription);
    const newPayload: Payload = {
      description: newDescription,
      metadata: metadata ?? existingMetadata,
    };
    await qdrant.upsertPoint(id, newVector, newPayload);

    return id;
  }
}

const defaultService = new EmbeddingStore();
export default defaultService;
