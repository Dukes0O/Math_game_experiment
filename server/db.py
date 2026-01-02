from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
from server.settings import settings

engine = create_engine(settings.db_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

class Profile(Base):
    __tablename__ = 'profiles'
    id = Column(String, primary_key=True, index=True)
    display_name = Column(String, default='Guest')
    settings_json = Column(Text, default='{}')
    created_at = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)

class WorldState(Base):
    __tablename__ = 'world_state'
    profile_id = Column(String, primary_key=True)
    flags_json = Column(Text, default='{}')
    reputation_json = Column(Text, default='{}')
    unlocked_json = Column(Text, default='{}')

class Inventory(Base):
    __tablename__ = 'inventory'
    profile_id = Column(String, primary_key=True)
    gems = Column(Integer, default=0)
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    items_json = Column(Text, default='{}')
    cosmetics_json = Column(Text, default='{}')

class Run(Base):
    __tablename__ = 'runs'
    id = Column(String, primary_key=True)
    profile_id = Column(String, index=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
    stats_json = Column(Text, default='{}')

class Attempt(Base):
    __tablename__ = 'attempts'
    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    topic = Column(String)
    problem_id = Column(String)
    correct = Column(Integer, default=0)
    time_ms = Column(Integer, default=0)
    hints_used = Column(Integer, default=0)
    error_type = Column(String, default='')

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
