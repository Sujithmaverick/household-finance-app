'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add householdId column to Users (nullable initially)
    await queryInterface.addColumn('Users', 'householdId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Households', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add householdId column to Entries (nullable initially)
    await queryInterface.addColumn('Entries', 'householdId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Households', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Create a default household and backfill existing users + entries
    // NOTE: Adjust gen_random_uuid() depending on your Postgres setup (uuid-ossp / pgcrypto)
    const [result] = await queryInterface.sequelize.query(
      `INSERT INTO "Households" ("id","name","\"createdAt\"","\"updatedAt\")\n        VALUES (gen_random_uuid(), 'Default household', now(), now())\n        RETURNING id;`
    );
    const defaultHouseholdId = result[0].id;

    // Assign existing users to default household
    await queryInterface.sequelize.query(`
      UPDATE "Users"
      SET "householdId" = '${defaultHouseholdId}'
      WHERE "householdId" IS NULL;
    `);

    // Assign entries to the household based on their creator user
    await queryInterface.sequelize.query(`
      UPDATE "Entries" e
      SET "householdId" = u."householdId"
      FROM "Users" u
      WHERE e."userId" = u.id AND e."householdId" IS NULL;
    `);

    // Optionally make householdId non-nullable after backfill
    // await queryInterface.changeColumn('Users', 'householdId', { type: Sequelize.UUID, allowNull: false });
    // await queryInterface.changeColumn('Entries', 'householdId', { type: Sequelize.UUID, allowNull: false });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Entries', 'householdId');
    await queryInterface.removeColumn('Users', 'householdId');
  }
};
