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

console.log(`[DEBUG] Startup Env Check - GOOGLE_API_KEY: ${process.env.GOOGLE_API_KEY ? "Present (ends in " + process.env.GOOGLE_API_KEY.slice(-4) + ")" : "MISSING"}`);
console.log(`[DEBUG] Startup Env Check - MONGODB_URI: ${process.env.MONGODB_URI ? "Present" : "MISSING"}`);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Set up multer for file uploads
const upload = multer({ dest: "uploads/" });

// Middleware for admin password validation
const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const password = req.headers["authorization"];
  if (password === process.env.ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized: Invalid admin password" });
  }
};

// Endpoint 1: Chat Route (Public)
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    console.log(`[DEBUG] Received query: "${query}"`);

    // 1. QUERY EXPANSION: Optimize the search query for better retrieval
    const expansionPrompt = `You are a search optimizer. Convert the following user query into a highly specific English search phrase for an LTO manual. 
Focus on identifying the specific transaction (New, Renewal, etc) and the license type.
Query: "${query}"
Output ONLY the optimized search phrase.`;

    const expansionResult = await chatModel.invoke([
      new HumanMessage(expansionPrompt)
    ]);
    const optimizedQuery = typeof expansionResult.content === "string" ? expansionResult.content.trim() : query;
    console.log(`[DEBUG] Optimized Search Query: "${optimizedQuery}"`);

    // 2. Similarity Search using optimized query
    console.log(`[DEBUG] Performing similarity search...`);
    const searchResults = await vectorStore.similaritySearch(optimizedQuery, 10);
    console.log(`[DEBUG] Search complete. Found ${searchResults.length} relevant context chunks.`);

    if (searchResults.length > 0) {
      console.log(`[DEBUG] Context Snippet (First 500 chars): "${searchResults.map(d => d.pageContent).join(" ").substring(0, 500)}..."`);
    } else {
      console.log(`[DEBUG] WARNING: Zero chunks found.`);
    }

    const context = searchResults.map((doc) => doc.pageContent).join("\n\n");
    const sources = Array.from(new Set(searchResults.map((doc) => doc.metadata.source || "Unknown Source")));

    // System Prompt for Expert Bilingual Assistant
    const systemPrompt = `You are an expert, bilingual (English and Tagalog/Taglish) assistant for the Philippine Land Transportation Office (LTO). 
Your domain is strictly limited to Driver's License Applications, Renewals, and Fees.

CRITICAL INSTRUCTIONS:
1. Grounding: Answer ONLY using the provided Context. 
2. Section Awareness: The context contains snippets from different LTO procedures (e.g., New Application, Renewal, Foreign Conversion). Carefully check the header or description in the content to ensure you are giving the process for the specific transaction the user is asking for.
3. If the user asks for "Application" and the context only shows "Renewal", politely explain that you have information for Renewal but not for New Applications.
4. If the answer is present, match the user's language. If they ask in Taglish, reply in Taglish.
5. Format: Output ONLY valid JSON matching this schema:
   {"status": "success" | "out_of_scope" | "missing_info", "answer": "...", "sources": ["..."]}

Context:
${context}

User Query: ${query}`;

    const response = await chatModel.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(query),
    ]);

    console.log(`[DEBUG] Raw LLM response: ${response.content}`);

    // Parse the JSON response
    let result;
    try {
      // Stripping potential markdown code blocks if the LLM includes them
      const content = typeof response.content === "string" ? response.content.replace(/```json|```/g, "").trim() : "";
      result = JSON.parse(content);
    } catch (parseError) {
      console.error("[DEBUG] JSON Parse Error:", parseError, response.content);
      result = {
        status: "success",
        answer: typeof response.content === "string" ? response.content : "Error processing answer.",
        sources: sources,
      };
    }

    res.json(result);
  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
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

    console.log(`[DEBUG] Parsing document: ${originalName}`);

    // Parse with LlamaParse
    const llamaDocs = await llamaParser.loadData(filePath);
    const markdownText = llamaDocs.map((doc: any) => doc.text).join("\n\n");
    console.log(`[DEBUG] Successfully parsed document. Text snippet: "${markdownText.substring(0, 300)}..."`);

    // Split text with RecursiveCharacterTextSplitter
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

    console.log(`[DEBUG] Created ${langChainDocs.length} enriched chunks from ${originalName}.`);

    // Upsert into MongoDB Vector Search
    console.log(`[DEBUG] Upserting ${langChainDocs.length} chunks into vector store...`);
    await vectorStore.addDocuments(langChainDocs);

    // PERSISTENT LOG: Add record to MongoDB upload_history
    const uploadLog = {
      filename: originalName,
      uploadDate: new Date(),
      chunkCount: langChainDocs.length,
      textPreview: markdownText.substring(0, 500),
      status: "COMPLETED_AND_INDEXED"
    };
    await db.collection("upload_history").insertOne(uploadLog);
    console.log(`[BACKEND LOG] Added record to 'upload_history' collection.`);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({ 
      message: "File processed and uploaded to vector store successfully", 
      fileName: originalName,
      chunks: langChainDocs.length
    });
  } catch (error: any) {
    console.error("Upload Error:", error);
    res.status(500).json({ 
      error: "Internal Server Error during file ingestion",
      details: error.message 
    });
  }
});

app.listen(port, async () => {
  console.log(`Backend server listening on port ${port}`);
  
  // Verify DB content on startup
  try {
    const count = await db.collection("documents").countDocuments();
    console.log(`[DEBUG] Initial DB Check: ${count} documents found in 'documents' collection.`);
    if (count > 0) {
      const sample = await db.collection("documents").findOne();
      console.log(`[DEBUG] Sample document keys: ${Object.keys(sample || {})}`);
      
      // Test search
      console.log(`[DEBUG] Testing vector search for "driver license"...`);
      const testResults = await vectorStore.similaritySearch("driver license", 1);
      console.log(`[DEBUG] Vector search test found ${testResults.length} results.`);
    }
  } catch (err) {
    console.error("[DEBUG] DB Check/Search Error:", err);
  }
});
