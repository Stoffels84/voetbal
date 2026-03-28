import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
// In this environment, we can try to initialize with default credentials
// or use the project ID from the config file.
const configPath = path.join(__dirname, "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = admin.firestore();
const auth = admin.auth();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to delete a user from Firebase Auth
  app.post("/api/admin/delete-user", async (req, res) => {
    const { userId } = req.body;
    const idToken = req.headers.authorization?.split("Bearer ")[1];

    if (!idToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      // Verify the requester is an admin
      const decodedToken = await auth.verifyIdToken(idToken);
      const requesterUid = decodedToken.uid;
      
      const requesterDoc = await db.collection("users").doc(requesterUid).get();
      const requesterData = requesterDoc.data();

      if (!requesterData || requesterData.role !== "admin") {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      // Delete the user from Firebase Authentication
      await auth.deleteUser(userId);
      
      res.json({ success: true, message: `User ${userId} deleted from Firebase Auth` });
    } catch (error: any) {
      console.error("Error deleting user from Auth:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
