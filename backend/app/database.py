import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
load_dotenv(Path(__file__).resolve().parents[1] / '.env')
class Base(DeclarativeBase): pass
engine = create_engine(os.getenv('DATABASE_URL', 'sqlite:///./juniper.db'), connect_args={'check_same_thread': False})
@event.listens_for(engine, 'connect')
def foreign_keys(connection, _):
    connection.execute('PRAGMA foreign_keys=ON')
SessionLocal = sessionmaker(engine, expire_on_commit=False)
def get_db():
    with SessionLocal() as session:
        yield session
