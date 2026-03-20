import { LlamaParseReader } from "@llamaindex/cloud";
import dotenv from "dotenv";

dotenv.config();

export const llamaParser = new LlamaParseReader({
  apiKey: process.env.LLAMA_CLOUD_API_KEY,
  resultType: "markdown",
  verbose: true,
  parsingInstruction: `This is a Philippine LTO (Land Transportation Office) Citizen's Charter. 
  It contains tables for fees, requirements, and step-by-step procedures. 
  Please extract all tables as clear Markdown tables. 
  Ensure each section (e.g., New Application, Renewal) is clearly separated by headers. 
  Do not skip any pages.`,
});
