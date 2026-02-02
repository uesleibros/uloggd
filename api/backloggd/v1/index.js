export default function handler(req, res) {
  res.status(200).json({
    message: "Rota configurada!",
    path: "/api/backloggd/v1"
  });
}
