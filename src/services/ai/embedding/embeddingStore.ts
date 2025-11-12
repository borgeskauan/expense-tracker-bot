import { v4 as uuidv4 } from "uuid";
import qdrant, { Payload, SearchHit } from "./qdrant";
import embedder from "./embedder";

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

  async update(
    transactionId: string,
    newDescription: string,
    metadata?: Record<string, unknown> | null
  ): Promise<string> {
    if (!transactionId || typeof transactionId !== "string") {
      throw new TypeError("transactionId must be a non-empty string");
    }
    if (!newDescription || typeof newDescription !== "string") {
      throw new TypeError("newDescription must be a non-empty string");
    }

    // Ensure collection exists (no-op if already ensured)
    await this.ensureCollectionIsCreated();

    // Try to find the point by exact payload match (no vector) first
    let found = await qdrant.findPointByKey("transactionId", transactionId);
    if (!found) {
      throw new Error("no point found with the provided transactionId");
    }

    // Compute new embedding and upsert with same id
    const newVector = await embedder.embedText(newDescription);
    const newPayload: Payload = {
      description: newDescription,
      metadata: metadata ?? found.payload ?? null,
    };
    await qdrant.upsertPoint(found.id, newVector, newPayload);

    return found.id;
  }
}

const defaultService = new EmbeddingStore();
export default defaultService;
