#!/usr/bin/env python3
"""Development entry point. Use `python run.py` from the repository root."""

import uvicorn


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
