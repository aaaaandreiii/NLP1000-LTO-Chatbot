import { MongoClient } from "mongodb";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI || "");
const dbName = process.env.MONGODB_DB_NAME || "lto_db";
const collectionName = process.env.MONGODB_COLLECTION_NAME || "documents";
const collection = client.db(dbName).collection(collectionName);

export const db = client.db(dbName);

export const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY,
  model: "gemini-embedding-2-preview",
  taskType: TaskType.RETRIEVAL_DOCUMENT,
});

// Wrap embedQuery to log dimension
const originalEmbedQuery = embeddings.embedQuery.bind(embeddings);
embeddings.embedQuery = async (text: string) => {
  const result = await originalEmbedQuery(text);
  console.log(`[DEBUG] Generated embedding with ${result.length} dimensions.`);
  return result;
};


export const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
  collection: collection as any,
  indexName: process.env.MONGODB_INDEX_NAME || "vector_index",
  textKey: "text",
  embeddingKey: "embedding",
});

export const chatModel = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
  model: "gemini-flash-latest",
  temperature: 0,
});
