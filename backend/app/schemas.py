from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class PlanAction(BaseModel):
    action_type: str
    target_type: str
    ids: List[str] = Field(default_factory=list)
    magnitude_pct: float = 0.0
    constraints: List[str] = Field(default_factory=list)
    expected_impact: Dict[str, float] = Field(default_factory=dict)
    risks: List[str] = Field(default_factory=list)
    confidence: float = 0.0
    evidence_refs: List[str] = Field(default_factory=list)

class PlanJSON(BaseModel):
    plan_name: str = "Fallback Plan"
    assumptions: List[str] = Field(default_factory=list)
    actions: List[PlanAction] = Field(default_factory=list)
    rationale: Optional[str] = ""

class HuddleResponse(BaseModel):
    stopped_after_rounds: int = 0
    transcript: List[Dict[str, Any]] = Field(default_factory=list)
    final: PlanJSON = Field(default_factory=PlanJSON)
    citations: List[Dict[str, Any]] = Field(default_factory=list)
    error: Optional[str] = None