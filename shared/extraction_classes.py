# shared/extraction_classes.py
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class SignalType(str, Enum):
    ARCHITECTURAL_DECISION = "ARCHITECTURAL_DECISION"
    INCIDENT_RECORD = "INCIDENT_RECORD"
    DEPENDENCY_CLAIM = "DEPENDENCY_CLAIM"
    RISK_IDENTIFICATION = "RISK_IDENTIFICATION"
    TRIBAL_KNOWLEDGE = "TRIBAL_KNOWLEDGE"
    LOW_SIGNAL = "LOW_SIGNAL"

class SignalClassification(BaseModel):
    score: float = Field(ge=0.0, le=1.0)          # 0.3/0.6 thresholds applied here
    content_type: SignalType
    needs_entity_extraction: bool
    needs_reasoning_extraction: bool

class Entity(BaseModel):
    text: str
    type: str                  # Person, System, Component, Technology, Concept...
    role: str                   # subject, object, context
    confidence: float

class KnowledgeClaim(BaseModel):
    claim_type: str                                     # DECISION, RISK, DEPENDENCY...
    claim_text: str                                    # ONE sentence, present tense.
    rationale: str                                     # Why? 1-3 sentences.
    alternatives_considered: List[str]                 # Must be empty list if none.
    conditions: Optional[str] = None
    risks_identified: List[str]                              # Must be empty list if none.
    entities_involved: List[str]
    confidence_score: float                                  # 0.0 to 1.0 (CRITICAL: We derive this explicitly)
    source_quote: str                                          # Exact snippet from source under 50 words.
    status: str = "pending_review" # Always start here.