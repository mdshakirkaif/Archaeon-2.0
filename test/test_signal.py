import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from extraction.classifiers.signal import SignalClassifier

def test():
    classifier = SignalClassifier()
    
    # Test 1: Low signal
    text1 = "Good morning everyone, let's have a quick sync."
    result1 = classifier.classify(text1)
    print(f"Low: {result1}")
    
    # Test 2: High signal
    text2 = """
    We decided to switch the checkout database from application retries to 
    Postgres advisory locks because application retries caused race conditions 
    under heavy load. We chose this over exponential backoff.
    """
    result2 = classifier.classify(text2)
    print(f"High: {result2}")
    
    # Test 3: Medium signal
    text3 = "Successfully deployed the latest build of the inventory service to staging."
    result3 = classifier.classify(text3)
    print(f"Medium: {result3}")

if __name__ == "__main__":
    test()