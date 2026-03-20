"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const textsplitters_1 = require("@langchain/textsplitters");
const documents_1 = require("@langchain/core/documents");
const langchain_1 = require("./lib/langchain");
const parser_1 = require("./lib/parser");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Set up multer for file uploads
const upload = (0, multer_1.default)({ dest: "uploads/" });
// Middleware for admin password validation
const adminAuth = (req, res, next) => {
    const password = req.headers["authorization"];
    if (password === process.env.ADMIN_PASSWORD) {
        next();
    }
    else {
        res.status(401).json({ error: "Unauthorized: Invalid admin password" });
    }
};
// Endpoint 1: Chat Route (Public)
app.post("/api/chat", async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) {
            return res.status(400).json({ error: "Query is required" });
        }
        console.log(`[DEBUG] Received query: "${query}"`);
        // Similarity Search
        const searchResults = await langchain_1.vectorStore.similaritySearch(query, 4);
        console.log(`[DEBUG] Found ${searchResults.length} relevant context chunks.`);
        const context = searchResults.map((doc) => doc.pageContent).join("\n\n");
        const sources = Array.from(new Set(searchResults.map((doc) => doc.metadata.source || "Unknown Source")));
        // System Prompt for Expert Bilingual Assistant
        const systemPrompt = `You are an expert, bilingual (English and Tagalog/Taglish) assistant for the Philippine Land Transportation Office (LTO). Your specific domain is limited to Driver's License Applications, Renewals, and Fees.

STRICT RULES:

Grounding: Answer ONLY using the provided context. If the context lacks the answer, or if the query is about vehicle registration or traffic violations, you must politely decline.

Tone: Be helpful, direct, and conversational. Match the user's language. If they ask in Taglish, reply in Taglish. Translate bureaucratic tables into easy-to-read steps.

Format: Output ONLY valid JSON matching this schema:
{
  "status": "success" | "out_of_scope" | "missing_info",
  "answer": "...",
  "sources": ["..."]
}

EXAMPLES:

User: "Magkano aabutin ko for non-pro renewal?"
Context: [DL-CC-2025: Renewal Fee: PHP 585, Penalty: PHP 75 (1 day to 1 yr)]
Output: {"status": "success", "answer": "Ang basic fee para sa renewal ng Non-Professional license ay PHP 585. Magdala rin po kayo ng extra in case may penalty kung expired na ang lisensya ninyo.", "sources": ["DL-CC-2025.pdf"]}

User: "How do I register my new Toyota Vios?"
Context: [DL-CC-2025: Driver's License Transactions...]
Output: {"status": "out_of_scope", "answer": "I apologize, but I can only assist with Driver's License applications and renewals. For motor vehicle registration, please refer to the Motor Vehicle section of the LTO portal.", "sources": []}

User: "LTO is so slow, you guys just want to take my money right?"
Context: []
Output: {"status": "out_of_scope", "answer": "I understand applying for documents can be frustrating. However, I am an automated assistant designed strictly to help you with the requirements and steps for your driver's license! How can I help you prepare for your application today?", "sources": []}

CURRENT TASK:
Context: ${context}
User Query: ${query}`;
        const response = await langchain_1.chatModel.invoke([
            { role: "system", content: systemPrompt },
            { role: "user", content: query },
        ]);
        console.log(`[DEBUG] Raw LLM response: ${response.content}`);
        // Parse the JSON response
        let result;
        try {
            // Stripping potential markdown code blocks if the LLM includes them
            const content = typeof response.content === "string" ? response.content.replace(/```json|```/g, "").trim() : "";
            result = JSON.parse(content);
        }
        catch (parseError) {
            console.error("[DEBUG] JSON Parse Error:", parseError, response.content);
            result = {
                status: "success",
                answer: typeof response.content === "string" ? response.content : "Error processing answer.",
                sources: sources,
            };
        }
        res.json(result);
    }
    catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// Endpoint 2: Admin Upload Route (Protected)
app.post("/api/admin/upload", adminAuth, upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        const filePath = req.file.path;
        const originalName = req.file.originalname;
        console.log(`[DEBUG] Parsing document: ${originalName}`);
        // Parse with LlamaParse
        const llamaDocs = await parser_1.llamaParser.loadData(filePath);
        console.log(`[DEBUG] Successfully parsed ${llamaDocs.length} documents from LlamaParse.`);
        const markdownText = llamaDocs.map((doc) => doc.text).join("\n\n");
        // Split text with RecursiveCharacterTextSplitter
        const splitter = new textsplitters_1.RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const chunks = await splitter.splitText(markdownText);
        const langChainDocs = chunks.map((chunk) => new documents_1.Document({
            pageContent: chunk,
            metadata: { source: originalName },
        }));
        // Upsert into MongoDB Vector Search
        console.log(`[DEBUG] Upserting ${langChainDocs.length} chunks into vector store...`);
        await langchain_1.vectorStore.addDocuments(langChainDocs);
        // Clean up uploaded file
        fs_1.default.unlinkSync(filePath);
        res.json({ message: "File processed and uploaded to vector store successfully", fileName: originalName });
    }
    catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({
            error: "Internal Server Error during file ingestion",
            details: error.message
        });
    }
});
app.listen(port, () => {
    console.log(`Backend server listening on port ${port}`);
});
//# sourceMappingURL=index.js.map