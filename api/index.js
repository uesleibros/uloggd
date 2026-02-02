import express from "express";

const app = express();

app.get("/api/backloggd/v1", (req, res) => {
  res.json({ 
    message: "Rota /api/backloggd/v1 configurada com sucesso!",
    status: "online"
  });
});

export const handler = app;
