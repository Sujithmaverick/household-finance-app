This branch implements "household-shared" mode for entries.

Files added:
- migrations/20260630-create-households.js
- migrations/20260630-add-household-to-users-and-entries.js
- models/household.js
- middleware/ensureHousehold.js

What you still need to do (manual edits to existing files):

1) models/user.js
- Add the householdId attribute in the model definition, for example:

  householdId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'Households', key: 'id' }
  }

- In the associate function add:

  User.belongsTo(models.Household, { foreignKey: 'householdId' });

2) models/entry.js (or models/transaction.js)
- Add householdId attribute:

  householdId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'Households', key: 'id' }
  }

- In associate add:

  Entry.belongsTo(models.Household, { foreignKey: 'householdId' });
  Entry.belongsTo(models.User, { foreignKey: 'userId' });

3) controllers/entries.js (or your router/controller file that lists/creates entries)
- Update the list (GET) endpoint to return only entries for the current user's household:

  // GET /entries
  const listEntries = async (req, res, next) => {
    try {
      const householdId = req.user && req.user.householdId;
      if (!householdId) return res.status(403).json({ error: 'No household associated with this account.' });

      const entries = await Entry.findAll({
        where: { householdId },
        order: [['createdAt', 'DESC']],
        include: [{ model: User, attributes: ['id','name','email'] }]
      });
      res.json(entries);
    } catch (err) { next(err); }
  };

- Update the create (POST) endpoint to set householdId from req.user.householdId

  const createEntry = async (req, res, next) => {
    try {
      const user = req.user;
      if (!user || !user.id) return res.status(401).json({ error: 'Not authenticated' });
      if (!user.householdId) return res.status(403).json({ error: 'No household associated with this account.' });

      const payload = { userId: user.id, householdId: user.householdId, amount: req.body.amount, category: req.body.category, note: req.body.note };
      const entry = await Entry.create(payload);
      res.status(201).json(entry);
    } catch (err) { next(err); }
  };

- Add authorization checks for update/delete to ensure req.user.householdId === entry.householdId

4) Migrations
- Run migrations: `npx sequelize db:migrate` (or your project's migration command).
- The migration backfills a single "Default household" and assigns existing users and entries to it. If you prefer to create households per-family you should create household records and set users.householdId accordingly before removing nullability.

5) Make householdId NOT NULL (optional)
- After validating data and tests, make householdId non-nullable by editing the migration or adding a follow-up migration that changes the column to allowNull: false.

6) Tests
- Add tests to assert that users in the same household see each other's entries and users in different households do not.

If you'd like, I can now:
- (A) Attempt to open a PR on your repo with these files added and the manual-change instructions (I will try to push the branch and create the PR if you grant me write access), or
- (B) Update the specific model/controller files for you if you tell me their exact paths (for example: models/user.js, models/entry.js, controllers/entries.js). If you confirm the paths I will edit them in this branch.

Next step recommended: confirm the exact file paths for your User/Entry models and the controller that handles entries so I can apply the edit automatically in this branch and open the PR.
