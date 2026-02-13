/**
 * Serial Number CSV Parser Utility
 *
 * Parses CSV files containing serial numbers.
 * Handles various CSV formats and validates data.
 *
 * @see src/components/shared/bulk-import-wizard.tsx (CSV parsing pattern)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ParsedSerialNumberRow {
  serialNumber: string;
  rowNumber: number;
}

// ============================================================================
// PARSER
// ============================================================================

/**
 * Parse CSV file containing serial numbers.
 *
 * Expected format:
 * - Header row with "Serial Number" or "Serial" column
 * - One serial number per row
 * - Empty rows are ignored
 *
 * @param file - CSV file to parse
 * @returns Array of parsed serial numbers with row numbers
 * @throws Error if file cannot be parsed
 */
export async function parseSerialNumberCSV(
  file: File
): Promise<ParsedSerialNumberRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          reject(new Error('File is empty'));
          return;
        }

        const lines = text.split('\n').map((line) => line.trim());
        if (lines.length === 0) {
          reject(new Error('CSV file is empty'));
          return;
        }

        // Find header row
        const headerRow = lines[0];
        const headerColumns = headerRow.split(',').map((col) => col.trim().toLowerCase());
        
        // Find serial number column index
        let serialColumnIndex = headerColumns.findIndex(
          (col) => col === 'serial number' || col === 'serial' || col === 'serialnumber'
        );

        // If no header found, assume first column
        if (serialColumnIndex === -1) {
          serialColumnIndex = 0;
        }

        // Parse data rows
        const results: ParsedSerialNumberRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line || line.trim().length === 0) continue; // Skip empty rows

          const columns = line.split(',').map((col) => col.trim());
          const serialNumber = columns[serialColumnIndex]?.trim();

          if (serialNumber && serialNumber.length > 0) {
            results.push({
              serialNumber,
              rowNumber: i + 1, // 1-indexed, accounting for header
            });
          }
        }

        if (results.length === 0) {
          reject(new Error('No serial numbers found in CSV file'));
          return;
        }

        resolve(results);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to parse CSV file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Validate serial number format (basic validation).
 * Can be overridden with custom validation function.
 *
 * @param serial - Serial number to validate
 * @returns Validation result
 */
export function validateSerialNumberFormat(serial: string): {
  valid: boolean;
  error?: string;
} {
  if (!serial || serial.trim().length === 0) {
    return { valid: false, error: 'Serial number cannot be empty' };
  }

  if (serial.length > 100) {
    return { valid: false, error: 'Serial number too long (max 100 characters)' };
  }

  // Basic format: alphanumeric, dashes, underscores allowed
  if (!/^[A-Za-z0-9\-_]+$/.test(serial)) {
    return {
      valid: false,
      error: 'Serial number contains invalid characters (only letters, numbers, dashes, and underscores allowed)',
    };
  }

  return { valid: true };
}
