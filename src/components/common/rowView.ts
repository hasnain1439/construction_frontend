import { createContext } from "react";

/**
 * Set by DataTable around a row's actions cell: opens that row's view (its detail page, or the table's
 * read-only details panel). RowActions puts a "View" item first in the menu when it is set.
 */
export const RowViewContext = createContext<(() => void) | null>(null);
