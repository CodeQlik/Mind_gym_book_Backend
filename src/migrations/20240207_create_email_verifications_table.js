module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("email_verifications", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      otp: {
        type: Sequelize.STRING(6),
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Add index for faster lookups
    await queryInterface.addIndex("email_verifications", ["email"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("email_verifications");
  },
};
