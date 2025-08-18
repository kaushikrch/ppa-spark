import os
import sys

# Ensure the app package is importable
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "app"))

from agents.intents import classify_intent


def test_delisting():
    assert classify_intent("Should we rationalize the tail SKUs?") == "DELISTING"


def test_enlisting():
    assert classify_intent("We plan to launch a new SKU next quarter") == "ENLISTING"


def test_ppa_gaps():
    assert classify_intent("Where are the price pack architecture gaps?") == "PPA_GAPS"


def test_cannibalization():
    assert classify_intent("Is there cannibalization between these products?") == "CANNIBALIZATION"


def test_pricing_optimization():
    assert classify_intent("How can we optimize pricing for better margin?") == "PRICING_OPTIMIZATION"


def test_promo():
    assert classify_intent("What is the promo ROI for this discount?") == "PROMO"


def test_msl():
    assert classify_intent("What is the must stock list for this region?") == "MSL"


def test_simulation():
    assert classify_intent("Can we simulate the impact of a price change?") == "SIMULATION"


def test_summary():
    assert classify_intent("Give me a summary of the portfolio") == "SUMMARY"
