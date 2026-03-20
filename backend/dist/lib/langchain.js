"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatModel = exports.vectorStore = exports.embeddings = void 0;
const mongodb_1 = require("mongodb");
const mongodb_2 = require("@langchain/mongodb");
const google_genai_1 = require("@langchain/google-genai");
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const client = new mongodb_1.MongoClient(process.env.MONGODB_URI || "");
const dbName = process.env.MONGODB_DB_NAME || "lto_db";
const collectionName = process.env.MONGODB_COLLECTION_NAME || "documents";
const collection = client.db(dbName).collection(collectionName);
exports.embeddings = new google_genai_1.GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY,
    model: "gemini-embedding-001",
    taskType: generative_ai_1.TaskType.RETRIEVAL_DOCUMENT,
});
exports.vectorStore = new mongodb_2.MongoDBAtlasVectorSearch(exports.embeddings, {
    collection: collection,
    indexName: process.env.MONGODB_INDEX_NAME || "vector_index",
    textKey: "text",
    embeddingKey: "embedding",
});
exports.chatModel = new google_genai_1.ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY,
    model: "gemini-flash-latest",
    temperature: 0,
});
//# sourceMappingURL=langchain.js.map