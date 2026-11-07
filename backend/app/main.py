import os, logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database import Base, engine, SessionLocal, get_db
from app.api.routes import router
from app.services.seed import seed
@asynccontextmanager
async def lifespan(app):
    if get_db not in app.dependency_overrides:
        Base.metadata.create_all(engine)
        with SessionLocal() as db: seed(db)
    yield
app=FastAPI(title='Juniper Restaurant Advisor',version='1.0.0',lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=[os.getenv('FRONTEND_ORIGIN','http://localhost:5173')],allow_methods=['GET','POST','PUT','PATCH','DELETE'],allow_headers=['Content-Type'])
app.include_router(router)
@app.exception_handler(Exception)
async def unexpected(request:Request,exc:Exception):
    logging.error('Unhandled backend error: %s',type(exc).__name__)
    return JSONResponse(status_code=500,content={'detail':'Something went wrong. Please retry; no incomplete transaction was saved.'})
from app.api.voice import router as voice_router
app.include_router(voice_router)
