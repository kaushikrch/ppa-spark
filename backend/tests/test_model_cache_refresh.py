import pandas as pd

from app.bootstrap import bootstrap_if_needed
from app.models.optimizer import run_optimizer
from app.models.simulator import simulate_price_change
from app.models.elasticities import fit_elasticities
from app.synth_data import gen_weekly_data
from app.utils.io import engine


def test_simulator_optimizer_use_fresh_data():
    """Regenerating data should invalidate cached simulator/optimizer tables."""

    bootstrap_if_needed()

    # Warm caches so the test fails without invalidation logic.
    simulate_price_change({})
    run_optimizer()

    try:
        # Generate a much smaller dataset and retrain elasticities so the new
        # tables clearly differ from the cached versions.
        gen_weekly_data(weeks=3, n_per_brand=1, retailers_per_combo=1)
        fit_elasticities()

        _agg_after, rows_after = simulate_price_change({})
        assert int(rows_after["week"].max()) == 3

        solution_after, _kpis_after = run_optimizer()
        with engine().connect() as con:
            expected_skus = pd.read_sql("select sku_id from guardrails", con)
        assert len(solution_after) == len(expected_skus)
    finally:
        # Restore the default synthetic dataset for the remaining test suite.
        gen_weekly_data()
        fit_elasticities()

