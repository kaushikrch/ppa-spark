"""Utilities for managing cached model data structures."""
from __future__ import annotations

from contextlib import suppress
from typing import Callable


def _clear_cache(func: Callable[[], object]) -> None:
    """Clear an ``functools.lru_cache`` decorated function if possible."""
    cache_clear = getattr(func, "cache_clear", None)
    if callable(cache_clear):
        cache_clear()  # type: ignore[call-arg]


def invalidate_model_caches() -> None:
    """Reset cached simulator/optimizer tables after data refresh.

    Price simulations and the optimizer both memoize expensive table loads to
    keep interactive requests fast.  Whenever we regenerate synthetic data or
    retrain elasticities those caches must be purged so fresh numbers are
    returned.  Previously the caches stayed warm forever which meant the API
    served stale weeks/SKU counts after data refreshes.  Clearing them ensures
    the simulator and optimizer always operate on the latest tables.
    """

    with suppress(ImportError):
        from . import simulator, optimizer

        for func in (
            simulator._load,
            simulator._price_simulation_frame,
            simulator._delist_frame,
            optimizer._load_tables,
        ):
            _clear_cache(func)

