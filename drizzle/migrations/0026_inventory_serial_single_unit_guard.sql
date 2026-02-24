DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_serial_single_unit'
  ) THEN
    ALTER TABLE "inventory"
      ADD CONSTRAINT "inventory_serial_single_unit"
      CHECK (
        serial_number IS NULL
        OR (
          quantity_on_hand >= 0
          AND quantity_on_hand <= 1
          AND quantity_allocated >= 0
          AND quantity_allocated <= 1
        )
      );
  END IF;
END $$;
