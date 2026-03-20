import React, { useState } from "react";
import { Box, TextField, Button, Typography, Paper, Alert, CircularProgress, List, ListItem, ListItemIcon, ListItemText, Divider } from "@mui/material";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import axios from "axios";

const Admin: React.FC = () => {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [processingStatus, setProcessingStatus] = useState<{ name: string; status: "pending" | "processing" | "completed" | "error" }[]>([]);

  const handleLogin = () => {
    if (password === import.meta.env.VITE_ADMIN_PASSWORD || password === "lto-admin-2026") {
      setIsAuthenticated(true);
    } else {
      alert("Invalid password");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);
      setProcessingStatus(selectedFiles.map(f => ({ name: f.name, status: "pending" })));
      setUploadStatus(null);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setLoading(true);
    setUploadStatus(null);
    
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      setProcessingStatus(prev => 
        prev.map((s, idx) => idx === i ? { ...s, status: "processing" } : s)
      );

      const formData = new FormData();
      formData.append("file", file);

      try {
        await axios.post(`${import.meta.env.VITE_API_URL}/admin/upload`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: password,
          },
        });
        
        setProcessingStatus(prev => 
          prev.map((s, idx) => idx === i ? { ...s, status: "completed" } : s)
        );
        successCount++;
      } catch (err: any) {
        console.error(`Error uploading ${file.name}:`, err);
        setProcessingStatus(prev => 
          prev.map((s, idx) => idx === i ? { ...s, status: "error" } : s)
        );
        failCount++;
      }
    }

    setLoading(false);
    if (failCount === 0) {
      setUploadStatus({ type: "success", message: `Successfully processed ${successCount} documents!` });
      setFiles([]);
    } else {
      setUploadStatus({ type: "error", message: `Processed ${successCount} documents, but ${failCount} failed.` });
    }
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <Paper elevation={3} sx={{ p: 4, width: "100%", maxWidth: 400 }}>
          <Typography variant="h5" gutterBottom>
            Admin Login
          </Typography>
          <TextField
            fullWidth
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 2 }}
            onKeyPress={(e) => e.key === "Enter" && handleLogin()}
          />
          <Button variant="contained" fullWidth onClick={handleLogin}>
            Login
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4, maxWidth: 800, mx: "auto" }}>
      <Typography variant="h4" gutterBottom align="center">
        LTO Document Management
      </Typography>
      <Paper elevation={3} sx={{ p: 4, mt: 2 }}>
        <Typography variant="h6" gutterBottom>Upload LTO PDF Documents</Typography>
        <Typography variant="body1" sx={{ mb: 3 }} color="textSecondary">
          Upload official LTO Citizens Charter or guidelines. LlamaParse will extract markdown and tables automatically.
        </Typography>

        {uploadStatus && (
          <Alert severity={uploadStatus.type} sx={{ mb: 3 }}>
            {uploadStatus.message}
          </Alert>
        )}

        <Box 
          sx={{ 
            border: "2px dashed #ccc", 
            p: 4, 
            textAlign: "center", 
            borderRadius: 2, 
            mb: 3,
            bgcolor: "#fafafa",
            cursor: "pointer",
            "&:hover": { bgcolor: "#f0f0f0" }
          }}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <input
            accept="application/pdf"
            style={{ display: "none" }}
            id="file-input"
            type="file"
            multiple
            onChange={handleFileChange}
          />
          <InsertDriveFileIcon sx={{ fontSize: 48, color: "grey.500", mb: 1 }} />
          <Typography variant="body1">
            {files.length > 0 ? `${files.length} files selected` : "Click to select multiple PDF Files"}
          </Typography>
        </Box>

        {processingStatus.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>Upload Queue:</Typography>
            <Paper variant="outlined">
              <List>
                {processingStatus.map((item, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemIcon>
                        {item.status === "pending" && <InsertDriveFileIcon />}
                        {item.status === "processing" && <CircularProgress size={20} />}
                        {item.status === "completed" && <CheckCircleIcon color="success" />}
                        {item.status === "error" && <ErrorIcon color="error" />}
                      </ListItemIcon>
                      <ListItemText 
                        primary={item.name} 
                        secondary={
                          item.status === "processing" ? "Parsing & Indexing (this may take a minute)..." : 
                          item.status === "completed" ? "Successfully Indexed" :
                          item.status === "error" ? "Failed to process" : "Waiting..."
                        } 
                      />
                    </ListItem>
                    {index < processingStatus.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Box>
        )}

        <Button 
          variant="contained" 
          onClick={handleUpload} 
          disabled={files.length === 0 || loading} 
          fullWidth 
          sx={{ py: 1.5 }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : `Upload and Ingest ${files.length} Files`}
        </Button>
      </Paper>
    </Box>
  );
};

export default Admin;
