"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.llamaParser = void 0;
const cloud_1 = require("@llamaindex/cloud");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.llamaParser = new cloud_1.LlamaParseReader({
    apiKey: process.env.LLAMA_CLOUD_API_KEY,
    resultType: "markdown",
    verbose: true,
});
//# sourceMappingURL=parser.js.map