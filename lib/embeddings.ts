import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const MAX_CHARS = 20000;

export async function createResumeEmbedding(input: string) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env.local to index resumes for search.");
  }

  const openai = new OpenAI({ apiKey });
  const trimmed = input.replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);

  if (!trimmed) {
    throw new Error("Resume text was empty, so an embedding could not be created.");
  }

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    input: trimmed
  });

  const embedding = response.data[0]?.embedding;

  if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error("OpenAI did not return a 1536-dimension embedding.");
  }

  return embedding;
}

export function toVectorLiteral(embedding: number[]) {
  return `[${embedding.join(",")}]`;
}
