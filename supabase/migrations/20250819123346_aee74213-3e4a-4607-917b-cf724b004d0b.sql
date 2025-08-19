-- Deletes any plant that isn't Processor ABC (FKs are ON DELETE CASCADE)
DELETE FROM plants WHERE plant_name <> 'Processor ABC';