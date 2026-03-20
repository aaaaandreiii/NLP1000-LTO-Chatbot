import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Button, Container, Box } from "@mui/material";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: "#90caf9",
    },
    secondary: {
      main: "#f48fb1",
    },
    background: {
      default: "#0b0d11",
      paper: "#16191f",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
          <AppBar position="static" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Toolbar variant="dense">
              <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: -0.5 }}>
                LTO AI Assistant
              </Typography>
              <Button color="inherit" component={Link} to="/">
                Chat
              </Button>
              <Button color="inherit" component={Link} to="/admin">
                Admin
              </Button>
            </Toolbar>
          </AppBar>
          <Box component="main" sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Routes>
              <Route path="/" element={<Chat />} />
              <Route path="/admin" element={<Box sx={{ p: 4, overflowY: 'auto' }}><Admin /></Box>} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
};

export default App;
