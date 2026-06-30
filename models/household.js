'use strict';
module.exports = (sequelize, DataTypes) => {
  const Household = sequelize.define('Household', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: DataTypes.STRING
  }, {});
  Household.associate = function(models) {
    Household.hasMany(models.User, { foreignKey: 'householdId' });
    Household.hasMany(models.Entry, { foreignKey: 'householdId' });
  };
  return Household;
};
