from .indexer import rag

def search_tables(query: str, top_k: int = 3):
    """Search across all tables for relevant information"""
    return rag.query(query, top_k)

def get_table_context(table_name: str):
    """Get context about a specific table"""
    return rag.query(f"TABLE:{table_name}", 1)