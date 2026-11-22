from fastapi import Request
from fastapi.responses import JSONResponse
import time
from app.utils.logger import setup_logger

logger = setup_logger()

async def log_requests(request: Request, call_next):
    """Middleware to log all requests"""
    start_time = time.time()
    
    # Process request
    response = await call_next(request)
    
    # Calculate processing time
    process_time = time.time() - start_time
    
    # Log request
    logger.info(
        f"Method: {request.method} | "
        f"Path: {request.url.path} | "
        f"Status: {response.status_code} | "
        f"Duration: {process_time:.3f}s"
    )
    
    return response

async def error_handler(request: Request, call_next):
    """Global error handler"""
    try:
        return await call_next(request)
    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Internal server error"
            }
        )