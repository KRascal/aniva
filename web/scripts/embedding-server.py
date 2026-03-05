#!/usr/bin/env python3
"""
Local Embedding Server
sentence-transformers でローカルembedding生成
ポート: 3070 (APIキー不要、コストゼロ)

Usage: python3 scripts/embedding-server.py
Endpoint: POST http://localhost:3070/v1/embeddings
Body: {"input": "text or [texts]", "dimensions": 1536}
"""

import json
import os
import signal
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import List

# ─── モデルロード ──────────────────────────────────────────────
print("Loading embedding model...", flush=True)
from transformers import AutoTokenizer, AutoModel
import torch
import torch.nn.functional as F

MODEL_NAME = "intfloat/multilingual-e5-small"  # 384次元、日本語対応、超軽量(~130MB)
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModel.from_pretrained(MODEL_NAME)
model.eval()
print(f"✅ Model loaded: {MODEL_NAME}", flush=True)

def get_embeddings(texts: List[str], target_dim: int = 1536) -> List[List[float]]:
    """テキストをembedding化"""
    # E5モデルは "query: " or "passage: " prefix推奨
    prefixed = [f"query: {t}" for t in texts]
    
    with torch.no_grad():
        encoded = tokenizer(prefixed, padding=True, truncation=True, max_length=512, return_tensors="pt")
        output = model(**encoded)
        # Mean pooling
        attention_mask = encoded['attention_mask']
        token_embeddings = output.last_hidden_state
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        embeddings = torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)
        embeddings = F.normalize(embeddings, p=2, dim=1)
    
    result = []
    for emb in embeddings:
        vec = emb.tolist()
        # 次元調整（384→1536: ゼロパディング）
        if len(vec) < target_dim:
            vec = vec + [0.0] * (target_dim - len(vec))
        elif len(vec) > target_dim:
            vec = vec[:target_dim]
        result.append(vec)
    
    return result


class EmbeddingHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/v1/embeddings":
            self.send_error(404)
            return
        
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return
        
        input_data = data.get("input", "")
        dimensions = data.get("dimensions", 1536)
        
        if isinstance(input_data, str):
            input_data = [input_data]
        
        try:
            embeddings = get_embeddings(input_data, dimensions)
        except Exception as e:
            self.send_error(500, str(e))
            return
        
        response = {
            "object": "list",
            "model": MODEL_NAME,
            "data": [
                {"object": "embedding", "index": i, "embedding": emb}
                for i, emb in enumerate(embeddings)
            ],
            "usage": {"prompt_tokens": sum(len(t) for t in input_data), "total_tokens": sum(len(t) for t in input_data)},
        }
        
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(response).encode())
    
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "model": MODEL_NAME}).encode())
            return
        self.send_error(404)
    
    def log_message(self, format, *args):
        pass  # 静かに


class ReusableHTTPServer(HTTPServer):
    allow_reuse_address = True
    allow_reuse_port = True


def main():
    port = int(os.environ.get("EMBEDDING_PORT", "3075"))
    server = ReusableHTTPServer(("127.0.0.1", port), EmbeddingHandler)
    
    def shutdown(sig, frame):
        print("\nShutting down...", flush=True)
        server.shutdown()
        sys.exit(0)
    
    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    
    print(f"🚀 Embedding server running on http://127.0.0.1:{port}", flush=True)
    server.serve_forever()

if __name__ == "__main__":
    main()
