import re
from shared.extraction_classes import SignalClassification, SignalType

class SignalClassifier:
    # Keywords that indicate explicit decision-making (HIGH weight = 2 points)
    REASONING_KEYWORDS = [
        r'\bbecause\b', r'\btherefore\b', r'\bthe reason\b',
        r'\bwe decided\b', r'\bwe chose\b', r'\bover\b',
        r'\bhowever\b', r'\balternatively\b', r'\bthe downside\b'
    ]
    
    # Keywords that indicate risk, curiosity, or tribal knowledge (LOWER weight = 1 point)
    SUPPORTING_KEYWORDS = [
        r'\brisk\b', r'\bflaky\b', r'\bfail(s|ed|ure)?\b', 
        r'\bbroken\b', r'\boutage\b', r'\brollback\b',
        r'\bwhy\b', r'\bunknown\b', r'\bnot sure\b', r'\btribal\b',
        r'\bdepends?\b', r'\brelies?\b'
    ]
    
    def classify(self, text: str) -> SignalClassification:
        # Guard against empty text
        if not text or not text.strip():
            return SignalClassification(
                score=0.0,
                content_type=SignalType.LOW_SIGNAL,
                needs_entity_extraction=False,
                needs_reasoning_extraction=False
            )

        word_count = len(text.split())
        
        # Count weighted matches
        reasoning_points = sum(2 for p in self.REASONING_KEYWORDS if re.search(p, text, re.IGNORECASE))
        supporting_points = sum(1 for p in self.SUPPORTING_KEYWORDS if re.search(p, text, re.IGNORECASE))
        
        total_points = reasoning_points + supporting_points
        
        # Score = (points per word) * 4. Cap at 0.9 to leave room for human validation.
        # Multiplier 4 ensures explicit decisions (3 matches in 28 words) = ~0.85.
        # Medium texts (2 matches in 15 words) = ~0.53, which triggers reasoning anyway.
        base_score = min((total_points / max(word_count, 1)) * 4, 0.9)
        
        # Determine the specific type for the metadata
        content_type = self._determine_type(text)
        
        # Gatekeeping logic
        if base_score < 0.3:
            return SignalClassification(
                score=base_score,
                content_type=SignalType.LOW_SIGNAL,
                needs_entity_extraction=False,
                needs_reasoning_extraction=False
            )
        
        # Entity extraction is cheap, so we do it for medium scores (0.3 - 0.6).
        # Reasoning extraction is expensive, so we only do it for high scores (>= 0.6).
        needs_reasoning = base_score >= 0.6
        
        return SignalClassification(
            score=base_score,
            content_type=content_type,
            needs_entity_extraction=True,  # Always true if > 0.3
            needs_reasoning_extraction=needs_reasoning
        )

    def _determine_type(self, text: str) -> SignalType:
        """Classify the type of content based on strongest signal."""
        if re.search(r'incident|outage|fail|rollback|flaky|broken', text, re.I): 
            return SignalType.INCIDENT_RECORD
        if re.search(r'depends on|dependency|relies on', text, re.I): 
            return SignalType.DEPENDENCY_CLAIM
        if re.search(r'risk|danger|vulnerable|flaky', text, re.I): 
            return SignalType.RISK_IDENTIFICATION
        if re.search(r'decided|chose|we should|we need to|why', text, re.I): 
            return SignalType.ARCHITECTURAL_DECISION
        if re.search(r'tribal|in our experience|legacy|hack', text, re.I): 
            return SignalType.TRIBAL_KNOWLEDGE
        return SignalType.LOW_SIGNAL