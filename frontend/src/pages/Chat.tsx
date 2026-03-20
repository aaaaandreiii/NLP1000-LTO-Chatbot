import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  IconButton,
  Paper,
  Typography,
  List,
  ListItem,
  Chip,
  CircularProgress,
  Stack,
  Avatar,
  InputBase,
  Container,
  useTheme
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import axios from "axios";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  status?: "success" | "out_of_scope";
}

const Chat: React.FC = () => {
  const theme = useTheme();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am your LTO Assistant. How can I help you today regarding driver's licenses and related services?"
    }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const baseUrl = import.meta.env.VITE_API_URL ? 
      (import.meta.env.VITE_API_URL.endsWith('/') ? import.meta.env.VITE_API_URL.slice(0, -1) : import.meta.env.VITE_API_URL) 
      : "";
    const apiUrl = `${baseUrl}/chat`;

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
      console.error("Chat Error:", error);
      let errorMessage = "Sorry, I encountered an error. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: errorMessage }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", bgcolor: "background.default", position: "relative" }}>
      {/* Messages Area */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", py: 4, px: { xs: 2, md: 4 } }}>
        <Container maxWidth="md">
          <List sx={{ p: 0 }}>
            {messages.map((msg, index) => (
              <ListItem
                key={index}
                sx={{
                  flexDirection: "column",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                  px: 0,
                  py: 1.5,
                }}
              >
                <Box sx={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", alignItems: "flex-end", gap: 1.5, maxWidth: "85%" }}>
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      bgcolor: msg.role === "user" ? "primary.main" : "secondary.main",
                      fontSize: "1rem"
                    }}
                  >
                    {msg.role === "user" ? <PersonOutlineIcon fontSize="small" /> : <SmartToyOutlinedIcon fontSize="small" />}
                  </Avatar>
                  
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      borderBottomRightRadius: msg.role === "user" ? 4 : 24,
                      borderBottomLeftRadius: msg.role === "assistant" ? 4 : 24,
                      bgcolor: msg.role === "user" ? "primary.main" : "background.paper",
                      color: msg.role === "user" ? "primary.contrastText" : "text.primary",
                      boxShadow: 1,
                      position: "relative",
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
                    
                    {msg.sources && msg.sources.length > 0 && (
                      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" sx={{ display: 'block', mb: 1, opacity: 0.7, fontWeight: 600 }}>
                          SOURCES
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                          {msg.sources.map((source, i) => (
                            <Chip 
                              key={i} 
                              label={source} 
                              size="small" 
                              variant="outlined" 
                              sx={{ 
                                fontSize: '0.7rem', 
                                height: 20,
                                borderColor: msg.role === "user" ? "rgba(255,255,255,0.3)" : "divider",
                                color: "inherit"
                              }} 
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Box>
                </Box>
              </ListItem>
            ))}
            {loading && (
              <ListItem sx={{ flexDirection: "column", alignItems: "flex-start", px: 0, py: 1.5 }}>
                 <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1.5 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main" }}>
                    <SmartToyOutlinedIcon fontSize="small" />
                  </Avatar>
                  <Box sx={{ bgcolor: "background.paper", p: 2, borderRadius: 3, borderBottomLeftRadius: 4, display: "flex", alignItems: "center", gap: 2, boxShadow: 1 }}>
                    <CircularProgress size={16} thickness={5} />
                    <Typography variant="body2" color="textSecondary">
                      LTO Assistant is thinking...
                    </Typography>
                  </Box>
                </Box>
              </ListItem>
            )}
            <div ref={messagesEndRef} />
          </List>
        </Container>
      </Box>

      {/* Input Area */}
      <Box sx={{ p: 2, bgcolor: "background.default" }}>
        <Container maxWidth="md">
          <Paper
            elevation={0}
            sx={{
              p: "4px 8px",
              display: "flex",
              alignItems: "center",
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              '&:focus-within': {
                borderColor: 'primary.main',
                boxShadow: `0 0 0 2px ${theme.palette.primary.main}33`
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <InputBase
              sx={{ ml: 1, flex: 1, py: 1 }}
              placeholder="Ask about driver's licenses, renewals, or requirements..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              multiline
              maxRows={4}
              disabled={loading}
            />
            <IconButton 
              color="primary" 
              sx={{ p: "10px" }} 
              onClick={handleSend} 
              disabled={loading || !input.trim()}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : <SendRoundedIcon />}
            </IconButton>
          </Paper>
          <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1, opacity: 0.5 }}>
            LTO AI Assistant can make mistakes. Check important info.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default Chat;
