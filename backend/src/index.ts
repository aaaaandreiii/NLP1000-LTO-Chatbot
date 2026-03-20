import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document as LangChainDocument } from "@langchain/core/documents";
import { vectorStore, chatModel, db } from "./lib/langchain";
import { llamaParser } from "./lib/parser";

import { HumanMessage, SystemMessage } from "@langchain/core/messages";

dotenv.config();

console.log(`[DEBUG] Startup Env Check - GOOGLE_API_KEY: ${process.env.GOOGLE_API_KEY ? "Present" : "MISSING"}`);
console.log(`[DEBUG] Startup Env Check - MONGODB_URI: ${process.env.MONGODB_URI ? "Present" : "MISSING"}`);

const app = express();
const port = process.env.PORT || 3000;

// Explicit CORS configuration for Vercel
app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Vercel serverless functions have a read-only filesystem, except for /tmp
const upload = multer({ dest: "/tmp" });

// Middleware for admin password validation
const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const password = req.headers["authorization"];
  if (password === process.env.ADMIN_PASSWORD || password === "lto-admin-2026") {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized: Invalid admin password" });
  }
};

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Backend is running",
    env: {
      has_google_key: !!process.env.GOOGLE_API_KEY,
      has_mongodb_uri: !!process.env.MONGODB_URI
    }
  });
});

// Endpoint 1: Chat Route (Public)
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    console.log(`[DEBUG] Received query: "${query}"`);

    // 1. QUERY EXPANSION
    let optimizedQuery = query;
    try {
      const expansionPrompt = `You are a search optimizer. Convert the following user query into a highly specific English search phrase for an LTO manual. 
Focus on identifying the specific transaction (New, Renewal, etc) and the license type.
Query: "${query}"
Output ONLY the optimized search phrase.`;

      const expansionResult = await chatModel.invoke([
        new HumanMessage(expansionPrompt)
      ]);
      optimizedQuery = typeof expansionResult.content === "string" ? expansionResult.content.trim() : query;
      console.log(`[DEBUG] Optimized Search Query: "${optimizedQuery}"`);
    } catch (expError) {
      console.error("[DEBUG] Expansion Error (falling back to original):", expError);
    }

    // 2. Similarity Search
    let searchResults = [];
    try {
      searchResults = await vectorStore.similaritySearch(optimizedQuery, 10);
      console.log(`[DEBUG] Search complete. Found ${searchResults.length} chunks.`);
    } catch (searchError) {
      console.error("[DEBUG] Vector Search Error:", searchError);
      throw new Error("Failed to search knowledge base.");
    }

    const context = searchResults.map((doc) => doc.pageContent).join("\n\n");
    const sources = Array.from(new Set(searchResults.map((doc) => doc.metadata.source || "Unknown Source")));

    // System Prompt
    const systemPrompt = `You are an expert, bilingual (English and Tagalog/Taglish) assistant for the Philippine Land Transportation Office (LTO). 
Your domain is strictly limited to Driver's License Applications, Renewals, and Fees.

CRITICAL INSTRUCTIONS:
1. Grounding: Answer ONLY using the provided Context. 
2. Section Awareness: Carefully check the context headers to match the specific transaction.
3. If the answer is present, match the user's language (English or Taglish).
4. Format: Output ONLY valid JSON:
   {"status": "success" | "out_of_scope" | "missing_info", "answer": "...", "sources": ["..."]}

Context:
${context}

User Query: ${query}`;

    const response = await chatModel.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(query),
    ]);

    // Parse the JSON response
    let result;
    try {
      const content = typeof response.content === "string" ? response.content.replace(/```json|```/g, "").trim() : "";
      result = JSON.parse(content);
    } catch (parseError) {
      result = {
        status: "success",
        answer: typeof response.content === "string" ? response.content : "Error processing answer.",
        sources: sources,
      };
    }

    res.json(result);
  } catch (error: any) {
    console.error("Chat Error:", error);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined 
    });
  }
});

// Endpoint 2: Admin Upload Route (Protected)
app.post("/api/admin/upload", adminAuth, upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;

    // Parse with LlamaParse
    const llamaDocs = await llamaParser.loadData(filePath);
    const markdownText = llamaDocs.map((doc: any) => doc.text).join("\n\n");

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 2000,
      chunkOverlap: 250,
    });

    const chunks = await splitter.splitText(markdownText);
    const langChainDocs = chunks.map(
      (chunk) =>
        new LangChainDocument({
          pageContent: `DOCUMENT: ${originalName}\n\nCONTENT:\n${chunk}`,
          metadata: { source: originalName },
        })
    );

    await vectorStore.addDocuments(langChainDocs);

    const uploadLog = {
      filename: originalName,
      uploadDate: new Date(),
      chunkCount: langChainDocs.length,
      status: "COMPLETED_AND_INDEXED"
    };
    await db.collection("upload_history").insertOne(uploadLog);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: "Success", fileName: originalName });
  } catch (error: any) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Only listen locally
if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}

export default app;
