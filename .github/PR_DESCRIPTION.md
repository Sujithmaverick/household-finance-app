PR: feat: add household-shared mode for entries

This branch adds the Household model and migrations to scope entries to a household.
It includes a middleware helper and instructions for the remaining manual merges into existing models and controllers.

How to test locally:
1) Checkout branch
2) Install deps
3) Run migrations: npx sequelize db:migrate
4) Start server and test creating/listing entries as different users assigned to the same household

Notes:
- Migration creates a default household and backfills existing users & entries into it. Adjust if you want per-family households.
- After verifying data integrity you may change householdId columns to NOT NULL in a follow-up migration.
