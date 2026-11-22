#!/usr/bin/env python3
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.api.routes:app",
        host="127.0.0.1",
        port=5500,
        reload=True,
        log_level="info"
    )