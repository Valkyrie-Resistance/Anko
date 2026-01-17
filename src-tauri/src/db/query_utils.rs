//! SQL query parsing utilities shared across database connectors

/// Extract table name from a simple SELECT query.
///
/// Handles various SQL patterns:
/// - `SELECT ... FROM table_name`
/// - `SELECT ... FROM "table_name"` (quoted identifiers)
/// - `SELECT ... FROM schema.table` (schema-qualified)
/// - `SELECT ... FROM \`table_name\`` (backtick-quoted for MySQL)
///
/// Returns the table name without schema prefix or quotes.
/// Returns None if the query is not a valid SELECT or table name cannot be parsed.
///
/// # Examples
/// ```text
/// extract_table_from_select("SELECT * FROM users") => Some("users")
/// extract_table_from_select("SELECT * FROM `users`") => Some("users")
/// extract_table_from_select("SELECT * FROM public.users") => Some("users")
/// ```
pub fn extract_table_from_select(query: &str) -> Option<String> {
    let upper = query.to_uppercase();
    let from_pos = upper.find(" FROM ")?;
    let after_from = query[from_pos + 6..].trim_start();

    // Find the end of the table name (space, WHERE, ORDER, LIMIT, GROUP, HAVING, JOIN, ;, or end)
    let end_keywords = [
        " WHERE ", " ORDER ", " LIMIT ", " GROUP ", " HAVING ", " JOIN ",
        " LEFT ", " RIGHT ", " INNER ", " OUTER ", ";",
    ];
    let upper_after = after_from.to_uppercase();

    let end_pos = end_keywords
        .iter()
        .filter_map(|kw| upper_after.find(kw))
        .min()
        .unwrap_or(after_from.len());

    let table_part = after_from[..end_pos].trim();

    // Handle schema.table format - extract just the table name
    let table_name = if table_part.contains('.') {
        // schema.table or database.table - get the last part
        table_part.split('.').next_back()?
    } else {
        table_part
    };

    // Remove quotes if present (supports backticks, double quotes, single quotes)
    let cleaned = table_name
        .trim_matches('`')
        .trim_matches('"')
        .trim_matches('\'');

    if cleaned.is_empty() {
        None
    } else {
        Some(cleaned.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_simple_table() {
        assert_eq!(
            extract_table_from_select("SELECT * FROM users"),
            Some("users".to_string())
        );
    }

    #[test]
    fn test_extract_quoted_table() {
        assert_eq!(
            extract_table_from_select("SELECT * FROM `users`"),
            Some("users".to_string())
        );
        assert_eq!(
            extract_table_from_select("SELECT * FROM \"users\""),
            Some("users".to_string())
        );
    }

    #[test]
    fn test_extract_schema_qualified_table() {
        assert_eq!(
            extract_table_from_select("SELECT * FROM public.users"),
            Some("users".to_string())
        );
        assert_eq!(
            extract_table_from_select("SELECT * FROM db.users WHERE id = 1"),
            Some("users".to_string())
        );
    }

    #[test]
    fn test_extract_with_clauses() {
        assert_eq!(
            extract_table_from_select("SELECT id, name FROM users ORDER BY id"),
            Some("users".to_string())
        );
        assert_eq!(
            extract_table_from_select("SELECT * FROM users WHERE active = true LIMIT 10"),
            Some("users".to_string())
        );
    }

    #[test]
    fn test_extract_invalid_queries() {
        assert_eq!(extract_table_from_select("INSERT INTO users"), None);
        assert_eq!(extract_table_from_select("SELECT *"), None);
        assert_eq!(extract_table_from_select("UPDATE users SET name = 'test'"), None);
    }
}
