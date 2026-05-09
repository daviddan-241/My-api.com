import type { Request, Response, NextFunction } from "express";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers["x-api-key"];
  const expected = process.env.API_KEY;

  if (!expected) {
    res.status(500).json({ error: "API_KEY not configured on server" });
    return;
  }

  if (key !== expected) {
    res.status(401).json({ error: "Invalid or missing API key. Pass it as the x-api-key header." });
    return;
  }

  next();
}
