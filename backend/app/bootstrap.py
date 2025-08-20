from sqlalchemy import inspect
from .utils.io import engine


def bootstrap_if_needed():
    """Ensure synthetic data and model tables exist.

    Generates weekly data and trains elasticities if required.
    Safe to call multiple times.
    """
    insp = inspect(engine())
    if not insp.has_table("price_weekly"):
        from .synth_data import gen_weekly_data
        gen_weekly_data()
        insp = inspect(engine())
    if not (insp.has_table("elasticities") and insp.has_table("attributes_importance")):
        from .models.elasticities import fit_elasticities
        fit_elasticities()

