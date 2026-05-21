import os

from dotenv import load_dotenv
load_dotenv()

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY environment variable is not set.")


JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable is not set.")

ADMIN_USERNAMES = {u.strip() for u in os.getenv("ADMIN_USERNAMES", os.getenv("ADMIN_USERNAME", "")).split(",") if u.strip()}

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
CLAUDE_MODEL_NAME = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")
# Pricing per million tokens — update if Anthropic changes rates
CLAUDE_INPUT_COST_PER_MTK = float(os.getenv("CLAUDE_INPUT_COST_PER_MTK", "3.0"))
CLAUDE_OUTPUT_COST_PER_MTK = float(os.getenv("CLAUDE_OUTPUT_COST_PER_MTK", "15.0"))
