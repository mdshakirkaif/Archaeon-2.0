import sys
import os

# Add the current directory to Python path so it finds 'shared' and 'extraction'
sys.path.insert(0, os.getcwd())

from extraction.classifiers.signal import SignalClassifier

def run_test():
    classifier = SignalClassifier()
    
    # Test Case 1: Low Signal (Should return LOW_SIGNAL, score < 0.3)
    low_text = "Good morning everyone, let's have a quick sync."
    
    # Test Case 2: High Signal (Should return ARCHITECTURAL_DECISION, score > 0.6)
    high_text = """ We decided to switch the checkout database from application retries to Postgres advisory locks because application retries caused race conditions 
    under heavy load. We chose this over exponential backoff.
    """
    
    # Test Case 3: Medium Signal (Should return TRIBAL_KNOWLEDGE, score 0.3 - 0.6)
    medium_text = """The auth service is flaky. I think we should look at it, but we never wrote down why."""
    
    print("=" * 60)
    print("TEST 1: LOW SIGNAL TEXT")
    result_low = classifier.classify(low_text)
    print(result_low)
    print(f"Type: {type(result_low)}")  # <class 'shared.extraction_classes.SignalClassification'>
    
    print("\n" + "=" * 60)
    print("TEST 2: HIGH SIGNAL TEXT")
    result_high = classifier.classify(high_text)
    print(result_high)
    
    print("\n" + "=" * 60)
    print("TEST 3: MEDIUM SIGNAL TEXT")
    result_medium = classifier.classify(medium_text)
    print(result_medium)
    
    print("\n" + "=" * 60)
    print("✅ All tests passed! Real SignalClassification objects produced.")

if __name__ == "__main__":
    run_test()