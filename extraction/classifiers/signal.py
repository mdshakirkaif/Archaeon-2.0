# extraction/classifiers/signal.py
import json
import re
import ollama
from shared.extraction_classes import SignalClassification, SignalType

class SignalClassifier:
    def __init__(self, model="llama3.2:3b"):
        self.model = model

    def classify(self, text: str) -> SignalClassification:
        if not text or not text.strip():
            return self._low_signal()

        # Build prompt
        prompt = f"""
Classify the following piece of engineering text into EXACTLY ONE of these categories:
- ARCHITECTURAL_DECISION: Contains reasoning about why a technical choice was made.
- INCIDENT_RECORD: Describes an outage, failure, or rollback.
- DEPENDENCY_CLAIM: States that one system relies on another.
- RISK_IDENTIFICATION: Identifies something that could break or go wrong.
- TRIBAL_KNOWLEDGE: Contains undocumented experience or 'lore'.
- LOW_SIGNAL: Contains no significant technical information.

Output MUST be a JSON object with two keys: "label" and "score".
Example: {{"label": "ARCHITECTURAL_DECISION", "score": 0.95}}

Text: {text}
Output:
"""
        try:
            response = ollama.chat(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                options={"temperature": 0.0}
            )
            
            raw_response = response["message"]["content"].strip()
            
            # Clean potential markdown
            if raw_response.startswith("```json"):
                raw_response = raw_response.replace("```json", "").replace("```", "").strip()
            elif raw_response.startswith("```"):
                raw_response = raw_response.replace("```", "").strip()

            data = json.loads(raw_response)
            label = data.get("label", "LOW_SIGNAL")
            score = float(data.get("score", 0.0))
            
        except Exception as e:
            print(f"⚠️ Ollama error: {e}. Falling back to regex.")
            return self._fallback_classify(text)

        # ============================================================
        # FIX: If the model says LOW_SIGNAL, force score to 0.0
        # This prevents "Good morning" from triggering reasoning extraction.
        # ============================================================
        if label == "LOW_SIGNAL":
            return self._low_signal()

        # Clamp score just in case
        score = max(0.0, min(1.0, score))

        # Override logic for specific strong patterns
        if re.search(r'\b(because|we decided|we chose|therefore)\b', text, re.I):
            if label != "ARCHITECTURAL_DECISION":
                label = "ARCHITECTURAL_DECISION"
                score = max(score, 0.75)

        # Map to SignalType
        try:
            content_type = SignalType[label]
        except KeyError:
            content_type = SignalType.LOW_SIGNAL

        # Gatekeeping logic
        if score < 0.3:
            return self._low_signal()

        return SignalClassification(
            score=score,
            content_type=content_type,
            needs_entity_extraction=True,
            needs_reasoning_extraction=score >= 0.6
        )

    def _fallback_classify(self, text: str) -> SignalClassification:
        """Robust regex fallback if the model fails."""
        import re
        if re.search(r'\b(decided|chose|because|therefore|over)\b', text, re.I):
            return SignalClassification(score=0.75, content_type=SignalType.ARCHITECTURAL_DECISION,
                                        needs_entity_extraction=True, needs_reasoning_extraction=True)
        if re.search(r'\b(risk|flaky|fail|outage|broken)\b', text, re.I):
            return SignalClassification(score=0.65, content_type=SignalType.RISK_IDENTIFICATION,
                                        needs_entity_extraction=True, needs_reasoning_extraction=True)
        return self._low_signal()

    def _low_signal(self):
        return SignalClassification(score=0.0, content_type=SignalType.LOW_SIGNAL,
                                    needs_entity_extraction=False, needs_reasoning_extraction=False)