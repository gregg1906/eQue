import os
import sys

# Testy jednostkowe nie łączą się z bazą ani Redisem; sqlite wystarcza, żeby zaimportować moduły.
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET_KEY", "k" * 48)
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
