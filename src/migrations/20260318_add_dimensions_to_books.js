/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("books", "dimensions", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("books", "weight", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("books", "dimensions");
    await queryInterface.removeColumn("books", "weight");
  },
};
