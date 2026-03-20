import React, { useState, useRef, useEffect } from "react";
import { Box, TextField, Button, Paper, Typography, List, ListItem, Chip, CircularProgress, Stack } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import axios from "axios";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  status?: "success" | "out_of_scope";
}

const Chat: React.FC = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const apiUrl = `${import.meta.env.VITE_API_URL}/chat`;
    console.log(`[DEBUG] Calling API: ${apiUrl}`);

    try {
      const response = await axios.post(apiUrl, { query: input });
      const data = response.data;

      const assistantMsg: Message = {
        role: "assistant",
        content: data.answer || "No response content.",
        sources: data.sources,
        status: data.status,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error("Chat Error Details:", error);
      
      let errorMessage = "Sorry, something went wrong. Please try again later.";
      
      if (error.response) {
        // Backend returned a non-2xx response
        const backendError = error.response.data;
        errorMessage = `Backend Error (${error.response.status}): ${backendError.message || backendError.error || JSON.stringify(backendError)}`;
      } else if (error.request) {
        // Request was made but no response was received (likely CORS or network)
        errorMessage = `Network Error: No response from ${apiUrl}. This could be a CORS issue or the backend is offline.`;
      } else {
        errorMessage = `Request Error: ${error.message}`;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: errorMessage }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ height: "70vh", display: "flex", flexDirection: "column" }}>
      <Paper elevation={3} sx={{ flexGrow: 1, mb: 2, p: 2, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <List>
          {messages.map((msg, index) => (
            <ListItem
              key={index}
              sx={{
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                mb: 1,
              }}
            >
              <Box
                sx={{
                  maxWidth: "70%",
                  bgcolor: msg.role === "user" ? "primary.main" : "grey.200",
                  color: msg.role === "user" ? "white" : "black",
                  p: 2,
                  borderRadius: 2,
                  "& p": { m: 0, mb: 1, "&:last-child": { mb: 0 } },
                  "& ul, & ol": { mt: 0, mb: 1, pl: 2 },
                  "& li": { mb: 0.5 },
                  "& strong": { fontWeight: 600 }
                }}
              >
                {msg.role === "user" ? (
                  <Typography variant="body1">{msg.content}</Typography>
                ) : (
                  <Typography variant="body1" component="div">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </Typography>
                )}
              </Box>
              {msg.sources && msg.sources.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}>
                  {msg.sources.map((source, i) => (
                    <Chip key={i} label={source} size="small" variant="outlined" />
                  ))}
                </Stack>
              )}
            </ListItem>
          ))}
          {loading && (
            <ListItem sx={{ flexDirection: "column", alignItems: "flex-start", mb: 1 }}>
              <Box sx={{ bgcolor: "grey.100", p: 2, borderRadius: 2, display: "flex", alignItems: "center", gap: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="textSecondary">
                  LTO Assistant is thinking...
                </Typography>
              </Box>
            </ListItem>
          )}
          <div ref={messagesEndRef} />
        </List>
      </Paper>
      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          fullWidth
          placeholder="Ask about driver's licenses..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          disabled={loading}
        />
        <Button variant="contained" onClick={handleSend} disabled={loading || !input.trim()} endIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}>
          Send
        </Button>
      </Box>
    </Box>
  );
};

export default Chat;
